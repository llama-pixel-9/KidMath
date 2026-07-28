#!/usr/bin/env bash
# Download the openly licensed curriculum reference library into resources/.
#
# Payload PDFs are gitignored; this script is the reproducible source of truth
# for what the library contains and where it came from. See resources/README.md
# for licenses and usage rules (reference for authoring ORIGINAL items only).
#
# Usage: bash scripts/fetchResources.sh
# Re-runs skip files that already downloaded (size > 100 KB).

set -uo pipefail
cd "$(dirname "$0")/.."
DEST="resources"
mkdir -p "$DEST/progressions" "$DEST/engageny"

fetch() {
  local url="$1" out="$2"
  if [ -f "$out" ] && [ "$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")" -gt 100000 ]; then
    echo "skip   $out"
    return 0
  fi
  echo "fetch  $out"
  if curl -sL --fail --retry 2 --connect-timeout 30 "$url" -o "$out"; then
    if file "$out" | grep -q "PDF document"; then
      echo "ok     $out ($(du -h "$out" | cut -f1))"
    else
      echo "BAD    $out is not a PDF — removing"
      rm -f "$out"
      return 1
    fi
  else
    echo "FAIL   $url"
    rm -f "$out"
    return 1
  fi
}

fails=0

# --- CCSS Progressions (University of Arizona / mathematicalmusings.org) -----
# The academic source behind the Math in Focus / CCSS problem-type taxonomy.
fetch "https://mathematicalmusings.org/wp-content/uploads/2023/02/Progressions.pdf" \
  "$DEST/progressions/ccss-progressions-complete-2023.pdf" || fails=$((fails+1))
fetch "https://mathematicalmusings.org/wp-content/uploads/2011/05/ccss_progression_cc_oa_k5_2011_05_302.pdf" \
  "$DEST/progressions/ccss-progression-cc-oa-k5-draft-2011.pdf" || fails=$((fails+1))

# --- EngageNY / Eureka Math full modules (archive.org, CC BY-NC-SA 4.0) ------
# One complete PDF per module, pulled from inside the archive's zips.
ITEM="https://archive.org/download/engageny-mathematics"
engageny() {
  local zip="$1" g="$2" m="$3"
  local out="$DEST/engageny/math-$g-m$m-full-module.pdf"
  # A few zips name the file Math-GK-M2-Full-Module.pdf instead of lowercase.
  local G=$(echo "$g" | tr '[:lower:]' '[:upper:]')
  fetch "$ITEM/${zip// /%20}.zip/Module%20$m%2Fmath-$g-m$m-full-module.pdf" "$out" ||
    fetch "$ITEM/${zip// /%20}.zip/Module%20$m%2FMath-$G-M$m-Full-Module.pdf" "$out" ||
    fails=$((fails+1))
}

for m in 1 2 3 4 5 6; do engageny "Kindergarten Module $m" gk "$m"; done
for m in 1 2 3 4 5 6; do engageny "Grade 1 Module $m" g1 "$m"; done
for m in 1 2 3 4 5 6 7 8; do engageny "Grade 2 Module $m" g2 "$m"; done
for m in 1 2 3 4 5 6 7; do engageny "Grade 3 Module $m" g3 "$m"; done
for m in 1 2 3 4 5 6 7; do engageny "Grade 4 Module $m" g4 "$m"; done

echo
echo "$(find "$DEST" -name '*.pdf' | wc -l | tr -d ' ') PDFs in $DEST/, $fails failure(s)"
exit $((fails > 0 ? 1 : 0))
