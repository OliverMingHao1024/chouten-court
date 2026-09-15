import type { ComponentPropsWithRef, ReactNode } from 'react'
import closeIcon from '../../assets/icons/pixel-v2/close.png'
import confirmIcon from '../../assets/icons/pixel-v2/confirm.png'
import continueIcon from '../../assets/icons/pixel-v2/continue.png'
import downloadIcon from '../../assets/icons/pixel-v2/download.png'
import hallOfFameIcon from '../../assets/icons/pixel-v2/hall-of-fame.png'
import menuIcon from '../../assets/icons/pixel-v2/menu.png'
import playGameIcon from '../../assets/icons/pixel-v2/play-game.png'
import quickResultIcon from '../../assets/icons/pixel-v2/quick-result.png'
import randomizeIcon from '../../assets/icons/pixel-v2/randomize.png'
import recruitIcon from '../../assets/icons/pixel-v2/recruit.png'
import restIcon from '../../assets/icons/pixel-v2/rest.png'
import restartIcon from '../../assets/icons/pixel-v2/restart.png'
import rosterIcon from '../../assets/icons/pixel-v2/roster.png'
import switchSaveIcon from '../../assets/icons/pixel-v2/switch-save.png'
import teamCreateIcon from '../../assets/icons/pixel-v2/team-create.png'
import trainingIcon from '../../assets/icons/pixel-v2/training.png'

export type PixelIconName =
  | 'close'
  | 'confirm'
  | 'continue'
  | 'download'
  | 'hall-of-fame'
  | 'menu'
  | 'play-game'
  | 'quick-result'
  | 'randomize'
  | 'recruit'
  | 'rest'
  | 'restart'
  | 'roster'
  | 'switch-save'
  | 'team-create'
  | 'training'

const icons: Record<PixelIconName, string> = {
  close: closeIcon,
  confirm: confirmIcon,
  continue: continueIcon,
  download: downloadIcon,
  'hall-of-fame': hallOfFameIcon,
  menu: menuIcon,
  'play-game': playGameIcon,
  'quick-result': quickResultIcon,
  randomize: randomizeIcon,
  recruit: recruitIcon,
  rest: restIcon,
  restart: restartIcon,
  roster: rosterIcon,
  'switch-save': switchSaveIcon,
  'team-create': teamCreateIcon,
  training: trainingIcon,
}

export type PixelButtonProps = ComponentPropsWithRef<'button'> & {
  children: ReactNode
  icon: PixelIconName
  iconOnly?: boolean
}

export interface PixelIconProps {
  icon: PixelIconName
  className?: string
}

export function PixelIcon({ icon, className = '' }: PixelIconProps) {
  return (
    <img
      className={`pixel-icon${className ? ` ${className}` : ''}`}
      src={icons[icon]}
      alt=""
      aria-hidden="true"
      data-pixel-icon={icon}
    />
  )
}

export function PixelButton({ children, className = '', icon, iconOnly = false, ...props }: PixelButtonProps) {
  return (
    <button
      className={`pixel-button${iconOnly ? ' pixel-button--icon-only' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      <PixelIcon className="pixel-button__icon" icon={icon} />
      <span className={iconOnly ? 'sr-only' : 'pixel-button__label'}>{children}</span>
    </button>
  )
}
