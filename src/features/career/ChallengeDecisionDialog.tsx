import { useEffect, useRef } from 'react'
import './ChallengeDecisionDialog.css'

export interface ChallengeDecisionDialogProps {
  open: boolean
  onContinue: () => void
  onEnd: () => void
}

/**
 * 三年挑戰模式的里程碑提示:非阻斷式,玩家在這之前的其他畫面(訓練/招生等)仍可正常操作,
 * 直到點開這個對話框才需要決定。選「繼續」之後不會再跳出這個提示,等同轉為長期生涯。
 */
export function ChallengeDecisionDialog({ open, onContinue, onEnd }: ChallengeDecisionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) dialogRef.current?.showModal()
  }, [open])

  return (
    <dialog ref={dialogRef} className="challenge-decision-dialog">
      <div className="challenge-decision-dialog__content">
        <h2>三年挑戰完成</h2>
        <p>你已經帶領這支球隊走過三年。要在此為這段故事畫下句點,寫進校史,還是繼續帶下去?</p>
        <div className="challenge-decision-dialog__actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              dialogRef.current?.close()
              onContinue()
            }}
          >
            繼續帶下去
          </button>
          <button
            type="button"
            className="challenge-decision-dialog__end"
            onClick={() => {
              dialogRef.current?.close()
              onEnd()
            }}
          >
            在此結束,寫進校史
          </button>
        </div>
      </div>
    </dialog>
  )
}
