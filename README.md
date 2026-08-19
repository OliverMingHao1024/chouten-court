# 頂点コート(chouten-court)

台灣高中籃球球隊經營模擬遊戲。教練視角,經營一支高中球隊,目標是拿下 HBL 甲級總冠軍。

純前端、無後端的網頁遊戲,靈感來自「実況パワフルプロ野球」的栄冠ナイン模式,但玩法與程式碼皆為原創設計。

## 目前功能(開發中)

- 建隊:輸入教練名稱(可骰子隨機產生),固定球隊「淡水高中」
- 球員名冊:2×6 頭像網格,點擊查看完整7項屬性
- 每週決策:訓練(選重點+強度)或練習賽(非賽季限定)
- 賽季行事曆:對應 HBL 甲級五階段(資格賽→預賽→複賽→八強→四強),依戰績晉級或淘汰
- 正式比賽自動模擬,四強賽解出冠亞季殿名次

完整設計規格見 [`docs/spec.md`](docs/spec.md)。

## 開發

```bash
npm install
npm run dev       # 開發伺服器
npm test          # 跑測試(Vitest)
npm run build     # 型別檢查 + 正式build
npm run lint      # oxlint
```

## 技術棧

Vite + React + TypeScript,PWA(可加入主畫面),部署 GitHub Pages。
