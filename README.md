# 音樂臥底 測試版

這是一個手機優先設計的音樂臥底遊戲測試版本，支援 iPhone / Android 手機瀏覽器。

## 1. 本機測試

1. 開啟終端機，進入專案資料夾：
   ```powershell
   cd "d:\Nick Ai Agent\musicimposter"
   npm install
   npm start
   ```
2. 系統會啟動本機伺服器，預設監聽： `http://localhost:3000`
3. 在同一台裝置上打開瀏覽器測試：
   - 直接輸入 `http://localhost:3000`
4. 若要用手機測試，請確保手機與電腦在同一個 Wi-Fi：
   - 先在電腦上執行 `ipconfig` 找到本機 IPv4 位址，例如 `192.168.1.100`
   - 手機瀏覽器輸入 `http://192.168.1.100:3000`

## 2. 推上 GitHub

如果你的電腦還沒有 Git，請先安裝 Git for Windows：
- `https://git-scm.com/download/win`

如果你不想使用命令列，也可以改用 GitHub Desktop：
- `https://desktop.github.com`

### 用命令列上傳 GitHub（推薦）
1. 初始化 Git 專案：
   ```powershell
   cd "d:\Nick Ai Agent\musicimposter"
   git init
   git add .
   git commit -m "初始化 音樂臥底 測試版"
   ```
2. 建立 GitHub 倉庫：
   - 到 `https://github.com/new` 建立一個新的 Repository
   - 名稱可取 `music-impostor` 或你喜歡的名稱
3. 將本機專案推上 GitHub：
   ```powershell
   git remote add origin https://github.com/<你的帳號>/<你的倉庫>.git
   git branch -M main
   git push -u origin main
   ```

### 如果 git 指令無法使用，改用 GitHub Desktop
1. 安裝並開啟 GitHub Desktop
2. 選 `File` -> `Add Local Repository...`
3. 選取 `d:\Nick Ai Agent\musicimposter`
4. 輸入 commit 訊息，按 `Commit to main`
5. 點右上 `Publish repository`，選擇你的 GitHub 帳號
6. 上傳完成後，GitHub 會有專屬網址

## 3. 最簡單上線方式（Railway）

1. 到 `https://railway.app`
2. 註冊或登入
3. 點 `New Project` -> `Deploy from GitHub`
4. 授權 Railway 存取你的 GitHub 倉庫，並選擇你的專案
5. Railway 將自動偵測 Node.js 專案
6. 保留預設：
   - Build command：`npm install`
   - Start command：`npm start`
7. 部署完成後，Railway 會給你一個公開網址

### 手機直接測試

- 用手機瀏覽器輸入 Railway 給你的公開網址
- 直接開始遊戲，不用再額外操作

## 4. 如果你想更快上線

如果你希望，我可以幫你直接檢查 GitHub 倉庫內容、確認 `package.json`、確認 `Procfile` 是否存在，並給你最少步驟的上線清單。

## 5. 遊戲玩法

- 最少 3 人
- 主持人建立房間並設定題目類型、臥底人數、局數
- 其他玩家輸入房號加入
- 遊戲進入聽歌階段後自動背景播放 YouTube 音樂
- 音樂結束後進入投票，投票限時 15 秒
- 答案顯示 5 秒後自動進入下一局或結束遊戲

## 注意

- 此版本為測試版，請先用不同裝置或瀏覽器測試多人流程
- 若要讓更多人連線，必須部署到公開伺服器或使用網路穿透工具

