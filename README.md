# 評鑑導讀手冊（A4，32 頁）原始檔

- `content_data.py`：各指標頁摘要、關鍵數字、照片、建議回應與省思（內容只取自簡報與 Notion 網站）
- `build.py`：產生 HTML 並以 Playwright 輸出 PDF；`python3 build.py full` → full.pdf（預覽）、full_bleed.pdf（3 mm 出血）
- `fonts.py`：把 Noto CJK TC 子集化為 TrueType（BkSans／BkSerif），避免 Type 3 字型
- 需要 source 分支的 `eval3d/src/data.json`（build.py 預設路徑 /home/claude/src/eval3d/src/data.json）
- 輸出後以 pypdf 設定 TrimBox／BleedBox，詳見專案文件 `claude/評鑑手冊_交接說明.md`
