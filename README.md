# 評鑑導讀手冊（A4，36 頁）原始檔

- `content_data.py`：各指標頁摘要、關鍵數字、照片、建議回應與省思（內容只取自簡報與 Notion 網站）
- `build.py`：產生 HTML 並以 Playwright 輸出 PDF；`python3 build.py full` → full.pdf（預覽）、full_bleed.pdf（3 mm 出血）
- `fonts.py`：把 Noto CJK TC 子集化為 TrueType（BkSans／BkSerif），避免 Type 3 字型
- 需要 source 分支的 `eval3d/src/data.json`（build.py 預設路徑 /home/claude/src/eval3d/src/data.json）
- 輸出後以 pypdf 設定 TrimBox／BleedBox，詳見專案文件 `claude/評鑑手冊_交接說明.md`
- `guide_pages.py`：第 4–5 頁「評鑑網站（3D 導覽）使用指南」跨頁（截圖在 `img/guide/`；以 A4 實際 mm 排版，內層 zoom 抵銷 B5→A4 放大）
- 頁序（36 頁）：1 封面｜2 目錄｜3 學校概況｜4–5 網站使用指南｜6–7 簡報×手冊對照｜8–30 六構面與 17 指標｜31 前次建議回應｜32 五項省思｜33 綜合座談筆記｜34–35 筆記｜36 封底
