# `chouten-court` 遊戲性改善規格書

> ⚠️ **已被取代，不代表現況（僅供歷史存查）**：本文件已被後續的 `docs/basketball-gameplay-improvement-plan.md`（第 1-6 階段，已全數實作）取代，且部分內容已明確過時——例如文中「captain 與 clutch 個性目前只是標籤，沒有任何遊戲效果」「玻璃體質尚未實作成長優勢」等描述已不成立，這些效果都已在後續階段補上（見 `matchEngine.ts` 的 `CAPTAIN_STRENGTH_BONUS`、`CLUTCH_PERFORMANCE_BONUS`、fragile 訓練骰面加成）。**請勿依本文件內容做判斷或實作決策**，請改看 `docs/basketball-gameplay-improvement-plan.md`。

> 依 `docs/gameplay-improvement-recommendations.md`（2026-08-20）逐項展開為可驗收的規格。
> 已省略該文件第 9 節列出的暫緩項目（名人堂、成就、宿敵校追蹤等）。
> 建議實作順序依原文件第 10 節，各節之間的依賴關係已在各自的「實作決策」註明。

## 目錄

1. [先發與輪替陣容（已實作）](#1-先發與輪替陣容已實作)
2. [上場角色帶來實戰養成](#2-上場角色帶來實戰養成)
3. [拆分訓練狀態與比賽負荷](#3-拆分訓練狀態與比賽負荷)
4. [可靠的恢復選擇(已實作,並簡化拿掉風險強度)](#4-可靠的恢復選擇)
5. [賽前賽後資訊透明度](#5-賽前賽後資訊透明度)
6. [補完既有球員個性效果](#6-補完既有球員個性效果)
7. [訓練骰子規則修正（已定案）](#7-訓練骰子規則修正已定案)

---

## 1. 先發與輪替陣容(已實作)

### Decision
開放問題已由使用者裁定:**先發權重6:輪替權重3:未上場不計入**;**可上場球員不足8人時自動補滿先發/輪替**(不阻擋開打);**練習賽維持全名冊平均**,不需選陣容。

### Problem
目前比賽戰力由 `computeTeamStrength`（`matchEngine.ts`）將所有健康球員的屬性平均計算，未區分先發、輪替或未出賽球員。板凳深度、位置配置與出賽時間分配目前完全不影響比賽結果。

### Outcome
每場正式賽開打前，教練從當下可上場（非輕傷/重傷）名冊中選出 5 名先發與最多 3 名主要輪替球員。隊伍戰力改由先發與輪替加權計算，未入選球員不計入戰力，且獲得完整恢復而非承受比賽負荷。

### User stories
1. 身為教練，我想選擇先發與輪替名單，讓陣容安排真正影響勝負。
2. 身為教練，我想讓沒上場的球員恢復體力，讓「讓誰休息」變成一個看得到代價與回報的決策。

### Acceptance criteria
- [x] 正式賽開打前，教練可從可上場球員中選出先發與主要輪替；未選滿的名額在按下「開打」時自動依序補上其餘可上場球員，不阻擋開打。
- [x] 隊伍戰力 = 先發有效屬性 × 6 + 主要輪替有效屬性 × 3 的加權平均；未入選球員不計入戰力。
- [x] 既有戰術權重（`computeTacticAttributeWeights`）與疲勞/復出折扣，疊加在先發/輪替權重之上，而非取代它。
- [x] 先發承受完整 `OFFICIAL_MATCH_LOAD` 負荷；主要輪替負荷減半；未入選球員本場淨恢復，且不參與該場受傷判定。
- [x] `SeasonMatchScreen` 在「開打」按鈕前新增陣容選擇 UI。

### Implementation decisions（已完成）
- 新增 `src/domain/lineup.ts`：`GameLineup { starters: string[]; rotation: string[] }`、`STARTER_WEIGHT=6`/`ROTATION_WEIGHT=3`、`lineupRole`/`lineupWeight`、`completeLineup`（自動補滿邏輯）。
- `matchEngine.ts` 的 `computeTeamStrength`/`computeMatchWinProbability` 新增可選 `lineup` 參數：提供時依角色加權平均（總權重為 0 時安全退回未加權平均）；表現變異度計算（`computePerformanceVarianceRange`）也改為只看實際上場（先發+輪替）的個性組成。
- `officialMatch.ts` 的 `simulateOfficialGame` 新增 `lineup` 參數：先發套用 `OFFICIAL_MATCH_LOAD`、輪替套用 `ROTATION_MATCH_LOAD`（一半）、未上場套用 0 負荷且不判定受傷。
- `season.ts` 的 `advanceSeasonWeek` 新增 `lineup` 參數並往下傳遞。
- `SeasonMatchScreen.tsx` 新增 `players` prop 與陣容選擇網格（點擊球員在「先發→輪替→未選」間循環），送出時呼叫 `completeLineup` 自動補滿。
- `App.tsx` 傳遞 `team.players` 給 `SeasonMatchScreen`，並把選定的 `lineup` 傳入 `advanceSeasonWeek`。

### Testing decisions（已完成）
- `lineup.test.ts`：`lineupRole`/`lineupWeight`/`completeLineup`（含自動補滿、忽略不存在球員、先發輪替不重複）。
- `matchEngine.test.ts`：陣容加權戰力（先發 > 輪替 > 排除未上場）、空陣容安全退回、表現變異度只看上場名單。
- `officialMatch.test.ts`：先發/輪替/未上場各自的負荷差異、未上場球員不掉疲勞。
- `season.test.ts`：所有既有情境補上陣容參數。
- `SeasonMatchScreen.test.tsx`：陣容選擇互動（點選循環、自動補滿、確認時傳出正確的 lineup）。

### Out of scope
- 練習賽陣容選擇（已裁定維持全名冊平均）。
- 不做逐節/中途換人（維持 `docs/spec.md` §22 「不做逐場/逐節體力管理」的既有邊界）。

### References
- `docs/gameplay-improvement-recommendations.md` §2、§10（優先順序 1）
- `docs/spec.md` §7（已同步更新）
- 既有模式參照：本次對話中 `tactics.ts` 串接 `officialMatch.ts` / `season.ts` / `SeasonMatchScreen.tsx` 的作法

---

## 2. 上場角色帶來實戰養成

### Problem
正式賽目前完全不產生屬性成長（`officialMatch.test.ts` 明確斷言此行為）。玩家因此沒有誘因犧牲短期戰力去培養低年級球員，「打現在」與「養未來」之間沒有真實張力。

### Outcome
每場正式賽結算後，依出賽角色給予不同幅度/機率的屬性成長：先發最高、主要輪替中等、未出賽球員不成長。

### User stories
1. 身為教練，我想讓出賽時間真的影響球員成長，讓「給新人上場機會」成為一個實質投資而非免費選項。

### Acceptance criteria
- [ ] 正式賽結算後，先發球員獲得成長的機率/幅度最高，主要輪替次之，未出賽球員為零。
- [ ] 成長套用在隨機屬性或當週訓練重點（待確認，見下方），維持原文件建議的「不建立複雜經驗值系統」的輕量原則。
- [ ] 明確取代既有「正式賽不產生屬性成長」的行為與對應測試斷言——這是刻意的行為變更，不是回歸缺陷。

### Implementation decisions
- 依賴第 1 項（陣容）先落地，因為成長資格需要知道誰是先發/輪替/未上場。
- 可能在 `officialMatch.ts` 新增函式，或重用 `weeklyAction.ts` 既有的成長擲骰模式，於比賽結果確定後套用。

### Testing decisions
- 比照 `matchEngine.test.ts` / `weeklyAction.test.ts` 既有的多次取樣統計手法，驗證先發 > 輪替 > 未出賽的平均成長量。

### Out of scope
- 完整經驗值/等級系統——原文件明確列為之後再談（「初期不必建立複雜的經驗值等級」）。

### Assumptions and open questions
- **成長數值/機率未定**：原文件明確表示留待遊戲測試後再調校。
- **成長套用在哪個屬性**：隨機屬性，還是當週訓練重點？待確認。
- 此項會讓 `docs/spec.md` §7 目前隱含的「正式賽不產生成長」敘述失效，實作時應同步更新 spec.md，比照本次對話已建立的「spec 與程式碼同步」慣例。

### References
- `docs/gameplay-improvement-recommendations.md` §3、§10（優先順序 2）
- 依賴：第 1 項（先發與輪替陣容）

---

## 3. 拆分訓練狀態與比賽負荷

### Problem
`Player` 目前只有單一 `fatigue` 欄位，同時代表訓練疲勞、近期比賽負荷、受傷風險與比賽表現折損。這讓不同成因的疲勞難以被玩家理解，也限制了恢復策略的設計空間。

### Outcome
`Player.fatigue` 拆分為 `trainingEnergy`（影響訓練成功率/成長）與 `gameFatigue`（影響比賽表現與受傷風險）兩個獨立數值。

### User stories
1. 身為教練，我想分別看到訓練精力與比賽體力，判斷球員是「不適合訓練」還是「不適合上場」，並據此調整安排。

### Acceptance criteria
- [ ] `Player` 改為攜帶 `trainingEnergy` 與 `gameFatigue`，取代單一 `fatigue`。
- [ ] 訓練成功率與成長讀取 `trainingEnergy`，套用與現行 `fatigue` 相同的強度/恢復負荷模型。
- [ ] 比賽表現折損（`FATIGUE_PERFORMANCE_PENALTY`）與受傷機率（`injuryProbability`）讀取 `gameFatigue`，並受出賽角色（第1項）、賽程密度、休養選擇（第4項）影響。
- [ ] 舊存檔（單一 `fatigue` 欄位）依專案既有慣例被版本比對拒絕載入，不做欄位遷移。

### Implementation decisions
- 影響範圍涵蓋 `types.ts`、`matchEngine.ts`（`applyFatigueDelta`、`injuryProbability`、`effectiveAttributeAverage`）、`weeklyAction.ts`、`roster.ts`、`recruiting.ts`、`saveData.ts`（`SAVE_FORMAT_VERSION` 需再遞增）,以及目前顯示疲勞條的所有 UI（`FatigueBar.tsx`、`RosterScreen.tsx`）。
- 建議在第 1 項（先發/輪替）確定後再實作，因為 `gameFatigue` 的負荷量直接依賴先發/輪替/未上場角色。

### Testing decisions
- 比照現有 `matchEngine.test.ts` 疲勞相關測試，依新欄位拆分為兩條測試路徑。
- 若名冊畫面同時顯示兩種數值，需補對應的 UI 測試。

### Out of scope
- 不改動 0～100 的量表範圍或受傷機率公式本身，只重新配置哪個數值餵進哪個公式。

### Assumptions and open questions
- **UI 呈現方式未定**：頭像下方兩條獨立體力條、單一指標搭配明細提示，或其他呈現方式，待確認；本次對話已完成的 `FatigueBar`（全綠、往左消退）設計需要擴充或另建一份。
- **明確依賴**：原文件本身即說明此項應在第 1 項確定後再做，避免先建立暫時用不到的欄位。

### References
- `docs/gameplay-improvement-recommendations.md` §4
- 依賴：第 1 項（先發與輪替陣容）

---

## 4. 可靠的恢復選擇(已實作)

### Decision
開放問題已由使用者裁定,方向比原文件的「四選項」更進一步:**乾脆整個拿掉風險強度這個維度**,不是「正常訓練/低強度調整」兩個選項並存。理由是每週決策選項太多會讓玩家覺得麻煩。最終決策:
- 訓練不再選風險強度,直接點屬性即開始,成長量改成直接依骰子點數對應(不是另外判定成功/失敗的機率黑箱)。
- 新增「全隊休養」做為第三個週行動,不練習、沒有成長,換取確定且比訓練更大的體力恢復。
- 事件卡維持現有的偶發疲勞調劑角色,不變。

### Problem
目前唯一能降低疲勞的方式是選擇低風險訓練檔位，或寄望於能恢復疲勞的隨機事件卡。玩家沒有穩定、可主動選擇的休養手段，導致「高風險訓練的代價」有一部分來自運氣而非決策。

### Outcome
非賽季每週行動選單從「訓練 / 練習賽」兩項擴充為三項：訓練(單一動作,無風險強度選擇)、全隊休養、練習賽。

### User stories
1. 身為教練，我想要一個保證能恢復體力的選項，讓我能在高強度使用球員後主動安排休養，而不用依賴隨機事件卡。
2. 身為教練，我不想每週訓練都要多選一個風險強度,決策選項越少越好。

### Acceptance criteria
- [x] 非賽季每週行動選項變為：訓練(點屬性即開始)、全隊休養、練習賽。
- [x] 全隊休養：不產生任何屬性成長，換取全隊**確定**（非機率性）的體力恢復。
- [x] 訓練不再有風險強度選擇；成長量直接由骰子點數對應（1點不成長,2~3點小幅成長,4~5點中幅成長,6點「會心一擊」成長最多）。
- [x] 訓練負荷固定，不再依風險強度變動；疲勞消耗不受骰子結果影響。

### Implementation decisions(已完成)
- `weeklyAction.ts`:移除 `TrainingIntensity` 與所有風險強度相關常數(`TRAINING_GROWTH`/`TRAINING_SUCCESS_ROLL_THRESHOLD`/`TRAINING_INTENSITY_LABELS`/`TRAINING_SUCCESS_RATE`);新增 `ROLL_GROWTH` 骰子點數對應成長量表、固定的 `TRAINING_LOAD`;`applyTraining(roster, attribute, seed)` 拿掉 `intensity` 參數;`computeTrainingRollGain` 取代原本的 `computeTrainingSuccessGain`。
- 新增 `applyTeamRest(roster, seed)`:未上場球員維持既有的「缺賽只倒數傷勢」處理,其餘球員套用固定的 `TEAM_REST_LOAD`(負值,保證比訓練更大的淨恢復)。
- `WeekScreen.tsx`:拿掉「訓練/練習賽」進入按鈕與風險強度子選單,改成永遠顯示的屬性按鈕列(點擊即觸發 `onTrain`)+「全隊休養」按鈕(直接觸發 `onTeamRest`)+「練習賽」進入按鈕(仍需二次選擇對手強度,保留原本的子選單互動)。
- `TrainingResultDialog.tsx`:拿掉 `intensityLabel`,彈窗標題改顯示訓練重點(`本週練習重點:{attributeLabel}`)。
- `App.tsx`:新增 `runTeamRestWeek`,`runTrainingWeek` 拿掉 `intensity` 參數。

### Testing decisions(已完成)
- `weeklyAction.test.ts`:`computeTrainingRollGain`(依骰子點數遞增、1點不成長)、`applyTraining`(固定負荷、骰子直接決定成長)、`applyTeamRest`(確定恢復量、不影響屬性、缺賽球員排除)。
- `WeekScreen.test.tsx`:屬性按鈕點擊即直接呼叫 `onTrain`、全隊休養按鈕直接呼叫 `onTeamRest`、練習賽子選單互動不變。
- `TrainingResultDialog.test.tsx`:更新彈窗標題斷言,移除風險強度相關斷言。

### Out of scope
- 不變動練習賽本身的機制。

### References
- `docs/gameplay-improvement-recommendations.md` §5
- `docs/spec.md` §6(已同步更新)
- 取代第 7 項描述的風險強度骰子機制(見下方第 7 項的補充說明)

---

## 5. 賽前賽後資訊透明度

### Problem
玩家目前看不到「為什麼」比賽會打成這樣：沒有預估勝率、看不到疲勞造成的戰力折損、沒有受傷風險提示，也無法分辨結果究竟來自陣容、戰術、疲勞還是純粹隨機波動。

### Outcome
`SeasonMatchScreen` 在賽前顯示預估勝率（或戰力對比）、疲勞造成的戰力折損、每位先發/輪替球員的預估疲勞變化、高受傷風險警示、以及戰術對本場屬性權重的影響；賽後顯示實際上場名單、每位球員的疲勞/恢復變化、獲得成長的球員，以及新發生傷病的主要成因。

### User stories
1. 身為教練，我想在確定陣容與戰術前看到預估勝率與風險，讓賽前決策有依據而非盲猜。
2. 身為教練，我想看到賽後的詳細變化，判斷一場敗仗是運氣不好還是陣容排錯。

### Acceptance criteria
- [ ] 賽前面板顯示：預估勝率（或等效戰力對比）、疲勞造成的戰力折損、每位先發/輪替球員的預估賽後疲勞、超過風險門檻球員的高受傷風險標示。
- [ ] 賽前面板顯示：目前選擇的戰術如何加權本場屬性。
- [ ] 賽後摘要顯示：實際上場名單、每位球員的疲勞/恢復變化量、取得成長的球員（第2項）、新傷病（若發生）的主要成因（疲勞程度）。

### Implementation decisions
- 主要是在既有（以及第1、2項新增的）網域函式之上疊加的 UI/呈現層；需要把目前僅供內部使用的 `computeWinProbability` / `computeMatchWinProbability` 與傷病機率相關數值，轉為可供畫面顯示的形式。

### Testing decisions
- 元件測試驗證賽前面板呈現預期欄位、賽後摘要呈現預期的變化量。

### Out of scope
- 不改動底層隨機性或公式本身——純粹是把既有（或第1、2項新增的）內部計算結果攤開給玩家看。

### Assumptions and open questions
- 依賴第 1、2 項先落地，因為要顯示的欄位（依角色的負荷、依角色的成長）在那之前並不存在。
- 「高受傷風險」的門檻數值未定。

### References
- `docs/gameplay-improvement-recommendations.md` §6
- 依賴：第 1 項、第 2 項

---

## 6. 補完既有球員個性效果

### Problem
`captain` 與 `clutch` 個性目前只是 `types.ts` 裡的標籤，沒有任何遊戲效果，儘管 `docs/spec.md` §9 已描述預期效果。`fragile` 已實作較高受傷率的缺點，但尚未實作規格書提到的成長優勢，使其成為純負面個性。

### Outcome
- `captain`：僅在該球員被列入先發或主要輪替時，提供小幅團隊恢復或表現加成。
- `clutch`：在八強賽與四強賽階段提供小幅個人表現加成。
- `fragile`：提高屬性成長上限（或等效優勢），對應 spec.md §9 原始設計意圖，抵銷其較高的受傷機率係數。

### User stories
1. 身為教練，我想讓隊長型球員的在場與否真的有差別，讓選人與排陣容時個性標籤是實質策略考量，而不只是風味文字。

### Acceptance criteria
- [ ] 隊長型球員只在被選為先發或主要輪替時，對球隊產生明確定義的小幅加成（恢復或表現）。
- [ ] 抗壓型球員在 `quarterfinal` / `final4` 階段的有效表現有可量測的提升。
- [ ] 玻璃體質球員在其他條件相同下，屬性成長上限（或單次訓練成功成長量）明顯高於非玻璃體質球員。

### Implementation decisions
- 隊長型效果依賴第 1 項（陣容）以得知誰是先發/輪替。
- 抗壓型效果可直接加在 `matchEngine.ts` 或現有計算球員有效戰力之處，針對 `quarterfinal`/`final4` 階段生效。
- 玻璃體質的成長上限，可能是針對該個性覆寫 `ATTRIBUTE_MAX`，或在 `computeTrainingSuccessGain` 給予額外倍率。

### Testing decisions
- 比照本次對話已建立的個性效果測試模式（例如 `matchEngine.test.ts` 中既有的玻璃體質受傷率測試），逐一個性補上對應單元測試。

### Out of scope
- `steady` / `genius` / `scorer` 已確認實作完成（見本次對話的 spec-checklist 驗證結果），本項不涉及。

### Assumptions and open questions
- 僅隊長型效果依賴第 1 項；抗壓型與玻璃體質的成長上限沒有此依賴，可獨立先行。
- 加成數值未定，原文件要求「初期都應保持輕量」。

### References
- `docs/gameplay-improvement-recommendations.md` §7
- `docs/spec.md` §9
- 依賴（僅隊長型）：第 1 項

---

## 7. 訓練骰子規則修正（已定案）

### Problem
`docs/spec.md` §6 與程式碼原有註解都描述「每位可訓練球員各自擲一顆 1～6 的骰子」。本次對話較早前，依使用者明確要求（「全部人都共用同一個骰子的結果」），一度把 `applyTraining` 改成全隊共用一顆骰子。`docs/gameplay-improvement-recommendations.md` §8 是針對*原始*的每人各擲版本寫成的，並指出共用骰子版本是需要修正的不一致之處。

在確認本規格書時，使用者已針對這兩個互相矛盾的指示做出裁決。

### Decision
**採用方案 (A)：改回每人各擲一顆骰子。** 每位可訓練球員各自消耗一次決定論亂數，個別判定成功、失敗與會心一擊；成功與否不再全隊一致。

### Outcome
- `weeklyAction.ts` 的 `applyTraining` 已改回：在名冊迭代中逐一擲骰，`PlayerRoll` 保留個別 `roll` 欄位。
- `TrainingResultDialog.tsx` 已改回逐人骰子呈現：每位出勤球員各自一顆骰子、各自的滾動與停止動畫（沿用 yakyulife 風格的翻滾與分批停止節奏），取代先前的單一共用骰子畫面。骰子視覺本身升級為立體點數骰子（3×3 圓點排列 + 漸層/陰影），與先前針對「更立體、更像現實骰子」的要求相容。

### Acceptance criteria
- [x] `docs/spec.md` §6、`weeklyAction.ts` 的註解，以及訓練結果畫面的實際語意三者一致，皆描述「每人各擲」。
- [x] `weeklyAction.test.ts` 驗證每位球員的 `roll`/`succeeded` 各自獨立，而非共用同一值。
- [x] `TrainingResultDialog.test.tsx` 驗證每位球員各自的骰子面與成功/失敗標記互不相同。

### Implementation decisions（已完成）
- `weeklyAction.ts`：`roll`/`succeeded` 判定移回 `roster.map` 內部逐一計算；`TrainingResult` 不再有全隊共用的頂層 `roll` 欄位。
- `App.tsx`：`runTrainingWeek` 對應改回把每位球員各自的 `roll` 傳入 `TrainingResultDialog`。
- `TrainingResultDialog.tsx`：改為骰子網格，每顆骰子（`TrainingDie` 子元件）各自管理滾動狀態，以 `settleDelayMs = index * 90ms` 錯開停止時間，維持 yakyulife 的分批停止觀感；骰子視覺沿用本次對話稍早完成的立體點數設計。

### Testing decisions（已完成）
- `weeklyAction.test.ts` 的「rolls an actual 1~6 die per trained player」與「gives a rolled 6 a critical bonus」兩個測試已改回逐人斷言版本。
- `TrainingResultDialog.test.tsx` 已改為驗證每顆骰子的點數與成功/失敗標記可以互不相同。

### Out of scope
- 骰子動畫的視覺風格（立體點數、翻滾、會心一擊閃爍）不受這次規則方向影響，兩種方案都可以套用同一套視覺。

### References
- `docs/gameplay-improvement-recommendations.md` §8
- `docs/spec.md` §6
- 本次對話：先前將此規則改為共用骰子、隨後依使用者決議改回每人各擲的完整過程

### 後續補充(已併入第 4 項)
本節定案後,訓練系統又再簡化一次:**風險強度(保守應對/照常執行/全力一搏)整個拿掉**,成長量改成直接依骰子點數對應,不再有依強度而定的門檻值。「每人各擲一顆骰子」這個結論不變,但「依強度設門檻值判定成功」已不存在。詳見第 4 項。
