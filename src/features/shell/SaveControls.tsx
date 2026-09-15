import { useRef } from 'react'
import { PixelButton } from '../shared/PixelButton'
import './SaveControls.css'

export interface SaveControlsProps {
  onExport: () => void
  onImport: (file: File) => void
  onNewGame: () => void
  onSwitchSlot: () => void
}

// 匯出/匯入先隱藏(功能保留,UI 先不露出),之後要恢復只需拿掉這個開關。
const EXPORT_IMPORT_ENABLED = false

export function SaveControls({ onExport, onImport, onNewGame, onSwitchSlot }: SaveControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="save-controls">
      {EXPORT_IMPORT_ENABLED && (
        <>
          <PixelButton type="button" className="save-controls__button" icon="download" onClick={onExport}>
            匯出存檔
          </PixelButton>
          <PixelButton type="button" className="save-controls__button" icon="switch-save" onClick={() => fileInputRef.current?.click()}>
            匯入存檔
          </PixelButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="save-controls__file-input"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) onImport(file)
            }}
          />
        </>
      )}
      <PixelButton type="button" className="save-controls__button" icon="switch-save" onClick={onSwitchSlot}>
        切換存檔
      </PixelButton>
      <PixelButton type="button" className="save-controls__button save-controls__button--danger" icon="restart" onClick={onNewGame}>
        重新開始
      </PixelButton>
    </div>
  )
}
