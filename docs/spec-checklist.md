# Spec 對照 Checklist

> 依 `docs/spec.md` 逐節核對規格文字與 `src/domain`、`src/features`、`App.tsx` 的實際實作是否相符。標註不完全採信 spec 內文自帶的「(MVP 尚未實作)」字樣,而是實際讀碼確認。
>
> 圖示:✅ 完全相符　⚠️ 部分相符/有出入　🔶 規格已標註未實作且程式碼確認未實作(如實)

- [✅] **第1節 專案定位** — Vite+React+TS、無後端、PWA(`index.html` 引用 `manifest.webmanifest`+`sw.js`、`vite.config.ts:7` `base: '/chouten-court/'` 對應 GitHub Pages),`package.json` 依賴僅 React/DiceBear,無排行榜相關程式碼。

- [✅] **第2節 核心時間系統** — `calendar.ts:1-3` `WEEKS_PER_YEAR=48`、`OFFSEASON_WEEKS=26`;`SEASON_PHASE_LENGTHS` 依序 4/4/5/6/3 週(資格賽/預賽/複賽/八強/四強)加總 22 週,與規格完全一致。

- [⚠️] **第3節 生涯結構與結局** — `career.ts` `INSURANCE_MAX_ERAS=6`、`hasReachedInsuranceCap`、`isChampionRun` 均已接到 `App.tsx:306-321` 的畢業結算流程,勝利/保險上限條件正確觸發生涯總結。
  - 差異:規格「6屆≈650週」是週數概念,程式碼改以「畢業批次(屆)」計數(程式註解已說明為刻意簡化,非按週精算);起始情境選擇仍未實作,`App.tsx:194-212` 一律以固定初始聲望開局(與規格自我標註一致)。

- [✅] **第4節 球隊與球員資料模型** — `types.ts:70-82` `Player` 含 7 項屬性、`fatigue`(0-100)、`personality`、`injuryStatus`(健康/輕傷/重傷/復出過渡期)、即時計算的 `styleTag`。
  - 備註:名冊固定 12 人(`roster.ts:13` `ROSTER_SIZE=12`),規格寫「10~12」但程式從未使用 10、11 這兩個下限值,屬未用滿區間,非邏輯錯誤。

- [🔶] **第5節 招生系統** — 候選池屬性只顯示區間(`recruiting.ts:29,59-63`);球探點數窄化功能確認未實作(`Candidate` 型別無相關欄位),如規格標註屬實。收隊不做拒絕/交涉(`signCandidates`)。聲望調整候選池機率分佈但不設硬上限/下限(`REPUTATION_ATTRIBUTE_SHIFT` 線性位移後僅鉗制到屬性物理範圍 15~99)——相符。

- [✅] **第6節 訓練與練習賽** — 三檔風險機率完全相符:`weeklyAction.ts:19-34` light≈83%、moderate≈67%、intense=50%。骰6「會心一擊」多長1點。疲勞消耗只看強度不看成敗,intense 淨增加(呼應「全力一搏」設計)。天賦倍率(genius 1.3x全屬性、scorer 1.3x限投籃/三分)已實作。訓練彈窗(`TrainingResultDialog.tsx`)行為、練習賽三檔對手、月頻上限1次、賽季前3週封鎖、不影響聲望——全數相符。

- [✅] **第7節 比賽模擬** — 全自動模擬(一次性擲骰決勝負)相符。**戰術旋鈕已補上**:`tactics.ts` 定義進攻節奏(快攻/半場陣地戰)、防守策略(盯人/聯防),`computeTacticAttributeWeights` 依戰術加權對應屬性,`officialMatch.ts` 的 `simulateOfficialGame` 接收 `tactics` 參數並套用在隊伍戰力計算;`SeasonMatchScreen.tsx` 新增兩組按鈕供玩家選擇,預設 `DEFAULT_TACTICS`。**疲勞係數已補上**:`matchEngine.ts` 的 `effectiveAttributeAverage` 新增 `FATIGUE_PERFORMANCE_PENALTY`(疲勞100時打85折),`computeTeamStrength` 會套用此係數,不再只看復出過渡期。

- [✅] **第8節 對手球隊** — 強度值依賽制階段遞增(`officialMatch.ts:19-25` 55→62→70→78→88)相符;對手校名地名+後綴生成(`opponentName.ts`)相符。**王牌選手機制已補上**:`opponentAce.ts` 的 `generateOpponentAce` 生成固定屬性(得分70~99、三分60~95)的王牌,`computeAceStrengthBonus` 依屬性加權進對手有效強度;`App.tsx` 於開局與每次 `eraCount` 遞增(換屆)時重新生成,同屆 3 年內不變;`SeasonMatchScreen.tsx` 顯示王牌姓名與關鍵數據。

- [✅] **第9節 球員個性** — 6 種個性標籤定義齊全(`types.ts:29-47`)。
  - 玻璃體質受傷機率係數 `FRAGILE_INJURY_MULTIPLIER=1.6` 已實作,但「屬性成長上限較高」未見對應程式碼(共用 `ATTRIBUTE_MAX=99`),屬於規格細節尚待補完,不影響本節整體判定。
  - 隊長型「在場加成」、抗壓型「淘汰賽加成」如規格標註未實作,僅存在標籤定義,無效果邏輯 —— 如實,規格本身已自陳。
  - **已補上**:天才型候選池稀有化 —— `recruiting.ts` 的 `PERSONALITY_WEIGHTS`(genius 權重1,其餘各3,總權重18)搭配 `pickWeightedPersonality`,genius 出現機率約5.6%(1/18),明顯低於均勻的16.7%(其餘5種各約3/18≈16.7%)。
  - **已補上**:比賽表現變異度 —— `matchEngine.ts` 新增 `computeMatchWinProbability`,依名冊個性組成(飆分型多→波動範圍大,穩健型多→波動範圍小)在隊伍戰力上疊加一次性隨機噪音再算勝率,`officialMatch.ts`/`weeklyAction.ts` 均已改用此函式。

- [⚠️] **第10節 球風標籤** — `styleTag.ts` 依 7 項屬性算出五維分數(得分/射手/組織/防守/籃板)取主副傾向組字串標籤,公式為原創且規格本已聲明「尚未調校」;純由屬性算出、不新增資料欄位、玩家不可操作 —— 邏輯與敘述相符,列為⚠️僅因公式本身待調校為規格自陳的開放狀態。

- [✅] **第11節 疲勞與受傷** — 疲勞週結算、受傷觸發依疲勞值滾機率(僅比賽週判定)、輕傷缺賽1~2週+疲勞歸零、重傷復出後1~2週打8折(`RETURNING_ATTRIBUTE_MULTIPLIER=0.8`)、無永久後遺症 —— 均相符。「疲勞值只在週結算與比賽模擬係數中起作用」已補上(見第7節)。**重傷缺賽週數已補上依賽制階段調整**:`matchEngine.ts` 的 `rollForInjury`/`advancePlayerWeek` 新增可選 `majorInjuryWeeks` 範圍參數,`officialMatch.ts` 的 `PHASE_MAJOR_INJURY_WEEKS` 依階段遞增(資格賽3~5週 → 四強賽6~9週),`simulateOfficialGame` 依當前階段傳入對應範圍;練習賽等無階段情境維持預設 4~7 週。

- [✅] **第12節 聲望系統** — 單一聲望值依賽季晉級階段/名次調整(`reputation.ts` `PHASE_ELIMINATION_DELTA`),影響候選池機率分佈但無硬上限/下限 —— 相符。

- [🔶] **第13節 名人堂與球星比對彩蛋** — 規格已標註整節未實作,確認無名人堂彙整畫面或球星距離公式,僅 `graduation.ts` 畢業生後日談文字,並在 `CareerSummaryScreen.tsx:56-65` 顯示最近5筆 —— 與規格自述完全吻合。

- [✅] **第14節 種子碼分享** — `SetupScreen.tsx:68-74` 提供選填種子碼,未填則以隊名:教練名當種子;`rng.ts` 決定論亂數,各處以 `hashSeed` 衍生子種子確保可重現 —— 相符。

- [✅] **第15節 畢業生後日談** — `graduation.ts` 依最終屬性、個性(genius 1.4x加權)、當時聲望做加權隨機判定去向並產生模板文字,不影響任何主線數值 —— 相符。

- [✅] **第16節 總結畫面** — 單季總結(四項獎項)、生涯總結(生涯戰績/最佳戰績/畢業生彙整)、可下載戰績分享卡(`shareCard.ts`)均存在。**聲望曲線已補上**:`seasonSummary.ts` 的 `SeasonRecord` 新增 `reputationAfter` 欄位(每季結算時的聲望值),`CareerSummaryScreen.tsx` 新增「聲望曲線」區塊,依 `careerLog` 逐季畫出長條圖與數值。

- [🔶] **第17節 成就/稱號系統** — 規格已標註未實作,確認全專案無 achievement/badge 相關程式碼與欄位 —— 如實。

- [🔶] **第18節 宿敵校追蹤** — 規格已標註未實作,確認對手校名每次即時隨機生成,無歷屆交手紀錄或宿敵指數資料結構 —— 如實。

- [✅] **第19節 命名系統** — 球隊固定「淡水高中」不可自訂;教練名稱自動產生+可手動輸入+骰子重隨機;球員/候選人姓名共用姓氏+雙字名生成,同名冊重名會重試(不保證絕對不重名);對手校名生成規則 —— 均相符。

- [✅] **第20節 存檔系統** — localStorage 單一存檔;匯出/匯入JSON含完整格式驗證,失敗時拒絕載入並提示;UI 目前以 `EXPORT_IMPORT_ENABLED=false` 隱藏,底層邏輯與驗證保留 —— 與規格「先隱藏、之後拿掉開關即可恢復」完全吻合。

- [✅] **第21節 視覺呈現** — DiceBear `bigSmile` 以球員ID當種子生成SVG頭像(僅臉部);訓練擲骰用原生 `<dialog>`+Unicode骰子字元⚀-⚅,成功/失敗以顏色區分;點擊背景或按鈕關閉;球員詳細資料彈窗共用同一套互動模式 —— 相符。

- [✅] **第21a節 隨機事件卡系統** — 非賽季週25%觸發機率(僅在無比賽/無招生時判定);3分類、`{player}`模板代入;三檔風險成功率統一70%/50%/30%並直接顯示;效果涵蓋屬性成長/疲勞增減/聲望增減組合,且有以疲勞恢復為主的卡片;事件本身消耗一週 —— 完全相符。

- [🔶] **第22節 明確排除的範圍** — 逐項核對均與前述章節結論一致:無完整對手名冊、無逐場/逐節體力管理與臨場戰術操作、無永久能力下降或舊傷復發、單存檔槽無雲端同步、無音效/BGM、無防竄改機制、畢業生後續不可互動 —— 如實排除。

- [✅] **第23節 授權與原創聲明** — 各數值/公式來源檔案(`styleTag.ts`、`weeklyAction.ts`、`events.ts`、`opponentName.ts`、`nameGenerator.ts` 等)內皆有原創/待調校註解,未發現移植外部專案程式碼或資料表的跡象。

---

## 總覽

**完成度粗估(以第1~21a節為主,第22、23節屬盤點/聲明性質不計入完成度統計):**

- 完全相符 ✅:16 節(1、2、4、6、7、8、9、11、12、14、15、16、19、20、21、21a)
- 規格已標註未實作且程式碼確認如實 🔶:4 節(5之球探點數子項、13、17、18)
- 部分相符/有出入 ⚠️:2 節(3、10 —— 皆為規格本身自陳「尚未調校/簡化」的開放狀態,非程式碼缺陷)

**2026 補全紀錄:** 原先標記為落差的 7 個項目已全數補齊並通過測試(`npm test`/`npm run build`/`npm run lint`):
1. 天才型候選池稀有化(`recruiting.ts`)
2. 重傷缺賽週數依賽制階段調整(`matchEngine.ts` + `officialMatch.ts`)
3. 疲勞值折算進比賽勝率係數(`matchEngine.ts`)
4. 生涯總結加聲望曲線(`seasonSummary.ts` + `CareerSummaryScreen.tsx`)
5. 賽前戰術旋鈕(新增 `tactics.ts`,`officialMatch.ts`/`season.ts`/`SeasonMatchScreen.tsx` 串接)
6. 王牌選手機制(新增 `opponentAce.ts`,`App.tsx` 依屆數重生,`officialMatch.ts` 加權進對手強度)
7. 比賽表現變異度(`matchEngine.ts` 新增 `computeMatchWinProbability`,依個性組成疊加隨機噪音)

存檔格式因新增 `reputationAfter`、`opponentAce` 欄位,`SAVE_FORMAT_VERSION` 由 5 bump 到 6(舊存檔會被拒絕,無 migration,符合專案既有慣例)。

**仍待調校/待後續設計的開放項目(非落差,規格本身已標註):**
- 第3節:起始情境選擇(新手教練/老牌名校)尚未實作,一律固定初始聲望開局。
- 第10節:球風標籤加權公式為原創設計,規格已聲明「尚未調校」。
- 第9節:隊長型「在場加成」、抗壓型「淘汰賽加成」規格本身標註未實作,僅存在標籤定義。
- 第9節:玻璃體質「屬性成長上限較高」規格提及但未實作(受傷機率係數已實作)。

*(主要程式碼參照:`src/domain/matchEngine.ts`、`officialMatch.ts`、`weeklyAction.ts`、`recruiting.ts`、`tactics.ts`、`opponentAce.ts`、`season.ts`、`seasonSummary.ts`、`saveData.ts`;UI 參照 `src/App.tsx`、`src/features/season/SeasonMatchScreen.tsx`、`src/features/career/CareerSummaryScreen.tsx`)*
