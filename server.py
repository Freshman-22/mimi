"""Mimi 로컬 서버: index.html을 서비스하고, /api/translate 로 Claude 문맥 번역을 제공한다.

실행:  ANTHROPIC_API_KEY=... .venv/bin/python server.py
키가 없으면 /api/translate 는 503을 돌려주고, 페이지는 기본 번역 엔진으로 자동 전환된다.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import anthropic

PORT = int(os.environ.get("PORT", "8765"))
MODEL = os.environ.get("ET_MODEL", "claude-opus-5-5")
ROOT = os.path.dirname(os.path.abspath(__file__))

LANG_NAMES = {
    "ko": "Korean", "ja": "Japanese", "en": "English", "zh-CN": "Simplified Chinese",
    "vi": "Vietnamese", "th": "Thai", "es": "Spanish", "fr": "French", "de": "German",
}

SYSTEM = """You are the interpreter inside Mimi, an earphone translator for travelers. Your output is read aloud into an earphone or shown on a phone screen, so it must sound like real speech.

Before translating, think about the situation from the conversation so far: where the speakers probably are (restaurant, taxi, shop, hotel, hospital, with friends...), who is talking to whom, and what each line refers to. Use that to:
- resolve ambiguous words and omitted subjects or objects (for example 「お会計お願いします」 at a restaurant means asking for the bill, not "accounting");
- choose the register a local would actually use in that situation: casual and colloquial between friends or peers (Korean "오랜만이야!" to English is "Long time no see, man!", not "It has been a long time"), natural but polite with staff, strangers or older people;
- keep the meaning, intent and emotion, and keep it about as short as the original.

The translation contains only what the speaker said: no explanations, quotes, romanization or alternatives.
The note is one short phrase in {note_lang} for the traveler, naming the situation you inferred and the tone you chose, like "식당 · 계산 요청 → 직원에게 공손하게". If there is no clue yet, say so briefly."""

SCHEMA = {
    "type": "object",
    "properties": {
        "translation": {"type": "string"},
        "note": {"type": "string"},
    },
    "required": ["translation", "note"],
    "additionalProperties": False,
}

_client = None


def client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def translate(text, src, dst, me, history):
    """history: [{"who": "me"|"partner", "text": 원문, "translation": 번역}] 오래된 것부터."""
    lines = []
    for h in history[-8:]:
        speaker = "Traveler" if h.get("who") == "me" else "Local"
        lines.append(f"{speaker}: {h.get('text', '')}  (translated: {h.get('translation', '')})")
    context = "\n".join(lines) if lines else "(no earlier lines)"
    speaker = "Local" if dst == me else "Traveler"
    response = client().beta.messages.create(
        model=MODEL,
        max_tokens=4000,
        output_config={
            "effort": "low",  # 실시간 대화라 응답 속도 우선
            "format": {"type": "json_schema", "schema": SCHEMA},
        },
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM.replace("{note_lang}", LANG_NAMES[me]),
        messages=[{
            "role": "user",
            "content": (
                f"Conversation so far:\n{context}\n\n"
                f"New line from the {speaker}, translate from {LANG_NAMES[src]} to {LANG_NAMES[dst]}:\n{text}"
            ),
        }],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("refused")
    data = json.loads(next(b.text for b in response.content if b.type == "text"))
    return data["translation"].strip(), data["note"].strip()


# 외부(휴대폰, 터널)에서 접속해도 화면에 필요한 파일만 보여준다. server.py, 백업 파일 등은 숨김
PUBLIC_FILES = {"/": "/index.html", "/index.html": "/index.html", "/land.js": "/land.js"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def public_path(self):
        path = self.path.split("?", 1)[0]
        if path not in PUBLIC_FILES:
            self.send_error(404)
            return False
        self.path = PUBLIC_FILES[path]
        return True

    def do_GET(self):
        # 실시간 미리보기: 화면 파일이 마지막으로 바뀐 시각. 페이지가 이 값이 바뀌면 스스로 새로고침한다
        if self.path.split("?", 1)[0] == "/__version":
            version = max(os.path.getmtime(os.path.join(ROOT, f.lstrip("/"))) for f in set(PUBLIC_FILES.values()))
            return self.send_json(200, {"version": version})
        if self.public_path():
            super().do_GET()

    def log_message(self, fmt, *args):
        if "/__version" not in self.path:   # 1초마다 오는 확인 요청은 로그에 남기지 않는다
            super().log_message(fmt, *args)

    def do_HEAD(self):
        if self.public_path():
            super().do_HEAD()

    def send_json(self, status, body):
        if status >= 500:
            print(f"[번역 오류 {status}] {body.get('error')} → 페이지는 기본 번역으로 전환", flush=True)
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/api/translate":
            return self.send_json(404, {"error": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            text, src, dst = body["text"].strip(), body["from"], body["to"]
            me = body.get("me", dst)
            history = body.get("history") or []
            if not text or src not in LANG_NAMES or dst not in LANG_NAMES or me not in LANG_NAMES:
                return self.send_json(400, {"error": "bad request"})
        except (ValueError, KeyError, AttributeError):
            return self.send_json(400, {"error": "bad request"})
        try:
            out, note = translate(text, src, dst, me, history if isinstance(history, list) else [])
            return self.send_json(200, {"text": out, "note": note, "engine": "claude"})
        except anthropic.AuthenticationError:
            return self.send_json(503, {"error": "API 키가 올바르지 않습니다"})
        except anthropic.APIStatusError as e:
            return self.send_json(502, {"error": f"Claude API 오류 {e.status_code}: {e.message}"})
        except anthropic.APIConnectionError:
            return self.send_json(502, {"error": "Claude API에 연결할 수 없습니다"})
        except Exception as e:  # 키 미설정 등
            return self.send_json(503, {"error": str(e)})


if __name__ == "__main__":
    print(f"Mimi 서버: http://localhost:{PORT}  (모델 {MODEL}, API 키 {'있음' if os.environ.get('ANTHROPIC_API_KEY') else '없음 → 기본 번역 사용'})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
