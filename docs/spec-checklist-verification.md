# Spec Checklist 補全結果 — 獨立驗證報告

> 針對 `docs/spec-checklist.md` 中記錄的 7 個落差項目,在補全實作後,以獨立 agent 重新讀碼驗證(不採信 checklist 文字本身),確認是否真的落地、有無殘留舊邏輯或新引入 bug。驗證時間:本次對話當下。

## 驗證方式

不 grep 函式名稱就下結論,而是逐一讀懂：
- 數值/機率公式是否正確、有無邊界錯誤(除0、負值等)
- 新參數是否真的被上層呼叫端傳入使用,而非「定義了卻沒接上」
- 資料流順序是否正確(例如聲望是否用「結算後」的新值)
- 新機制是否確實取代了舊寫法,而非並存造成邏輯分歧
- 事件觸發時機點是否對應規格描述(例如「同屆3年不變」)

並額外執行 `npm test`、`npx tsc -b`、`npm run lint`,以及重新逐字比對 `docs/spec.md` 與 `docs/spec-checklist.md` 的文字敘述是否仍與程式碼現況一致。

## 逐項結論

| # | 項目 | 結論 | 佐證 |
|---|---|---|---|
| 1 | 天才型候選池稀有化 | ✅ 確認屬實 | `recruiting.ts` 的 `PERSONALITY_WEIGHTS`(genius=1,其餘5種各=3,總權重18)+ `pickWeightedPersonality` 加權抽取邏輯正確,無除0/邊界問題,genius 命中機率 1/18≈5.6%,遠低於均勻分布的 16.7%。 |
| 2 | 重傷缺賽週數依賽制階段調整 | ✅ 確認屬實 | `matchEngine.ts` 的 `rollForInjury`/`advancePlayerWeek` 把 `majorInjuryWeeks` 當可選參數一路往下傳;`officialMatch.ts` 的 `PHASE_MAJOR_INJURY_WEEKS` 隨階段遞增(3~5 → 6~9 週),`simulateOfficialGame` 確實依當前階段傳入對應範圍;練習賽/訓練週未傳參數時正確落回預設 4~7 週。不是「定義了卻沒接上」。 |
| 3 | 疲勞值折算進比賽勝率係數 | ✅ 確認屬實 | `effectiveAttributeAverage` 用 `fatigueMultiplier = 1 - (fatigue/100)*0.15` 乘進屬性均值,`computeTeamStrength` 逐一套用,確實讀取 `fatigue` 並影響戰力輸出。 |
| 4 | 生涯總結加聲望曲線 | ✅ 確認屬實 | `App.tsx` 建立 `seasonRecord` 前已先算好 `reputationDelta`/套用完 `applyReputationDelta`,`reputationAfter` 用的是結算後新值,順序正確非舊值;`CareerSummaryScreen.tsx` 確實依 `careerLog` 逐季渲染長條圖,非死碼;`saveData.ts` 也已將 `reputationAfter` 納入必填驗證。 |
| 5 | 賽前戰術旋鈕 | ✅ 確認屬實 | `SeasonMatchScreen.tsx` 的按鈕選擇經 `onPlayGame` → `App.tsx` → `advanceSeasonWeek` → `simulateOfficialGame` 一路傳遞;`computeTacticAttributeWeights(tactics)` 只餵進我方 `roster` 的加權計算,對手強度 `PHASE_OPPONENT_STRENGTH[phase] + computeAceStrengthBonus(opponentAce)` 完全不受戰術影響,符合「戰術只影響我方」的設計。 |
| 6 | 王牌選手機制 | ✅ 確認屬實 | 名冊全員 `grade` 同步遞增(無提前/延後畢業的個體差異),因此「全隊畢業」必然每 3 年整批發生,`eraCount` 遞增節奏穩定;`App.tsx` 只在 `graduates.length > 0` 時才遞增 `eraCount` 並重生 `opponentAce`,其他所有分支原樣帶回舊值並存進存檔,時機點與規格「每屆重生一次、同屆3年不變」相符。 |
| 7 | 比賽表現變異度 | ✅ 確認屬實 | `computePerformanceVarianceRange` 依名冊 scorer/steady 個性數量差計算波動範圍,並用 `Math.max` 防止變成負值/0;`officialMatch.ts`、`weeklyAction.ts` 均已改呼叫 `computeMatchWinProbability`,找不到殘留的舊「兩步式」外部呼叫點(內部呼叫 `computeTeamStrength` 屬正常組合,非殘留舊寫法)。 |

**結論:7 項全數確認屬實,未發現殘留舊邏輯、半成品或新引入的 bug。**

## 測試 / 型別 / Lint 結果

| 檢查 | 結果 |
|---|---|
| `npm test`(vitest) | 34 個測試檔全過,255 passed / 1 skipped,無失敗(僅有 jsdom 缺少 canvas polyfill 的既有環境警告,非測試失敗) |
| `npx tsc -b` | 通過,無型別錯誤 |
| `npm run lint`(oxlint) | 通過,無警告 |

## 發現並修正的文字誤差

驗證過程中發現一處**純文字/註解層面**的算術錯誤,已修正:

- **問題**:天才型稀有化的機率描述寫成「約 1/16 ≈ 6.25%」,但實際權重配置(genius=1,其餘5種各=3)的總權重是 `1 + 3×5 = 18`,正確機率應為 `1/18 ≈ 5.6%`(1/16 的算法漏加了 genius 自己那一份權重)。
- **影響範圍**:僅程式碼註解(`src/domain/recruiting.ts`)與 `docs/spec-checklist.md` 的文字敘述,**不影響 `pickWeightedPersonality` 的實際邏輯與行為**——程式邏輯本身正確,只是機率的口頭描述算錯。
- **已修正**:兩處文字皆已更新為「約 1/18 ≈ 5.6%」。

## 文字與程式碼一致性複查

除上述機率誤差外,重新逐字核對 `docs/spec-checklist.md` 中關於檔案位置、函式名稱、行為敘述的段落(第7、8、11、16節等),均與程式碼現況一致,未發現其他文字與程式碼不符之處。
