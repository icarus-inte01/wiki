# Wiki MCP Server — Design Document

## 개요

Wiki MCP는 개인 위키(`~/doc/wiki/docs`)를 AI가 직접 검색/조회/편집할 수 있게 해주는 MCP 서버입니다. OpenCode의 MCP 클라이언트를 통해 9개의 도구를 제공합니다.

---

## Architecture

```mermaid
flowchart TB
    subgraph OP["OpenCode (MCP Client)"]
        AI["AI Model + Agent"]
    end

    subgraph WIKI["Wiki MCP Server"]
        direction TB
        MAIN["__main__.py<br/>CLI 진입점"]
        SERVER["server.py<br/>도구 구현"]
        SERVER --> SEARCH["wiki_search"]
        SERVER --> LIST["wiki_list"]
        SERVER --> READ["wiki_read"]
        SERVER --> TREE["wiki_tree"]
        SERVER --> WRITE["wiki_write"]
        SERVER --> UPDATE["wiki_update"]
        SERVER --> DELETE["wiki_delete"]
        SERVER --> MOVE["wiki_move"]
        SERVER --> MKDIR["wiki_create_dir"]
    end

    subgraph FS["파일 시스템"]
        DOCS["~/doc/wiki/docs/"]
        DEV["dev/"]
        LIFE["life/"]
        PROJ["projects/"]
    end

    OP -->|"stdio<br/>JSON-RPC"| MAIN
    SERVER -->|"파일 읽기/쓰기/검색"| FS
```

### 프로젝트 구조

```
~/work/wiki_mcp/
├── .venv/                    # Python 가상 환경 (mcp SDK)
├── .gitignore
├── pyproject.toml            # pip 패키지 설정
├── README.md                 # 한글 README (기본)
├── README.en.md              # 영문 README
├── wiki_mcp/                 # Python 패키지
│   ├── __init__.py           # 패키지 초기화
│   ├── __main__.py           # CLI 진입점 (python -m wiki_mcp)
│   └── server.py             # MCP 서버 구현체
```

### 실행 방식

```bash
# OpenCode가 내부적으로 실행
/home/icarus/work/wiki_mcp/.venv/bin/python -m wiki_mcp /home/icarus/doc/wiki/docs
```

- **Transport**: stdio (표준입출력 파이프)
- **Protocol**: JSON-RPC 2.0
- **등록**: `opencode.jsonc` → `mcp.wiki` 섹션

---

## 제공 도구

### 1. wiki_search

위키 문서를 키워드로 검색합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 문서를 찾을 때 "그거 어디 있었지?" 순간에 사용 |
| **검색 범위** | 파일명, 헤딩(`#`), 본문 내용 |
| **입력** | `query` (필수), `scope` (선택: all/filename/heading/content), `max_results` (선택, 기본 10) |
| **출력** | 매칭된 문서 목록 (제목, 경로, 매칭 개수) |

**동작 방식:**

```mermaid
flowchart LR
    A["입력: query='MCP'"] --> B["collect_md_files()<br/>모든 .md 수집"]
    B --> C{"scope?"}
    C -->|filename| D["파일명/제목 매칭"]
    C -->|heading| E["헤딩 라인 매칭"]
    C -->|content| F["본문 전체 매칭"]
    C -->|all| G["파일명 + 본문 매칭"]
    D --> H["결과 반환"]
    E --> H
    F --> H
    G --> H
```

### 2. wiki_list

특정 디렉터리의 문서 목록을 보여줍니다.

| 항목 | 설명 |
|------|------|
| **목적** | 디렉터리 구조 탐색 |
| **입력** | `path` (선택, 기본: 루트) |
| **출력** | `.md` 파일과 하위 디렉터리 목록 |
| **보안** | Path traversal 방어 (wiki_root 내부로 제한) |

### 3. wiki_read

위키 문서의 전체 내용을 읽습니다.

| 항목 | 설명 |
|------|------|
| **목적** | 문서 내용 조회 |
| **입력** | `path` (필수, e.g. `dev/mcp.md`) |
| **출력** | 전체 마크다운 내용 |
| **편의** | `.md` 확장자 생략 가능 |

### 4. wiki_tree

전체 위키 문서 트리를 계층 구조로 보여줍니다.

| 항목 | 설명 |
|------|------|
| **목적** | 위키 전체 구조 파악 |
| **입력** | 없음 |
| **출력** | 디렉터리별 문서 트리 |

### 5. wiki_write

새 마크다운 문서를 생성하고, 같은 디렉터리의 `index.md`에 자동 등록합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 새 문서 생성 |
| **입력** | `path` (필수), `content` (필수), `section` (선택, index.md 섹션명) |
| **출력** | 생성 확인 메시지 + index.md 등록 결과 |
| **특징** | 첫 번째 `# ` 헤딩을 문서 제목으로 자동 추출 |

**동작 방식:**

```mermaid
flowchart LR
    A["입력: path, content"] --> B["경로 검증<br/>_resolve_wiki_path()"]
    B --> C{"파일 존재?"}
    C -->|예| D["오류: 이미 존재"]
    C -->|아니오| E["부모 디렉터리 생성<br/>mkdir(parents=True)"]
    E --> F["파일 쓰기"]
    F --> G{"index.md 존재?"}
    G -->|예| H["_add_to_index()<br/>항목 추가"]
    G -->|아니오| I["index.md 없음 (skip)"]
    H --> J["완료 메시지 반환"]
    I --> J
```

### 6. wiki_update

기존 문서의 내용을 업데이트합니다. 제목(`# ` 헤딩)이 변경되면 `index.md`의 항목도 갱신합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 문서 내용 편집 |
| **입력** | `path` (필수), `content` (필수) |
| **출력** | 업데이트 확인 메시지 + index.md 변경 사항 |

### 7. wiki_delete

문서를 삭제하고 `index.md`에서 해당 항목을 제거합니다. 항목 제거 후 섹션이 비어 있으면 섹션도 함께 제거합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 문서 삭제 |
| **입력** | `path` (필수) |
| **출력** | 삭제 확인 메시지 + index.md 정리 결과 |

**index.md 정리 흐름:**

```mermaid
flowchart LR
    A["파일 삭제"] --> B["index.md에서<br/>항목 제거"]
    B --> C{"섹션이<br/>비었는가?"}
    C -->|예| D["섹션 헤더 제거"]
    C -->|아니오| E["유지"]
    D --> F["완료"]
    E --> F
```

### 8. wiki_move

문서를 이동하거나 이름을 변경합니다. 원본 디렉터리의 `index.md`에서 항목을 제거하고, 대상 디렉터리의 `index.md`에 항목을 추가합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 문서 이동/이름 변경 |
| **입력** | `source` (필수), `dest` (필수), `section` (선택, 대상 index.md 섹션명) |
| **출력** | 이동 확인 + 원본/대상 index.md 갱신 결과 |

### 9. wiki_create_dir

새 디렉터리와 기본 `index.md`를 생성합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 새 카테고리 디렉터리 생성 |
| **입력** | `path` (필수), `title` (필수, index.md의 `# ` 제목) |
| **출력** | 디렉터리 + index.md 생성 확인 |

---

## 핵심 함수 (server.py)

```mermaid
flowchart LR
    subgraph CORE["server.py 핵심 함수"]
        EX["extract_title()<br/># 헤딩 추출"]
        EXT["_extract_title_from_text()<br/>텍스트에서 제목 추출"]
        COL["collect_md_files()<br/>재귀적 .md 수집"]
        SRCH["search_in_content()<br/>본문 키워드 검색"]
        RES["_resolve_wiki_path()<br/>경로 검증"]
        ADD["_add_to_index()<br/>index.md 항목 추가"]
        REM["_remove_from_index()<br/>index.md 항목 제거"]
    end

    EX --> COL
    EXT -->|"제목 제공"| ADD
    COL --> SRCH
    RES -->|"검증된 경로"| ADD
    RES --> REM
```

| 함수 | 역할 |
|------|------|
| `extract_title()` | `.md` 파일의 첫 번째 `# ` 헤딩을 읽어 문서 제목으로 사용 |
| `_extract_title_from_text()` | 문자열에서 첫 번째 `# ` 헤딩 추출 (파일 없이도 동작) |
| `collect_md_files()` | `root.rglob("*.md")`로 모든 마크다운 파일 재귀 수집 |
| `search_in_content()` | 파일 내용을 읽고 `query.lower() in line.lower()`로 대소문자 구분 없이 검색 |
| `_resolve_wiki_path()` | 상대 경로를 절대 경로로 변환 + `wiki_root` 이탈 검증 |
| `_add_to_index()` | `index.md`의 특정 섹션 아래에 항목 추가 (섹션이 없으면 생성) |
| `_remove_from_index()` | `index.md`에서 항목 제거 + 빈 섹션 정리 |
| `serve()` | MCP 서버 메인 루프 — tool 목록 등록 + 요청 처리 |

---

## index.md 관리 규칙

AGENTS.md 규칙을 `_add_to_index()` / `_remove_from_index()`로 자동화:

```mermaid
flowchart TD
    W["wiki_write<br/>(파일 생성)"] --> ADD["_add_to_index()"]
    U["wiki_update<br/>(제목 변경)"] --> RM["_remove_from_index()"]
    U --> ADD2["_add_to_index()"]
    D["wiki_delete"] --> RM2["_remove_from_index()"]
    M["wiki_move"] --> RM3["_remove_from_index() (source)"]
    M --> ADD3["_add_to_index() (dest)"]

    ADD -->|"섹션 찾기<br/>→ 해당 섹션에 추가<br/>→ 없으면 새 섹션"| DONE1["완료"]
    RM -->|"항목 제거<br/>→ 빈 섹션 정리"| DONE2["완료"]
```

**규칙 요약:**
- 새 파일 생성 → 같은 디렉터리의 `index.md`에 항목 추가
- 제목 변경 → `index.md` 항목 갱신
- 파일 삭제 → `index.md`에서 항목 제거; 빈 섹션도 함께 정리
- 파일 이동 → 원본 `index.md`에서 제거, 대상 `index.md`에 추가
- `index.md` 자체는 자기 자신의 목록에 포함되지 않음

---

## GitHub 저장소

- **URL**: [github.com/icarus-inte01/wiki-mcp](https://github.com/icarus-inte01/wiki-mcp)
- **공개 여부**: Public
- **README**: 한국어 (기본) + 영어 (바이링귤)

**설치 방법 (다른 환경):**

```bash
# 방법 A: 클론 + editable install
git clone https://github.com/icarus-inte01/wiki-mcp.git
cd wiki-mcp
python -m venv .venv
source .venv/bin/activate
pip install -e .

# 방법 B: pip 직접 설치
pip install git+https://github.com/icarus-inte01/wiki-mcp.git
```

---

## 보안

1. **Path traversal 방어**: 모든 도구에서 입력 경로가 `wiki_root` 내부인지 확인
   ```python
   target = (wiki_root / rel_path).resolve()
   if not str(target).startswith(str(wiki_root.resolve())):
       return error
   ```

2. **숨김 파일 제외**: `.`으로 시작하는 파일/디렉터리는 목록에서 제외

3. **파일 중복 생성 방지**: `wiki_write`에서 기존 파일이 있으면 오류 반환

4. **존재 확인**: 모든 쓰기/삭제/이동 도구에서 파일 존재 여부 사전 검증

---

## 환경

| 항목 | 값 |
|------|-----|
| **Python** | 3.14.4 |
| **MCP SDK** | 1.27.2 |
| **위키 경로** | `~/doc/wiki/docs/` |
| **설치 방식** | `pip install -e .` (editable) |
| **Transport** | stdio |
| **등록 파일** | `~/.config/opencode/opencode.jsonc` |

### MCP config 등록

```jsonc
"wiki": {
  "type": "local",
  "command": ["/home/icarus/work/wiki_mcp/.venv/bin/python", "-m", "wiki_mcp", "/home/icarus/doc/wiki/docs"],
  "enabled": true
}
```

---

## 향후 확장 아이디어

- **Resource 노출**: `wiki://` scheme으로 리소스 제공
- **SSE Transport**: 원격 접근 지원
- **검색 성능 개선**: inverted index 도입으로 대량 문서 검색 최적화
- **백링크**: 다른 문서에서 현재 문서를 참조하는 링크 역추적
