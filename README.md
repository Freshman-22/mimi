# Mimi (耳) · Ear Translator

여행자용 실시간 통역 웹앱. 상대방 말을 내 언어로 이어폰에 들려주고(듣기), 내 말을 상대 언어로 화면과 스피커에 보여줍니다(말하기).

**사이트: https://freshman-22.github.io/mimi** (휴대폰 Chrome에서 열면 음성 인식까지 사용 가능, 서버가 없어 기본 번역으로 동작)

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 화면 전체 (음성 인식, 번역, 지구본) |
| `land.js` | 지구본 육지 데이터 (Natural Earth, 퍼블릭 도메인) |
| `server.py` | 화면을 띄우고 Claude 문맥 번역을 제공하는 로컬 서버 |
| `requirements.txt` | 서버에 필요한 파이썬 패키지 |
| `backup.command` | 더블클릭하면 바탕화면에 백업 압축 파일을 만듦 |

## 처음 설치 (새 컴퓨터에서 한 번만)

```bash
cd mimi
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 실행

키 없이 (무료 기본 번역):

```bash
.venv/bin/python server.py
```

Claude 문맥 번역 사용 (Claude Console에서 발급한 API 키):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-... .venv/bin/python server.py
```

그다음 Chrome에서 http://localhost:8765 를 엽니다. 음성 인식은 Chrome에서만 동작합니다.

## 참고

- API 키는 어떤 파일에도 저장되지 않습니다. 실행할 때마다 명령어로 넣습니다.
- 빠르고 저렴한 모델을 쓰려면 앞에 `ET_MODEL=claude-haiku-5-5`를 붙입니다.
- 지구본 그리기(d3)와 번역은 인터넷이 필요합니다.
