"""Main scraper. Run via: python -m scraper.run

Flow:
1. Load active studios from Supabase.
2. For each, fetch postings via the appropriate ATS adapter.
3. Cheap filter (title, location, exclusions). Drops most.
4. Dedupe against existing jobs in Supabase.
5. Score remaining with Haiku. Hard cap at MAX_SCORING_CALLS.
6. Insert all scored jobs (status='new') into Supabase.
7. Log run summary.
"""
import os
import sys
import time
import traceback
from pathlib import Path
from supabase import create_client

# Allow running as a script from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.adapters import ADAPTERS  # noqa: E402
from scraper import filters, scoring  # noqa: E402

CV_PATH = Path(__file__).parent / "cv.md"
SCORE_FLOOR_FOR_INSERT = 1  # insert everything we scored; UI sorts by score
MAX_SCORING_CALLS = scoring.MAX_SCORING_CALLS


def get_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SECRET_KEY"]
    return create_client(url, key)


def fetch_studio(adapter_name: str, handle: str) -> tuple[list[dict], str | None]:
    """Returns (jobs, error_message). error_message is None on success."""
    adapter = ADAPTERS.get(adapter_name)
    if not adapter:
        return [], f"unknown adapter: {adapter_name}"
    try:
        return adapter.fetch(handle), None
    except Exception as e:
        return [], f"{type(e).__name__}: {e}"


def existing_source_ids(sb, source: str, ids: list[str]) -> set[str]:
    """Return the subset of ids already in the jobs table."""
    if not ids:
        return set()
    out = set()
    # Supabase has a query length limit; chunk in 100s.
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        resp = sb.table("jobs").select("source_id").eq("source", source).in_("source_id", chunk).execute()
        for row in (resp.data or []):
            out.add(row["source_id"])
    return out


def main():
    print("=" * 60)
    print("job-seeker scraper")
    print("=" * 60)

    sb = get_supabase()
    cv_text = CV_PATH.read_text()

    # Open a run log row.
    run = sb.table("runs").insert({}).execute()
    run_id = run.data[0]["id"]
    errors = []

    studios_resp = sb.table("studios").select("*").eq("active", True).neq("ats", "manual").execute()
    studios = studios_resp.data or []
    print(f"\n{len(studios)} active studios on automated ATS")

    # 1. Fetch all
    all_jobs = []
    studio_results: dict[str, dict] = {}  # slug -> dict for batch insert at end
    for s in studios:
        slug = s["slug"]
        print(f"\n[{s['ats']}] {s['name']} ({s['ats_handle']})")
        t0 = time.time()
        jobs, err = fetch_studio(s["ats"], s["ats_handle"])
        duration_ms = int((time.time() - t0) * 1000)
        if err:
            print(f"  failed: {err}")
        print(f"  fetched {len(jobs)}")
        for j in jobs:
            j["company"] = s["name"]
            j["_studio_slug"] = slug  # tag for inserted_count tracking
            all_jobs.append(j)
        studio_results[slug] = {
            "studio_slug": slug,
            "ats": s["ats"],
            "fetched_count": len(jobs),
            "inserted_count": 0,  # filled in after insert step
            "error": err,
            "duration_ms": duration_ms,
        }
        time.sleep(0.5)

    print(f"\n{len(all_jobs)} jobs total before filtering")

    # 2. Cheap filter
    survivors = []
    for j in all_jobs:
        ok, reason = filters.passes_cheap_filters(j)
        if ok:
            survivors.append(j)
    print(f"{len(survivors)} jobs passed title/location/exclusion filters")

    # 3. Dedupe per source
    new_jobs = []
    by_source: dict[str, list[dict]] = {}
    for j in survivors:
        by_source.setdefault(j["source"], []).append(j)
    for source, items in by_source.items():
        ids = [i["source_id"] for i in items]
        existing = existing_source_ids(sb, source, ids)
        for i in items:
            if i["source_id"] not in existing:
                new_jobs.append(i)
    print(f"{len(new_jobs)} are new (not in DB yet)")

    # 4. Score (hard cap)
    if len(new_jobs) > MAX_SCORING_CALLS:
        print(f"  capping scoring at {MAX_SCORING_CALLS} (had {len(new_jobs)})")
        errors.append({"type": "score_cap_hit", "count": len(new_jobs)})
        new_jobs = new_jobs[:MAX_SCORING_CALLS]

    scored_count = 0
    for j in new_jobs:
        result = scoring.score_job(cv_text, j)
        if result:
            j["fit_score"] = result["score"]
            j["fit_rationale"] = result["rationale"]
            scored_count += 1
        else:
            j["fit_score"] = None
            j["fit_rationale"] = None
    print(f"scored {scored_count}/{len(new_jobs)} jobs")

    # 5. Insert
    inserted = 0
    for j in new_jobs:
        slug = j.get("_studio_slug")
        row = {
            "source": j["source"],
            "source_id": j["source_id"],
            "company": j["company"],
            "title": j["title"],
            "url": j["url"],
            "location": j.get("location", ""),
            "remote_type": j.get("remote_type", ""),
            "salary_text": j.get("salary_text", ""),
            "jd_text": j.get("jd_text", ""),
            "fit_score": j.get("fit_score"),
            "fit_rationale": j.get("fit_rationale"),
            "status": "new",
        }
        try:
            sb.table("jobs").insert(row).execute()
            inserted += 1
            if slug and slug in studio_results:
                studio_results[slug]["inserted_count"] += 1
        except Exception as e:
            errors.append({"type": "insert_error", "company": j["company"], "title": j["title"], "error": str(e)})

    # 5b. Write per-studio results for the dashboard later.
    for slug, result in studio_results.items():
        try:
            sb.table("run_studio_results").insert({**result, "run_id": run_id}).execute()
        except Exception as e:
            errors.append({"type": "studio_result_error", "studio": slug, "error": str(e)})

    # 6. Close run log
    sb.table("runs").update({
        "finished_at": "now()",
        "jobs_seen": len(all_jobs),
        "jobs_inserted": inserted,
        "errors": errors,
    }).eq("id", run_id).execute()

    print(f"\ninserted {inserted} new jobs")
    print("done")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
