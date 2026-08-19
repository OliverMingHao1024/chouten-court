export const SURNAMES = [
  '陳',
  '林',
  '黃',
  '張',
  '李',
  '王',
  '吳',
  '劉',
  '蔡',
  '楊',
  '許',
  '鄭',
  '謝',
  '洪',
  '郭',
] as const

export const GIVEN_NAMES = [
  '志明',
  '建宏',
  '俊傑',
  '家豪',
  '承恩',
  '冠宇',
  '柏翰',
  '宗翰',
  '育誠',
  '振宇',
] as const

export function generateCoachName(rng: () => number): string {
  const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)]
  const given = GIVEN_NAMES[Math.floor(rng() * GIVEN_NAMES.length)]
  return `${surname}${given}`
}
