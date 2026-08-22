export const SCHOOL_ASSET_KEYS = [
  'scoutingNetwork',
  'videoAnalysis',
  'trainingFacility',
  'recoveryCenter',
  'coachSpecialization',
] as const
export type SchoolAssetKey = (typeof SCHOOL_ASSET_KEYS)[number]

export const SCHOOL_ASSET_LABELS: Record<SchoolAssetKey, string> = {
  scoutingNetwork: '球探網',
  videoAnalysis: '影片分析室',
  trainingFacility: '訓練館',
  recoveryCenter: '恢復中心',
  coachSpecialization: '教練專精',
}

export const SCHOOL_ASSET_DESCRIPTIONS: Record<SchoolAssetKey, string> = {
  scoutingNetwork: '招生候選人數翻倍,選才空間更大。',
  videoAnalysis: '不論目前聲望高低,永遠能看到對手球探情資。',
  trainingFacility: '每週最多可選訓練卡數 +1。',
  recoveryCenter: '全隊每週體力恢復量 +2。',
  coachSpecialization: '個別訓練可教學的特殊能力清單多 1 項。',
}

// 聲望達到門檻永久解鎖對應資產(原創數值,待調校)。跟訓練點數/招生候選池等連續內插不同,
// 這裡刻意做成一次性、不可逆的門檻解鎖——呼應「永久學校資產」的設計精神:解鎖後即使聲望
// 之後下降也不會收回,是球隊長期經營留下的痕跡,不是隨聲望即時浮動的狀態。
export const SCHOOL_ASSET_REPUTATION_THRESHOLD: Record<SchoolAssetKey, number> = {
  scoutingNetwork: 60,
  videoAnalysis: 70,
  trainingFacility: 55,
  recoveryCenter: 65,
  coachSpecialization: 75,
}

/** 依目前聲望重新評估解鎖狀態;已解鎖的資產一律保留,只會增加不會移除。 */
export function evaluateSchoolAssetUnlocks(current: SchoolAssetKey[], reputation: number): SchoolAssetKey[] {
  const unlocked = new Set(current)
  for (const key of SCHOOL_ASSET_KEYS) {
    if (reputation >= SCHOOL_ASSET_REPUTATION_THRESHOLD[key]) unlocked.add(key)
  }
  return SCHOOL_ASSET_KEYS.filter((key) => unlocked.has(key))
}

export function hasSchoolAsset(assets: SchoolAssetKey[], key: SchoolAssetKey): boolean {
  return assets.includes(key)
}

/** 這次聲望變動新解鎖的資產(用來組賽後/事件訊息的一句話播報),沒有新解鎖時回傳空陣列。 */
export function newlyUnlockedAssets(previous: SchoolAssetKey[], next: SchoolAssetKey[]): SchoolAssetKey[] {
  return next.filter((key) => !previous.includes(key))
}
