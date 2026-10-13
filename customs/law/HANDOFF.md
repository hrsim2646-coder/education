# 작업 이어가기 메모 (관세법 연계뷰)

- 목표: 관세법·시행령·시행규칙(+고시) 조문을 항 단위로 연계해 보는 웹앱. 이후 객관식/논술 출제, 다른 웹앱으로 확장.
- 현재 상태: `APP/관세법_법령연계_웹앱.html` 완성(법·령·칙 전 조문, 위임/인용/벌칙 선 연결, 검색, 모바일, 고시 열·개정 변경전/후 구조 지원).
- 핵심 원칙: 법령 PDF 문구와 달라지면 안 됨(빌드 시 글자 단위 대조, 불일치 시 중단). 기존 `DRAFT/`·`tools/*.py`는 1차 초안으로 보존.
- 재빌드: `웹앱_빌드.bat` 또는 `python -I tools/lawapp/build_app.py` (PyMuPDF 필요: `pip install pymupdf`)
- 다음 후보: 실제 고시 PDF 추가, 실제 개정본 비교 검증, `검수필요_띄어쓰기.txt` 검수→`DATA/text_overrides.json`, 연계 오분류 `DATA/links_manual.json` 보정, 문제 출제(`DATA/export/lawgraph.json` 활용), Open API(XML) 전환.
- 상세: `README_웹앱.md`
