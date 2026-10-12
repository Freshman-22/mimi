#!/bin/bash
# Mimi 백업: 이 파일을 더블클릭하면 바탕화면에 mimi-날짜-시간.zip 을 만든다.
# .venv(이 컴퓨터 전용 설치 폴더)는 빼고 묶는다. 새 컴퓨터에서는 README.md 대로 다시 설치하면 된다.
set -e
cd "$(dirname "$0")/.."
OUT="$HOME/Desktop/mimi-$(date +%Y%m%d-%H%M).zip"
zip -r -q "$OUT" mimi -x "mimi/.venv/*" "mimi/__pycache__/*" "*.DS_Store"
echo "백업 완료: $OUT"
