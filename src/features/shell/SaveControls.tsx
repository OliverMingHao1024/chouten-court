import { useRef } from 'react'
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
          <button type="button" className="save-controls__button" onClick={onExport}>
            匯出存檔
          </button>
          <button type="button" className="save-controls__button" onClick={() => fileInputRef.current?.click()}>
            匯入存檔
          </button>
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
      <button type="button" className="save-controls__button" onClick={onSwitchSlot}>
        切換存檔
      </button>
      <button type="button" className="save-controls__button save-controls__button--danger" onClick={onNewGame}>
        重新開始
      </button>
    </div>
  )
}
