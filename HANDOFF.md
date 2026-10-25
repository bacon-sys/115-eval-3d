# 大同國中 115 評鑑 3D 導覽網站：接續說明

給下一個對話串的 Claude 看的交接文件。先讀完這份再動手，不需要重新分析網站。

## 一、網站與位置

| 項目 | 位置 |
| --- | --- |
| 正式網站（3D 導覽） | https://bacon-sys.github.io/115-eval-3d/ |
| 三年山徑（課程地圖） | https://bacon-sys.github.io/115-eval-3d/valley/ |
| GitHub repo | `bacon-sys/115-eval-3d`：`main` 分支＝發布的成品（GitHub Pages 自動部署）；`source` 分支＝原始碼（本文件所在） |
| Artifact（主網站） | https://claude.ai/artifact/LUHtbGefRBF7LRTDfET584 |
| Artifact（三年山徑） | https://claude.ai/artifact/6tfYWwanfhHQ5xnsnm8gEK |
| 正式內容來源 | Notion「大同國中115學年度實驗教育評鑑網站」（Notion 為正式版，網站逐字同步） |
| 指標×學年度對照表（待老師核對） | https://claude.ai/artifact/Ln9FRKk86B5YsHid77ZFUN（資料：`eval3d/timeline/rows.py`） |

## 二、開工步驟（新對話串）

```bash
cd /home/claude
git clone https://github.com/bacon-sys/115-eval-3d.git            # main：成品
git -C 115-eval-3d fetch origin source
git -C 115-eval-3d worktree add /home/claude/src source           # 原始碼
cd /home/claude/src/valley && npm install
cd /home/claude/src/eval3d && npm install
```
（若 clone 需要授權，先用 add_repo 把 `bacon-sys/115-eval-3d` 加進工作階段，access=push。）

## 三、建置、測試、發布

1. 三年山徑：`cd valley && python3 build.py` → `valley/dist/`
2. 主網站：`cd eval3d && python3 build.py`（會跑 extract.py、render.py，並把 valley 成品複製到 `site/valley/`）→ `eval3d/site/index.html`、`eval3d/dist/index.html`（artifact 用片段）
3. 測試：`cd eval3d/site && (python3 -m http.server 8765 >/dev/null 2>&1 &)`，Playwright 加 `--use-gl=swiftshader`；網址加 `?debug` 會開放 `window.__e3d`（主網站）、`window.__vl`（山徑），可用 `advance(秒)` 快轉島民。範例在 `eval3d/test/`。圖片在 main 分支的 `img/`，本機測試看不到照片屬正常。
4. 發布：把 `eval3d/site/index.html` 複製到 main 的 `index.html`、`eval3d/site/valley/index.html` 複製到 main 的 `valley/index.html`，commit、push。
5. 重新發布 artifact：主網站用 Artifact publish `file_path=eval3d/dist/index.html`、`url`＝主網站 artifact、`root=eval3d/site`、`files=[{"path":"valley/index.html"}]`；山徑用 `valley/dist/valley.html` 發到山徑 artifact（跨對話需先 `action: read` 該 artifact）。
6. 原始碼有改，也要 commit、push 到 `source` 分支。
7. commit 訊息結尾加上系統提示的兩行署名。

## 四、檔案地圖（eval3d/src）

- `app.js`：主程式（場景、島嶼、吊橋、標籤、說明卡、清單、導覽路線、島民、自動播放、顯示選項、效能、晝夜）
- `home.js`：首頁內容 `SCHOOL`、導覽路線 `ROUTES`（含主題串聯）、相關指標 `RELATIONS`（11 組）、關聯行人 `WALKERS`（角色、物品、圖示）
- `roles.js`：角色島民造型（泰雅紅白黑＋菱形紋；學生、老師、文化教師、帶隊教師、畢業校友、行政人員、協作中心委員、耆老、七八九年級、小嚮導）。**改了要同步複製到 `valley/src/roles.js`**
- `scenery.js`、`items.js`、`animals.js`：造景、17 座平台場景、小動物
- `reader.js`、`search.js`、`textonly.js`：全文閱讀、搜尋、無 WebGL 版
- `template.html`：HTML 與全部 CSS
- `content/*.md`、`content/dims.json`：從 Notion 同步的原文；`extract.py` 產生 `src/data.json`，`render.py` 產生閱讀頁；`check_text.py` 檢查網站是否逐字包含 Notion 原文
- 三年山徑：`valley/src/app.js`、`data.js`（21 主題 ISLANDS、構面 DIMS、縱向銜接 LINKS、銜接行人 LINK_WALKERS）

## 五、已完成的功能（重點）

- 主網站：學校島（獨立山＋三年山徑入口）、6 構面島、17 指標平台；晝夜（`?time=day|dusk|night`）；導覽路線與 6 條主題串聯；相關指標弧線；小動物
- 島民：11 位關聯行人帶著佐證往返（點了說明「把 X 從 A 送到 B」與出處）；小嚮導依序走 1-1→6-3；圖示隨場景縮放、全景淡出；名牌全景隱藏
- 指標總覽「相關指標」分頁（點選只留該條弧線與該位島民）
- 右上角工具列分組，每組上方有小標題（看畫面／找內容／設定，`.tgl`）：①全景、自動播放 ②指標總覽、導覽路線、搜尋、全文閱讀 ③晝夜（獨立按鈕）、顯示設定（名牌／島民／圖示／弧線／動畫開關；拍照模式已依老師要求移除）④圓形「？」＝操作方式小卡＋「看完整使用說明（6 步）」。手機（寬度 <760px）全部收進右上角「選單」，點了某項就收起（晝夜除外）
- 夜晚光線（主網站與山徑相同）：天空、水面維持深藍，月光加亮（hemi 1.45、sun 1.1），讓島面與構面顏色看得清楚
- 下方操作提示：第一次拖曳／縮放或約 10 秒後淡出（開場使用說明開著時不倒數，關閉後 10 秒）；之後由「？」查看
- 「自動播放」13 段運鏡字幕；一般速度每段約 5～10 秒（慢速＝原速 6～12 秒，`PLAY_SPEED = 0.8`），字幕列有「慢速」與「♪ 配樂」開關（設定存在 localStorage）；配樂為 `src/music.js` 以 Web Audio 即時合成，無音檔；網址 `#play` 自動開始（需點一下畫面才出聲）
- 原「導覽」按鈕改為「？」使用說明（6 步操作教學）；與自動播放分開，自動播放最後一段提示「操作方式可點右上角的「？」（使用說明）查看」
- 網站用語：走動的人物一律稱「島民」（原稱「小人」），小嚮導不變
- 效能：靜止 30fps、關動畫 8fps，依實測降解析度與關陰影
- 三年山徑：一位學生依序走 01→21（換年級換服色，走完新一屆接手）、9 位銜接行人；找小嚮導遊戲維持原樣

## 六、老師的工作原則（務必遵守）

- 網站文字逐字取自 Notion，不自行補充或推測內容；不確定先問老師
- 不放學生姓名或個資；畢業生進路原始檔含身分證字號，永不上傳；教師流動頁維持去識別化
- 服裝配色與紋樣以泰雅族特色為主；不同角色要看得出差別
- 字體 18px 以上、正式繁體中文；回覆用繁體中文
- 先提觀察與規劃、確認後再執行（老師要求時）

## 七、待辦與未決事項

- 指標×學年度時間軸篩選：等老師核對對照表並決定 5 點（年度 vs 學年度、115 是否列入、跨年度累計、外部研究、照片說明 2 筆），再做「三年期時間軸」篩選
- 老師已知、尚未處理：4-2 仍寫「自 113 學年度起爭取 ELTA」；Notion「九年級文化課程學習回饋統計 (114-1)」仍寫「過半數」
- 3-3 的「🚧 待補照片」callout 在網站上隱藏，建議老師在 Notion 處理
