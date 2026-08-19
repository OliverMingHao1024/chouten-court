// 混合全台各地地名與「寓意雙字」命名風格(參考歷屆HBL球隊常見的校名結構,例如「南山」
// 「新榮」「能仁」這類雙字專有名詞,不是單純地名+後綴)。刻意不含現有HBL球隊的實際全名,
// 地理範圍涵蓋北中南東,不偏重單一區域。
export const REGIONS = [
  // 北部
  '板橋',
  '三重',
  '新莊',
  '林口',
  '汐止',
  '內湖',
  '中壢',
  '竹北',
  // 中部
  '豐原',
  '大甲',
  '員林',
  '太平',
  '沙鹿',
  '斗六',
  // 南部
  '岡山',
  '鳳山',
  '左營',
  '永康',
  '朴子',
  '新營',
  // 東部
  '花蓮',
  '羅東',
  '宜蘭',
  '玉里',
  // 寓意雙字
  '崇仁',
  '明道',
  '至善',
  '育英',
  '光華',
  '中興',
  '崇德',
  '樹人',
  '文德',
  '新興',
  '力行',
] as const

export const SUFFIXES = ['高中', '高工', '商工', '家商', '附中', '實中'] as const

export function generateOpponentName(rng: () => number): string {
  const region = REGIONS[Math.floor(rng() * REGIONS.length)]
  const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)]
  return `${region}${suffix}`
}
