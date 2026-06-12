# Wiki 규칙

이 문서는 `~/doc/wiki` 작업 시 AI(Sisyphus)가 항상 따라야 할 규칙을 정의합니다.

## index.md 관리 규칙

> **새 `.md` 파일이 추가될 때마다, 해당 디렉터리의 `index.md`에 제목과 링크를 반영해야 합니다.**

### 규칙 상세

1. `docs/` 아래 특정 디렉터리에 새 `.md` 파일(예: `docs/dev/mcp.md`)이 생성되면, 같은 디렉터리의 `index.md`(예: `docs/dev/index.md`)에 항목을 **반드시 추가**해야 합니다.

2. 추가 형식:
   ```markdown
   - **[문서 제목](파일명.md)** — 한 줄 설명
   ```

3. 문서의 제목은 해당 `.md` 파일의 첫 번째 `# ` 헤딩을 읽어서 사용합니다.

4. 카테고리(`## 섹션명`)가 적절하면 해당 섹션 아래에 배치하고, 적절한 섹션이 없으면 새 섹션을 추가합니다.

5. 이미 index.md에 등록된 파일은 중복 추가하지 않습니다.

### 예외

- `index.md` 자체는 목록에서 제외합니다.
- 외부 참조용 문서 등 index.md에 노출할 필요가 없는 파일은 명시적으로 제외할 수 있습니다.

### 적용 예시

`docs/dev/mcp.md` 추가 → `# MCP (Model Context Protocol)` 읽음 → `docs/dev/index.md`에 추가:

```markdown
- **[MCP (Model Context Protocol)](mcp.md)** — AI Application과 외부 도구 연결을 위한 표준 프로토콜
```
