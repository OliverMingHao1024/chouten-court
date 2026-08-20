# `chouten-court` 籃球遊戲性改善計畫

> 整理日期：2026-08-21  
> 目標：將《白球のキセキ》的經營設計轉譯為適合台灣高中籃球球隊經營遊戲的實作計畫。  
> 原則：借鑑決策結構，不複製棒球專屬規則、原作公式或介面。

## 1. 問題

目前專案已具備完整 MVP：

- 每週訓練、休養與練習賽。
- HBL 賽季與晉級流程。
- 正式賽自動模擬及戰術選擇。
- 5 名先發與 3 名主要輪替。
- 疲勞、受傷與復出。
- 招生、畢業、聲望與生涯總結。

目前主要缺口不是內容數量，而是現有系統之間尚未形成完整的教練決策循環：

1. 先發承受較高疲勞，但沒有相應的實戰成長。
2. 玩家看不到陣容、戰術與疲勞如何影響比賽。
3. 每場陣容不會沿用，選人資訊也不足。
4. 部分個性只有名稱，沒有實際戰術價值。
5. 單一疲勞是否需要拆分，目前缺少足夠玩法支撐。

## 2. 設計轉譯

《白球のキセキ》的棒球機制不直接搬入本專案，而是轉譯成籃球概念：

| 棒球研究概念 | 籃球專案對應 |
|---|---|
| 先發投手、中繼、終結者 | 先發、主要輪替、未上場 |
| 投球數 | 出賽角色與預估上場負荷 |
| 跨日投手耐力 | 跨場疲勞 |
| 疲勞恢復能力 | 球員恢復能力 |
| 捕手支援投手 | 隊長、組織者與陣容互補 |
| 投手輪值 | 主力輪休與板凳深度 |
| 比賽起用養成 | 新人實戰成長 |
| 學校評判與設備 | 聲望、招生與學校資產 |

核心目標是建立：

```text
安排先發與輪替
→ 評估戰力、疲勞與培養需求
→ 完成比賽
→ 主力累積負荷、上場球員取得成長
→ 根據結果調整下一場陣容
```

## 3. 已完成基礎

### 3.1 先發與輪替

- 正式賽可選擇 5 名先發及最多 3 名主要輪替。
- 先發與輪替以 6：3 權重計入球隊戰力。
- 未上場球員不計入本場戰力。
- 先發承受完整負荷。
- 輪替承受一半負荷。
- 未上場球員恢復疲勞且不參與本場受傷判定。
- 人數不足時自動補滿可用陣容。

### 3.2 訓練與恢復

- 每名球員各自擲骰。
- 骰面直接決定成長量。
- 訓練不再選擇風險強度。
- 已提供確定性的全隊休養。
- 練習賽仍提供額外成長及疲勞風險。

## 4. 第一階段：正式賽實戰養成(已實作)

### Outcome

讓上場角色同時帶來疲勞成本與養成收益，使教練需要在現在勝率和下一屆球員發展之間取捨。

### User stories

1. 身為教練，我想讓上場球員取得實戰成長，使起用新人具有長期價值。
2. 身為教練，我想輪休主力並培養低年級球員，而不是每場固定使用相同最強陣容。

### Acceptance criteria

- [x] 先發球員具備最高的實戰成長機率。
- [x] 主要輪替具備較低的實戰成長機率。
- [x] 未上場球員不取得實戰成長。
- [x] 成長結果使用現有決定論亂數，維持相同種子可重現。
- [x] 成長套用後重新計算球風標籤。
- [x] 比賽結果摘要列出取得成長的球員與屬性。
- [x] 正式賽存檔及相關測試同步更新。

### Implementation notes(已完成)

- `officialMatch.ts`：`simulateOfficialGame` 在既有的先發/輪替負荷判定之後，依角色機率（先發 40%、輪替 20%、未上場 0%）額外擲一次 rng；命中時再擲一次隨機屬性、套用 `GAME_GROWTH_AMOUNT=1` 並重新計算 `styleTag`；`OfficialGameResult` 新增 `growth: GameGrowthEntry[]`。
- `season.ts`：`AdvanceSeasonWeekResult` 新增 `growth` 並在三個回傳分支都往上傳遞。
- `App.tsx`：新增 `describeGameGrowth`，把本場成長球員與屬性附加到比賽結果訊息後面。
- 測試：`officialMatch.test.ts` 新增「先發成長率 > 輪替成長率」「未上場球員永遠不成長」「成長會重算 styleTag」「同種子可重現」四組案例；既有的「official games are not training」測試已改為「未上場球員不成長」（原斷言與新行為衝突，是刻意變更）。

### References

- `docs/spec.md` §7(已同步更新)

### 初始平衡值

| 角色 | 成長機率 | 成長效果 |
|---|---:|---|
| 先發 | 40% | 隨機一項屬性 +1 |
| 主要輪替 | 20% | 隨機一項屬性 +1 |
| 未上場 | 0% | 無 |

初期使用隨機屬性，不沿用先前訓練重點，避免比賽與數週前的訓練選擇產生不自然耦合。

### Out of scope

- 經驗值與等級系統。
- 逐節上場時間。
- 單場個人技術統計。
- 關鍵時刻專用經驗。

## 5. 第二階段：賽前資訊透明度(已實作)

### Outcome

玩家能在開打前理解陣容、疲勞與戰術造成的影響。

### Acceptance criteria

- [x] 球員選擇項目顯示姓名、位置、年級、綜合評價與疲勞。
- [x] 顯示先發、輪替和未上場的預估疲勞變化。
- [x] 顯示目前陣容的基礎戰力。
- [x] 顯示疲勞造成的戰力折損。
- [x] 顯示對手戰力級距。
- [x] 顯示不含隨機表現噪音的基準勝率。
- [x] 顯示目前戰術主要強化的能力。
- [x] 高疲勞球員顯示受傷風險警告。

### Implementation notes(已完成)

- 新增 `src/domain/matchPreview.ts`:`computeMatchPreview(roster, lineup, tactics, phase, opponentAce)` 純函式,組合既有的 `computeTeamStrength`(含戰術/陣容權重)、`computeWinProbability`(不加隨機噪音的基準版本)、`getOpponentTier`、`computeAceStrengthBonus`,回傳戰力、疲勞折損、對手級距、基準勝率、戰術強化屬性清單、先發/輪替/未上場預估疲勞變化、高受傷風險球員 id。
- 疲勞折損算法:把名冊複製一份、疲勞全設為 0 後重新計算戰力,與目前戰力的差即為折損,不需要改動 `matchEngine.ts` 既有函式簽章。
- `matchEngine.ts` 新增 `HIGH_FATIGUE_RISK_THRESHOLD=70` 作為警示門檻(只做二元警告,不對外顯示精確機率)。
- `officialMatch.ts` 的 `OFFICIAL_MATCH_LOAD`/`ROTATION_MATCH_LOAD` 改為 export,供預覽計算沿用同一份數值來源。
- `SeasonMatchScreen.tsx`:拿掉外部傳入的 `opponentTier` prop,改成接收 `phase` 後在元件內即時計算預覽(含對手級距);陣容選擇網格每位球員顯示姓名/位置/年級/綜合評價(`computeOverallGrade`)/疲勞值,疲勞達門檻加上警示符號;新增賽前預覽區塊顯示基準勝率文字評估、目前戰力與疲勞折損、戰術強化屬性、三種角色的預估疲勞變化,以及高風險球員清單。
- `App.tsx`:改傳 `phase` 給 `SeasonMatchScreen`,移除不再需要的 `getOpponentTier`/`PHASE_OPPONENT_STRENGTH` 匯入。

### Testing decisions(已完成)

- `matchPreview.test.ts`:不消耗亂數(同輸入同輸出)、疲勞折損隨疲勞值變化、戰術強化屬性清單、角色疲勞變化排序、陣容內高疲勞球員才標記風險、對手王牌越強戰力級距越高。
- `SeasonMatchScreen.test.tsx`:新增預覽區塊文字斷言、依 phase+王牌算出的對手級距、選入陣容的高疲勞球員觸發風險警告。

### References

- `docs/spec.md` §7(已同步更新)

### 呈現原則

勝率必須使用穩定的基準計算，不加入正式模擬時的一次性隨機噪音。

建議同時顯示文字評估及約略百分比：

```text
本場評估：略佔優勢
基準勝率：約 58%
疲勞影響：戰力 -3.2
```

不得顯示看似精確、實際包含隱藏亂數的誤導數字。

## 6. 第三階段：陣容管理體驗(已實作)

### Outcome

減少每場重複操作，讓陣容安排真正反映位置、疲勞與養成目的。

### Acceptance criteria

- [x] 最近一次正式賽陣容保存於隊伍狀態。
- [x] 下一場正式賽預設沿用上一次陣容。
- [x] 已受傷或不可上場球員自動移除。
- [x] 陣容有空缺時明確提示。
- [x] 提供「最佳戰力」一鍵建議。
- [x] 提供「低疲勞」一鍵建議。
- [x] 提供「培養新人」一鍵建議。
- [x] 自動建議結果仍可由玩家手動調整。
- [x] 明顯失衡的陣容顯示提示，但不阻擋開打。

### Implementation notes(已完成)

- `Team`/`SaveData` 新增 `lastLineup: GameLineup | null`;`App.tsx` 在每場正式賽結算後把實際使用的(已補滿的)陣容存回 `lastLineup`,`SAVE_FORMAT_VERSION` 隨欄位新增遞增到 8。
- `lineup.ts` 新增 `sanitizeLineup(lineup, availablePlayers)`:用上一場陣容當初始狀態,過濾掉已受傷/離隊的球員 id;`SeasonMatchScreen` 用 `useState(() => sanitizeLineup(initialLineup, availablePlayers))` 只在掛載時套用一次,之後交給玩家或建議按鈕調整。
- `lineup.ts` 的 `completeLineup` 簽章改吃 `Player[]`(不再是純 id 陣列),自動補滿時依「剩餘可上場球員的綜合屬性由高到低」排序後依序填入,取代原本單純依名冊陣列順序的作法,補滿結果因此可以說明。
- 新增 `suggestLineup(availablePlayers, strategy)`,三種策略(`bestStrength`/`lowFatigue`/`developRookies`)各自用不同排序規則取前 5+3 名;`SeasonMatchScreen` 提供三顆對應按鈕,套用建議後仍可用既有的點擊循環手動調整。
- 新增 `analyzeLineupComposition(roster, lineup)`,回傳「缺主要持球者(無PG)」「缺內線(無C/PF)」「單一位置佔 8 席中 4 席以上過度集中」三個非阻擋性警告旗標,顯示於陣容區塊上方。
- 陣容選擇提示文字依是否選滿動態調整(未選滿時提示「將自動補上可上場球員」)。

### Testing decisions(已完成)

- `lineup.test.ts`:`completeLineup` 改用 `Player[]` 後的自動補滿排序規則、`sanitizeLineup` 過濾邏輯、三種 `suggestLineup` 策略、`analyzeLineupComposition` 四種情境(缺持球者/缺內線/過度集中/正常)。
- `SeasonMatchScreen.test.tsx`:預設沿用上一場陣容、傷兵自動被排除、空缺提示文字、三顆建議按鈕、套用建議後仍可手動調整、位置警告文字。
- `saveData.test.ts`:`lastLineup` 欄位驗證(合法值可還原、格式錯誤拒絕載入)。
- `App.test.tsx` 既有的正式賽相關固定樣板(存檔 JSON)同步補上 `lastLineup: null`。

### References

- `docs/spec.md` §7(已同步更新)

### 位置提示

MVP 不強制要求固定位置組合，避免傷病時無法開打，但應提示：

- 缺少主要持球者。
- 缺少內線球員。
- 陣容位置過度集中。

自動補滿不得只依名冊陣列順序，必須使用可說明的排序規則。

## 7. 第四階段：賽後摘要(已實作)

### Outcome

玩家能判斷勝負和球員狀態變化的原因。

### Acceptance criteria

- [x] 顯示本場先發與主要輪替。
- [x] 顯示每名球員的疲勞增減。
- [x] 顯示取得實戰成長的球員。
- [x] 顯示新傷勢及發生時的疲勞程度。
- [x] 顯示比賽前後球隊有效戰力差異。
- [x] 摘要在玩家確認後才進入下一週。

### Out of scope

- 逐節戰報。
- 完整個人得分、助攻與籃板數據。
- 比賽中途換人。

### Implementation notes(已完成)

- 新增 `src/features/season/GameSummaryDialog.tsx`(搭配 `GameSummaryDialog.css`),顯示勝負標題、球隊有效戰力賽前→賽後差異、先發與主要輪替的每人疲勞增減與成長屬性、以及新發生傷勢(狀態、預計缺賽週數、受傷前疲勞值)清單;點擊「繼續」或點擊背景才會關閉並觸發 `onConfirm`。
- `Team` 新增 `pendingGameSummary: { display: GameSummaryResult; nextTeamState: Team } | null` 欄位,採「延後提交」模式:`SeasonMatchScreen` 的 `onPlayGame` 觸發時,原本會直接 `setTeam(nextTeamState)` 的完整結算(含season/畢業/招生/生涯結束等既有邏輯)改為先算出完整的 `nextTeamState`,連同用 `buildGameSummaryDisplay()` 算好的摘要資料一起存進 `pendingGameSummary`,`totalWeek`/`players` 等欄位維持不變,畫面因此停留在原本的比賽畫面直到玩家確認。
- `GameSummaryDialog` 的 `onConfirm` 呼叫 `setTeam(team.pendingGameSummary!.nextTeamState)`,把預先算好的下一狀態(可能已包含 `pendingSeasonSummary`/`careerEnded`)正式提交;與既有的賽季結算彈窗、生涯結束流程不需要額外特殊處理即可正確銜接。
- `buildGameSummaryDisplay(before, after, lineup, tactics, growth, outcome)` 用比賽前後的球員陣列(依 id 比對)算出每位先發/輪替球員的疲勞增減與是否成長,並用既有的「逐一比對受傷狀態」技巧偵測新傷勢;新傷勢的「受傷前疲勞值」用賽前疲勞值代替(因輕傷會把疲勞重設為 0,無法用賽後數值回推)。

### Testing decisions(已完成)

- `GameSummaryDialog.test.tsx`:對話框開關生命週期(無結果時不開、有結果時開、確認後關閉、換一個內容相同的新結果仍會重新開啟)、勝負標題、戰力增減文字、每位球員的疲勞增減與成長屬性顯示、有/無新傷勢兩種情境、點擊「繼續」才觸發 `onConfirm`。
- `App.test.tsx`:新增 `confirmGameSummary()` 輔助函式,在既有涉及「開打」的測試(例行正式賽、畢業招生、四強冠軍、保險上限)中,於點擊「開打」後先確認賽後摘要對話框,才能繼續斷言後續的畫面狀態。

### References

- `docs/spec.md` §7(已同步更新)

## 8. 第五階段：補完球員個性(已實作)

### 隊長型

- 僅列為先發時生效。
- 提供小幅團隊有效戰力加成。
- 多名隊長不重複疊加，取一次效果。

### 抗壓型

- 僅在八強與四強階段生效。
- 提高該球員的有效比賽表現。
- 不直接修改永久屬性。

### 玻璃體質

- 保留較高受傷機率。
- 訓練骰面達 4～6 時提供額外成長收益，作為風險補償。
- 不提高全域屬性上限，避免 UI 和存檔同時出現不同能力上限。

### Acceptance criteria

- [x] 個性效果只在對應條件成立時生效。
- [x] 所有效果保持輕量且集中設定。
- [x] 個性效果可由測試獨立驗證。
- [x] 介面能說明個性目前是否生效。

### Implementation notes(已完成)

- `matchEngine.ts` 新增 `CAPTAIN_STRENGTH_BONUS`(隊長型)與 `CLUTCH_PERFORMANCE_BONUS`(抗壓型)兩個原創數值常數。`computeTeamStrength(roster, attributeWeights?, lineup?, clutchActive?)` 新增 `clutchActive` 參數:有 `lineup` 時,只要先發(`lineup.starters`)中存在 `personality === 'captain'` 的球員,就在加權平均結果上加一次 `CAPTAIN_STRENGTH_BONUS`(用 `.some(...)` 判斷,天生不重複疊加);`effectiveAttributeAverage` 新增 `clutchActive` 參數,`clutchActive` 為真且該球員 `personality === 'clutch'` 時,對其個人有效屬性平均乘上 `1 + CLUTCH_PERFORMANCE_BONUS`,不修改 `attributes` 本身。
- `officialMatch.ts` 新增 `isClutchPhase(phase)`(僅 `quarterfinal`/`final4` 回傳 `true`),`simulateOfficialGame` 呼叫 `computeMatchWinProbability` 時代入 `isClutchPhase(phase)`。`matchPreview.ts` 與 `App.tsx` 的 `buildGameSummaryDisplay` 都比照代入,讓賽前預覽與賽後摘要顯示的戰力和實際模擬一致。
- `weeklyAction.ts` 的 `personalityMultiplier` 新增 `roll` 參數:`personality === 'fragile'` 且 `roll >= 4` 時,套用 `FRAGILE_HIGH_ROLL_MULTIPLIER = 1.25`(原創數值),疊加在既有的骰面成長量上,不改動屬性上限 `ATTRIBUTE_MAX`。
- `matchPreview.ts` 的 `MatchPreview` 新增 `captainBonusActive`/`clutchBonusActive` 兩個布林欄位;`SeasonMatchScreen.tsx` 在賽前預覽區塊新增一行文字提示(「隊長效果生效中」/「抗壓機制生效中」),滿足「介面能說明個性目前是否生效」;玻璃體質的效果條件(骰面 4~6)已直接對應訓練彈窗既有的骰子點數顯示,不需要額外介面。

### Testing decisions(已完成)

- `matchEngine.test.ts`:`computeTeamStrength` 新增案例驗證隊長加成(單一隊長生效、兩名隊長不重複疊加、隊長只在輪替時不生效)與抗壓加成(`clutchActive` 為 false/true 時的戰力差異);既有的兩個精確數值案例補上 `personality: 'steady'` 避免被預設名冊中的隨機隊長/抗壓型球員干擾。
- `officialMatch.test.ts`:新增 `isClutchPhase` 案例驗證只有八強/四強回傳 `true`。
- `matchPreview.test.ts`:新增案例驗證 `captainBonusActive`/`clutchBonusActive` 依陣容與賽制階段正確切換。
- `weeklyAction.test.ts`:`computeTrainingRollGain` 新增案例驗證玻璃體質只在骰面 4 以上才有額外成長。

### References

- `docs/spec.md` §9(個性系統)

## 9. 第六階段：恢復能力與個別差異(已實作)

在增加第二條疲勞前，先評估較小的差異化方案：

- 球員恢復能力。
- 年級造成的恢復差異。
- 個性或傷後狀態影響恢復速度。
- 不同出賽角色的跨場負荷。

### Acceptance criteria

- [x] 不同球員在相同休息條件下可以有小幅恢復差異。
- [x] 恢復量可在賽前或名冊畫面預覽。
- [x] 恢復能力不與受傷抗性混為同一概念。
- [x] 差異不應大到使特定球員必然無法擔任主力。

### Implementation notes(已完成)

- `matchEngine.ts` 新增 `computeRecoveryRate(player)`:以 `hashSeed(player.id)` 對球員 id 做確定性雜湊,取得該球員終身固定、範圍 `±RECOVERY_INDIVIDUAL_VARIANCE`(原創數值 2)的個人恢復差異,再疊加 `RECOVERY_GRADE_DELTA`(原創數值:高一 +1、高二 0、高三 -1)的年級差異,最終疊加在 `BASELINE_RECOVERY`(10)之上。刻意不讀取 `personality`/`injuryStatus`,與玻璃體質既有的受傷機率效果(`FRAGILE_INJURY_MULTIPLIER`)完全獨立,避免混為同一概念。
- `applyFatigueDelta(player, load)` 改用 `computeRecoveryRate(player)` 取代原本寫死的 `BASELINE_RECOVERY`,所有透過 `advancePlayerWeek`(訓練、全隊休養、比賽)結算的每週恢復都自動套用個別差異,不需要另外修改呼叫端。
- 差異刻意壓在 ±3(個人差異 ±2、年級 ±1 的加總範圍)之內,相對於 `OFFICIAL_MATCH_LOAD`(20)等負荷量級很小,不足以讓特定球員必然無法或必然適合擔任主力。
- `RosterScreen.tsx` 的球員詳細資料彈窗新增「每週體力恢復 X 點」一行,滿足「恢復量可在名冊畫面預覽」。

### Testing decisions(已完成)

- `matchEngine.test.ts`:新增 `computeRecoveryRate` 案例驗證同一 id 恆定不變、差異落在宣告的個人差異範圍內、低年級恢復優於高年級、以及不受 `personality` 影響(與受傷抗性獨立);`applyFatigueDelta` 既有的精確數值案例改用 `computeRecoveryRate` 算出期望值,不再假設固定的 10。
- `RosterScreen.test.tsx`:新增案例驗證彈窗內顯示的恢復量文字與 `computeRecoveryRate` 算出的數值一致。

### References

- `docs/spec.md` §11(疲勞與受傷)

## 10. 暫緩：拆分兩種疲勞

目前不立即把單一 `fatigue` 拆成 `trainingEnergy` 與 `gameFatigue`。

只有在至少兩項條件成立後重新評估：

- 已有個別球員訓練方向。
- 訓練與比賽使用不同恢復方式。
- 已有球員恢復能力。
- 密集賽程需要明確的跨場管理。
- 單一疲勞已無法清楚表達實際決策。

若只是新增兩條同時下降、同時透過休養恢復的狀態條，將增加操作與理解成本，卻不會增加有效策略。

## 11. 跨年度學校成長

完成上述核心循環後，再加入學校層資產：

- 聲望等級與升級門檻。
- 招生範圍。
- 訓練設施。
- 恢復設施。
- 教練知識或訓練專長。

設計原則：

```text
贏球
→ 提升聲望與資源
→ 改善招生和培養環境
→ 提高下一屆競爭力
```

必須透過三年級畢業、設施成本與升級門檻控制數值膨脹。

初期不加入設備耐久，以免產生只有定期維修、沒有實質選擇的例行操作。

## 12. 延後內容

以下項目在核心循環完成前不實作：

- 名人堂完整畫面。
- 球星比對彩蛋。
- 成就與稱號。
- 宿敵校追蹤。
- 更多隨機事件卡。
- 設備耐久與維修。
- 逐節臨場操作。
- 完整對手球員名冊。
- 音效與 BGM。
- 多存檔及雲端同步。

## 13. 實作路線

```text
階段 1：正式賽實戰養成
    ↓
階段 2：賽前戰力、疲勞與風險預覽
    ↓
階段 3：保存陣容與改善選人操作
    ↓
階段 4：賽後球員變化摘要
    ↓
階段 5：補完球員個性
    ↓
階段 6：球員恢復能力
    ↓
重新評估是否需要拆分疲勞
    ↓
跨年度學校資產
```

每個階段應獨立完成：

1. 規格更新。
2. 網域測試。
3. 實作。
4. UI 測試。
5. 全套測試、建置與靜態檢查。
6. 規格與實作差異檢查。

## 14. 驗證策略

### 網域測試

- 相同種子產生相同結果。
- 先發平均成長高於輪替。
- 未上場球員不取得實戰成長。
- 疲勞預覽與實際結算一致。
- 基準勝率不消耗亂數。
- 陣容建議結果符合其排序目的。
- 個性效果只在指定條件生效。

### UI 測試

- 陣容選擇顯示必要資訊。
- 傷員不會被選入。
- 建議陣容仍可修改。
- 賽前資訊會隨陣容與戰術更新。
- 賽後摘要完整顯示狀態變化。

### 回歸驗證

每階段完成後執行：

```text
npm test
npm run build
npm run lint
```

## 15. 不變的產品邊界

- 純前端、無後端。
- 單機遊戲。
- 正式賽維持全自動模擬。
- 不做逐節體力與臨場換人。
- 不做完整對手名冊。
- 不做永久傷病後遺症。
- 不做防作弊或跨玩家競爭。

## 16. 參考資料

- `docs/prospi-hakkyuu-no-kiseki-gameplay-analysis.md`
- `docs/gameplay-improvement-recommendations.md`
- `docs/gameplay-improvement-specs.md`
- `docs/spec.md`
- `docs/spec-checklist.md`
