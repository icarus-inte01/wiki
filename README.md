# 개인 위키

개인 지식 저장소. MkDocs + Material for MkDocs로 구축되었습니다.

## 로컬에서 보기

```bash
# 가상환경 생성 및 의존성 설치
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 로컬 서버 실행 (http://127.0.0.1:8000)
mkdocs serve
```

## 배포

`main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다.
