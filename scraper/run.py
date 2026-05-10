"""Main scraper. Run via: python -m scraper.run

Flow:
1. Load active studios from Supabase.
2. For each, fetch postings via the appropriate ATS adapter.
   - Generic studios run in parallel (different domains, safe to concurrentise).
   - Standard ATS studios run sequentially with a small delay.
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
from concurrent.futures import ThreadPoolExecutor, as_completed
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

    # 1. Fetch all — generic studios in parallel, ATS studios sequentially.
    all_jobs = []
    studio_results: dict[str, dict] = {}

    generic_studios = [s for s in studios if s["ats"] == "generic"]
    ats_studios = [s for s in studios if s["ats"] != "generic"]

    def fetch_one(s: dict) -> tuple[str, list[dict], str | None, int]:
        t0 = time.time()
        jobs, err = fetch_studio(s["ats"], s["ats_handle"])
        duration_ms = int((time.time() - t0) * 1000)
        for j in jobs:
            j["company"] = s["name"]
            j["_studio_slug"] = s["slug"]
        return s["slug"], jobs, err, duration_ms

    # Generic: parallel across different domains, capped at 12 concurrent workers.
    print(f"\nFetching {len(generic_studios)} generic studios in parallel...")
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(fetch_one, s): s for s in generic_studios}
        for future in as_completed(futures):
            s = futures[future]
            slug, jobs, err, duration_ms = future.result()
            if err:
                print(f"  [{s['ats']}] {s['name']}: failed")
            else:
                print(f"  [{s['ats']}] {s['name']}: fetched {len(jobs)}")
            all_jobs.extend(jobs)
            studio_results[slug] = {
                "studio_slug": slug, "ats": s["ats"],
                "fetched_count": len(jobs), "inserted_count": 0,
                "error": err, "duration_ms": duration_ms,
            }

    # ATS studios: sequential with a small delay to be polite.
    print(f"\nFetching {len(ats_studios)} ATS studios sequentially...")
    for s in ats_studios:
        slug = s["slug"]
        print(f"\n[{s['ats']}] {s['name']} ({s['ats_handle']})")
        slug, jobs, err, duration_ms = fetch_one(s)
        if err:
            print(f"  failed: {err}")
        print(f"  fetched {len(jobs)}")
        all_jobs.extend(jobs)
        studio_results[slug] = {
            "studio_slug": slug, "ats": s["ats"],
            "fetched_count": len(jobs), "inserted_count": 0,
            "error": err, "duration_ms": duration_ms,
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
            err_msg = str(e)
            # Dedupe collisions are expected (same job from two studios sharing a tenant)
            # and not errors we care about.
            if "duplicate key" in err_msg or "23505" in err_msg:
                continue
            errors.append({"type": "insert_error", "company": j["company"], "title": j["title"], "error": err_msg})

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
