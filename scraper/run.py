"""Multi-profile scraper. Run via: python -m scraper.run

Flow:
1. Load active profiles from Supabase.
2. For each profile:
   a. Load active studios where vertical matches the profile's slug, plus vertical='multiple'.
   b. Fetch postings from all those studios (generic in parallel, ATS sequential).
   c. Apply the profile's cheap filters (title, location, seniority, exclusions).
   d. Dedupe against existing jobs.
   e. Score survivors against the profile's CV with Haiku.
   f. Detect job language for each scored job.
   g. Insert into Supabase tagged with profile_slug and lang.
3. Log run summary.
"""
import os
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from supabase import create_client

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.adapters import ADAPTERS  # noqa: E402
from scraper import filters, lang, scoring  # noqa: E402

MAX_SCORING_CALLS_PER_PROFILE = scoring.MAX_SCORING_CALLS


def get_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SECRET_KEY"]
    return create_client(url, key)


def fetch_studio(adapter_name: str, handle: str) -> tuple[list[dict], str | None]:
    adapter = ADAPTERS.get(adapter_name)
    if not adapter:
        return [], f"unknown adapter: {adapter_name}"
    try:
        return adapter.fetch(handle), None
    except Exception as e:
        return [], f"{type(e).__name__}: {e}"


def existing_source_ids(sb, source: str, ids: list[str]) -> set[str]:
    if not ids:
        return set()
    out = set()
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        resp = sb.table("jobs").select("source_id").eq("source", source).in_("source_id", chunk).execute()
        for row in (resp.data or []):
            out.add(row["source_id"])
    return out


def run_profile(sb, profile: dict, run_id: str) -> tuple[int, int, list[dict]]:
    """Run scraping for one profile. Returns (jobs_seen, jobs_inserted, errors)."""
    print(f"\n{'=' * 60}")
    print(f"PROFILE: {profile['name']} ({profile['slug']})")
    print(f"{'=' * 60}")

    errors: list[dict] = []
    cv_text = profile.get("cv_en") or profile.get("cv_no") or ""
    if not cv_text:
        print(f"  no CV configured for {profile['slug']}, skipping")
        return 0, 0, [{"type": "no_cv", "profile": profile["slug"]}]

    # Load studios for this profile. Match vertical exactly or 'multiple'.
    studios_resp = sb.table("studios").select("*").eq("active", True) \
        .neq("ats", "manual") \
        .in_("vertical", [profile["slug"], "multiple"]).execute()
    studios = studios_resp.data or []
    print(f"\n{len(studios)} active studios on automated ATS for this profile")

    if not studios:
        return 0, 0, errors

    # Fetch
    all_jobs: list[dict] = []
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

    if generic_studios:
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

    if ats_studios:
        print(f"\nFetching {len(ats_studios)} ATS studios sequentially...")
        for s in ats_studios:
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

    print(f"\n{len(all_jobs)} jobs fetched before filtering")

    # Cheap filter
    survivors = []
    for j in all_jobs:
        ok, reason = filters.passes_cheap_filters(j, profile)
        if ok:
            survivors.append(j)
    print(f"{len(survivors)} passed cheap filters")

    # Dedupe per source
    new_jobs: list[dict] = []
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

    # Cap
    if len(new_jobs) > MAX_SCORING_CALLS_PER_PROFILE:
        print(f"  capping scoring at {MAX_SCORING_CALLS_PER_PROFILE} (had {len(new_jobs)})")
        errors.append({"type": "score_cap_hit", "profile": profile["slug"], "count": len(new_jobs)})
        new_jobs = new_jobs[:MAX_SCORING_CALLS_PER_PROFILE]

    # Score with this profile's CV
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

    # Insert
    inserted = 0
    for j in new_jobs:
        slug = j.get("_studio_slug")
        detected_lang = lang.detect(j.get("jd_text"))
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
            "profile_slug": profile["slug"],
            "lang": detected_lang,
        }
        try:
            sb.table("jobs").insert(row).execute()
            inserted += 1
            if slug and slug in studio_results:
                studio_results[slug]["inserted_count"] += 1
        except Exception as e:
            err_msg = str(e)
            if "duplicate key" in err_msg or "23505" in err_msg:
                continue
            errors.append({"type": "insert_error", "company": j["company"], "title": j["title"], "error": err_msg})

    # Per-studio results
    for slug, result in studio_results.items():
        try:
            sb.table("run_studio_results").insert({**result, "run_id": run_id}).execute()
        except Exception as e:
            errors.append({"type": "studio_result_error", "studio": slug, "error": str(e)})

    print(f"inserted {inserted} new jobs for {profile['slug']}")
    return len(all_jobs), inserted, errors


def main():
    print("=" * 60)
    print("job-seeker scraper")
    print("=" * 60)

    sb = get_supabase()

    profiles_resp = sb.table("profiles").select("*").eq("active", True).order("sort_order").execute()
    profiles = profiles_resp.data or []
    print(f"\n{len(profiles)} active profiles")
    if not profiles:
        print("nothing to do")
        return

    run = sb.table("runs").insert({}).execute()
    run_id = run.data[0]["id"]
    all_errors: list[dict] = []
    total_seen, total_inserted = 0, 0

    for profile in profiles:
        try:
            seen, inserted, errs = run_profile(sb, profile, run_id)
            total_seen += seen
            total_inserted += inserted
            all_errors.extend(errs)
        except Exception as e:
            traceback.print_exc()
            all_errors.append({"type": "profile_error", "profile": profile.get("slug"), "error": str(e)})

    sb.table("runs").update({
        "finished_at": "now()",
        "jobs_seen": total_seen,
        "jobs_inserted": total_inserted,
        "errors": all_errors,
    }).eq("id", run_id).execute()

    print(f"\n{'=' * 60}")
    print(f"DONE. {total_inserted} new jobs across {len(profiles)} profiles.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
