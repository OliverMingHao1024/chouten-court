// 純程式運算生成戰績分享卡,不依賴外部美術資源或圖片產生 API。
export interface ShareCardData {
  teamName: string
  coachName: string
  headline: string
  totalSeasons: number
  totalWins: number
  totalLosses: number
  bestPlacementLabel: string
}

export function renderCareerShareCard(data: ShareCardData): string {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#1c1712'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#ff9a5a'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText('頂点コート — 生涯總結', 48, 60)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText(data.teamName, 48, 130)

  ctx.font = '24px sans-serif'
  ctx.fillText(`教練:${data.coachName}`, 48, 175)

  ctx.fillStyle = '#ff9a5a'
  ctx.font = 'bold 32px sans-serif'
  ctx.fillText(data.headline, 48, 250)

  ctx.fillStyle = '#ffffff'
  ctx.font = '26px sans-serif'
  ctx.fillText(`生涯戰績:${data.totalWins} 勝 ${data.totalLosses} 敗`, 48, 320)
  ctx.fillText(`共執教 ${data.totalSeasons} 個賽季`, 48, 360)
  ctx.fillText(`歷屆最佳戰績:${data.bestPlacementLabel}`, 48, 400)

  return canvas.toDataURL('image/png')
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
