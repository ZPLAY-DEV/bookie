#!/usr/bin/env bash
# 로컬 R2(bktk 버킷) 시드 — 수업 자료를 lessons/w{주차}d{일차}/ 구조로 넣는다.
# 데이터는 apps/api/.wrangler/state/ 에 저장되어 wrangler dev가 그대로 읽는다.
# 실행: pnpm r2:seed
set -euo pipefail
cd "$(dirname "$0")/.."

put() {
  npx wrangler r2 object put "bktk/$1" --file "$2" --content-type "$3" --local >/dev/null
  echo "put bktk/$1"
}

# 더미 PDF 생성 (수업자료·지도안 다운로드용)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/dummy.pdf" <<'PDF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Size 4/Root 1 0 R>>
%%EOF
PDF

# 일차별 폴더: 썸네일 + 수업자료 PDF + 지도안 PDF
for d in 1 2 3 4 5; do
  dir="lessons/w1d${d}"
  put "$dir/w1d${d}.png" "scripts/assets/lessons/w1d${d}.png" image/png
  put "$dir/w1d${d}_lesson.pdf" "$tmp/dummy.pdf" application/pdf
  put "$dir/w1d${d}_guide.pdf" "$tmp/dummy.pdf" application/pdf
done

echo "done"
