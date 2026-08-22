import type { SaveSlotMeta } from '../../domain/saveData'
import './SaveSlotScreen.css'

export interface SaveSlotScreenProps {
  slots: SaveSlotMeta[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
}

function formatUpdatedAt(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function SaveSlotScreen({ slots, onLoad, onDelete, onCreateNew }: SaveSlotScreenProps) {
  const sorted = [...slots].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="save-slots">
      <div className="save-slots__hero">
        <p className="save-slots__emoji" aria-hidden="true">
          🏀
        </p>
        <h1 className="save-slots__title">選擇存檔</h1>
        <p className="save-slots__subtitle">每個存檔各自獨立,可以同時帶好幾支球隊。</p>
      </div>
      <ul className="save-slots__list">
        {sorted.map((slot) => (
          <li key={slot.id} className="save-slots__item">
            <button type="button" className="save-slots__load" onClick={() => onLoad(slot.id)}>
              <span className="save-slots__label">{slot.label}</span>
              <span className="save-slots__updated">最後更新:{formatUpdatedAt(slot.updatedAt)}</span>
            </button>
            <button
              type="button"
              className="save-slots__delete"
              aria-label={`刪除存檔:${slot.label}`}
              onClick={() => {
                if (window.confirm(`確定要刪除存檔「${slot.label}」嗎?此操作無法復原。`)) onDelete(slot.id)
              }}
            >
              刪除
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="button-primary" onClick={onCreateNew}>
        新增存檔
      </button>
    </div>
  )
}
