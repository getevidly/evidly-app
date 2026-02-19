#!/bin/bash
# EvidLY JIE — Batch Crawl with Rate Limit Spacing
# Crawls one county at a time with 5-minute delays to stay under 30K tokens/min
#
# Usage: bash batch_crawl.sh
# Set ANTHROPIC_API_KEY before running

set -euo pipefail
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

PYTHON="C:/Users/newpa/AppData/Local/Programs/Python/Python312/python.exe"
SCRIPT_DIR="C:/Users/newpa/Downloads/evidly-demo-final/evidly-app-main/scripts/jie/jurisdictions"
RESULTS_DIR="$SCRIPT_DIR/results/ca"
JURISDICTIONS="$SCRIPT_DIR/jurisdictions/ca_jurisdictions.json"
DELAY_SECONDS=600  # 10 minutes between crawls (rate limit: 30K tokens/min, crawls use ~100-156K)

# All 63 CA jurisdictions in alphabetical order
COUNTIES=(
  "Alameda"
  "Alpine"
  "Amador"
  "Butte"
  "Calaveras"
  "Colusa"
  "Contra Costa"
  "Del Norte"
  "El Dorado"
  "Fresno"
  "Glenn"
  "Humboldt"
  "Imperial"
  "Inyo"
  "Kern"
  "Kings"
  "Lake"
  "Lassen"
  "Los Angeles"
  "Madera"
  "Marin"
  "Mariposa"
  "Mendocino"
  "Merced"
  "Modoc"
  "Mono"
  "Monterey"
  "Napa"
  "Nevada"
  "Orange"
  "Placer"
  "Plumas"
  "Riverside"
  "Sacramento"
  "San Benito"
  "San Bernardino"
  "San Diego"
  "San Francisco"
  "San Joaquin"
  "San Luis Obispo"
  "San Mateo"
  "Santa Barbara"
  "Santa Clara"
  "Santa Cruz"
  "Shasta"
  "Sierra"
  "Siskiyou"
  "Solano"
  "Sonoma"
  "Stanislaus"
  "Sutter"
  "Tehama"
  "Trinity"
  "Tulare"
  "Tuolumne"
  "Ventura"
  "Yolo"
  "Yuba"
  "Berkeley"
  "Long Beach"
  "Pasadena"
  "Vernon"
  "National Park Service"
)

total=${#COUNTIES[@]}
done_count=0
skip_count=0
fail_count=0
start_time=$(date +%s)

echo "========================================"
echo "EvidLY JIE Batch Crawl — $total jurisdictions"
echo "Delay: ${DELAY_SECONDS}s between crawls"
echo "Started: $(date)"
echo "========================================"
echo ""

for i in "${!COUNTIES[@]}"; do
  county="${COUNTIES[$i]}"
  num=$((i + 1))

  # Build expected filename (lowercase, spaces to underscores)
  filename=$(echo "$county" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')

  # Check for county vs city vs federal naming
  if [[ "$county" == "Berkeley" || "$county" == "Long Beach" || "$county" == "Pasadena" || "$county" == "Vernon" ]]; then
    result_file="$RESULTS_DIR/city_of_${filename}.json"
    filter_name="City of $county"
  elif [[ "$county" == "National Park Service" ]]; then
    result_file="$RESULTS_DIR/national_park_service_—_california.json"
    filter_name="National Park Service"
  else
    result_file="$RESULTS_DIR/${filename}_county.json"
    filter_name="$county County"
  fi

  # Skip if already crawled successfully
  if [[ -f "$result_file" ]]; then
    skip_count=$((skip_count + 1))
    echo "[$num/$total] SKIP $filter_name (already exists)"
    continue
  fi

  # Remove any stale ERROR file
  error_file="${result_file%.json}_ERROR.json"
  if [[ -f "$error_file" ]]; then
    rm "$error_file"
  fi

  echo ""
  echo "[$num/$total] CRAWLING: $filter_name"
  echo "  Started: $(date '+%H:%M:%S')"

  # Run crawl for this single county (with 1 batch-level retry on failure)
  crawl_success=false
  for batch_attempt in 1 2; do
    "$PYTHON" "$SCRIPT_DIR/jurisdiction_crawl.py" \
      --jurisdictions "$JURISDICTIONS" \
      --output "$RESULTS_DIR" \
      --max-concurrent 1 \
      --max-retries 0 \
      --filter "$county" 2>&1 || true

    # Check if result file was created (success) or ERROR file
    if [[ -f "$result_file" ]]; then
      done_count=$((done_count + 1))
      crawl_success=true
      echo "  SUCCESS ($done_count done, $skip_count skipped, $fail_count failed)"
      break
    elif [[ -f "$error_file" && $batch_attempt -eq 1 ]]; then
      echo "  FAILED on attempt 1 — waiting 300s for rate limit reset, then retrying..."
      rm -f "$error_file"
      sleep 300
    elif [[ -f "$error_file" ]]; then
      fail_count=$((fail_count + 1))
      echo "  FAILED after 2 batch attempts ($done_count done, $skip_count skipped, $fail_count failed)"
      break
    else
      fail_count=$((fail_count + 1))
      echo "  UNKNOWN — no output file ($done_count done, $skip_count skipped, $fail_count failed)"
      break
    fi
  done

  # Wait before next crawl (always delay after a crawl attempt to respect rate limits)
  remaining=$((total - num))
  if [[ $remaining -gt 0 && "$crawl_success" == "true" ]]; then
    elapsed=$(($(date +%s) - start_time))
    processed=$((done_count + skip_count + fail_count))
    if [[ $processed -gt 0 ]]; then
      eta_per=$(( elapsed / processed ))
      eta_remaining=$(( eta_per * remaining ))
      echo "  Waiting ${DELAY_SECONDS}s before next crawl... (est. ~$((eta_remaining / 60))m remaining)"
    fi
    sleep $DELAY_SECONDS
  elif [[ $remaining -gt 0 && "$crawl_success" == "false" ]]; then
    # Shorter delay after failure (already waited 120s in retry)
    echo "  Waiting 180s after failure..."
    sleep 180
  fi
done

end_time=$(date +%s)
total_elapsed=$(( end_time - start_time ))

echo ""
echo "========================================"
echo "BATCH COMPLETE"
echo "  Total: $total"
echo "  New crawls: $done_count"
echo "  Skipped (existing): $skip_count"
echo "  Failed: $fail_count"
echo "  Duration: ${total_elapsed}s ($(( total_elapsed / 60 ))m)"
echo "  Finished: $(date)"
echo "========================================"
echo ""
echo "Next steps:"
echo "  python3 validate_jurisdictions.py --input results/ca/ --verbose"
echo "  python3 load_jurisdictions.py --input results/ca/ --output results/ca/_update_jurisdictions.sql"
