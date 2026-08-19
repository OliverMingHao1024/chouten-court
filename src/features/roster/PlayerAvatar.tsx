import { createAvatar } from '@dicebear/core'
import { bigSmile } from '@dicebear/collection'
import { useMemo } from 'react'
import './PlayerAvatar.css'

export interface PlayerAvatarProps {
  seed: string
  size?: number
}

export function PlayerAvatar({ seed, size = 48 }: PlayerAvatarProps) {
  const dataUri = useMemo(() => {
    const svg = createAvatar(bigSmile, { seed }).toString()
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }, [seed])

  return <img className="player-avatar" src={dataUri} width={size} height={size} alt="" />
}
