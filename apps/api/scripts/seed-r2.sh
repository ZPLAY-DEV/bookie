#!/usr/bin/env bash
# 로컬 R2(media 버킷) 시드 — 수업 이미지와 더미 수업 자료를 Miniflare 로컬 스토리지에 넣는다.
# 데이터는 apps/api/.wrangler/state/ 에 저장되어 wrangler dev가 그대로 읽는다.
# 실행: pnpm r2:seed
set -euo pipefail
cd "$(dirname "$0")/.."

put() {
  npx wrangler r2 object put "media/$1" --file "$2" --content-type "$3" --local >/dev/null
  echo "put media/$1"
}

# 수업 이미지
for f in scripts/assets/lessons/*.png; do
  put "images/lessons/$(basename "$f")" "$f" image/png
done

# 더미 수업 자료 (지도안 PDF / 수업자료 ZIP)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/guide.pdf" <<'PDF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Size 4/Root 1 0 R>>
%%EOF
PDF
printf 'PK\x05\x06' > "$tmp/resource.zip"
head -c 18 /dev/zero >> "$tmp/resource.zip"

for day in mon tue wed thu fri; do
  put "materials/w1/$day/guide.pdf" "$tmp/guide.pdf" application/pdf
  put "materials/w1/$day/resource.zip" "$tmp/resource.zip" application/zip
done

echo "done"
