#!/bin/bash
# Mimi 휴대폰 접속: 더블클릭하면 서버와 임시 https 주소(Cloudflare 터널)를 켜고 QR 코드를 보여준다.
# 이 창을 닫으면 휴대폰 접속이 끊긴다. 켜져 있는 동안은 Mac이 잠들지 않는다.
cd "$(dirname "$0")"

# 서버가 꺼져 있으면 켠다 (API 키를 쓰려면 ANTHROPIC_API_KEY=... 를 넣고 server.py 를 직접 실행)
if ! lsof -nP -iTCP:8765 -sTCP:LISTEN >/dev/null 2>&1; then
  .venv/bin/python -u server.py > /tmp/mimi-server.log 2>&1 &
  SERVER_PID=$!
  sleep 1
fi

LOG=$(mktemp -t mimi-tunnel)
caffeinate -i cloudflared tunnel --no-autoupdate --url http://localhost:8765 > "$LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill $TUNNEL_PID $SERVER_PID 2>/dev/null' EXIT

echo "임시 주소를 만드는 중..."
for i in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1)
  [ -n "$URL" ] && break
  sleep 1
done
if [ -z "$URL" ]; then echo "주소를 만들지 못했습니다. 인터넷 연결을 확인하세요."; exit 1; fi

echo
echo "휴대폰 접속 주소: $URL"
echo "아래 QR 코드를 휴대폰 카메라로 찍으세요."
echo
qrencode -t ANSIUTF8 -m 2 "$URL"
echo
echo "이 창을 닫으면 접속이 끊깁니다. (주소는 켤 때마다 바뀝니다)"
wait $TUNNEL_PID
