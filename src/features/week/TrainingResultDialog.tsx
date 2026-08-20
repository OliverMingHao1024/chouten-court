import { useEffect, useRef, useState } from 'react'
import './TrainingResultDialog.css'

// 3x3 骰子點數配置(左到右、上到下),true 代表該格有一個點,參考現實骰子的點位排列。
const PIP_LAYOUTS: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
}

// 參考 yakyulife 的骰子動畫節奏:每 70ms 隨機換一次面,每顆骰子依序分批停止(每顆間隔 90ms)。
const ROLL_TICK_MS = 70
const ROLL_SETTLE_BASE_MS = 260
const ROLL_SETTLE_STAGGER_MS = 90

export interface TrainingDieRoll {
  playerName: string
  roll: number
  succeeded: boolean
}

export interface TrainingRollResult {
  attributeLabel: string
  successCount: number
  totalPlayers: number
  totalGain: number
  rolls: TrainingDieRoll[]
}

export interface TrainingResultDialogProps {
  result: TrainingRollResult | null
}

function DieFace({ value }: { value: number }) {
  return (
    <div className="training-result-dialog__die-face">
      {PIP_LAYOUTS[value].map((visible, index) => (
        <span
          key={index}
          className={`training-result-dialog__pip${visible ? ' training-result-dialog__pip--visible' : ''}`}
        />
      ))}
    </div>
  )
}

interface TrainingDieProps {
  roll: TrainingDieRoll
  settleDelayMs: number
}

// key 隨每次新結果變動(見下方 resultVersion),讓這顆骰子在新訓練結果出現時整個重新掛載,
// rolling 直接以 true 初始化,不需要在 effect 裡另外呼叫 setRolling(true)。
function TrainingDie({ roll, settleDelayMs }: TrainingDieProps) {
  const [face, setFace] = useState(1)
  const [rolling, setRolling] = useState(true)

  useEffect(() => {
    const tick = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), ROLL_TICK_MS)
    const settle = setTimeout(
      () => {
        clearInterval(tick)
        setFace(roll.roll)
        setRolling(false)
      },
      ROLL_SETTLE_BASE_MS + settleDelayMs,
    )
    return () => {
      clearInterval(tick)
      clearTimeout(settle)
    }
  }, [roll.roll, settleDelayMs])

  return (
    <li
      className={`training-result-dialog__die-slot${roll.succeeded ? ' training-result-dialog__die-slot--success' : ''}`}
      title={`${roll.playerName}:${roll.roll} 點`}
    >
      <div
        className={`training-result-dialog__die${rolling ? ' training-result-dialog__die--rolling' : ''}${!rolling && roll.roll === 6 ? ' training-result-dialog__die--critical' : ''}`}
        aria-hidden="true"
      >
        <DieFace value={face} />
      </div>
      <span className="training-result-dialog__die-name">{roll.playerName}</span>
      <span className="sr-only">
        {roll.playerName} 擲出 {roll.roll} 點,{roll.succeeded ? '成功' : '失敗'}
      </span>
    </li>
  )
}

export function TrainingResultDialog({ result }: TrainingResultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [displayed, setDisplayed] = useState<TrainingRollResult | null>(null)
  const [prevResult, setPrevResult] = useState<TrainingRollResult | null>(null)
  const [resultVersion, setResultVersion] = useState(0)

  if (result !== prevResult) {
    setPrevResult(result)
    if (result) {
      setDisplayed(result)
      setResultVersion((version) => version + 1)
    }
  }

  useEffect(() => {
    if (result) dialogRef.current?.showModal()
  }, [result])

  return (
    <dialog
      ref={dialogRef}
      className="training-result-dialog"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      {displayed && (
        <div className="training-result-dialog__content">
          <p className="training-result-dialog__intensity">本週練習重點:{displayed.attributeLabel}</p>

          <ul className="training-result-dialog__dice-grid">
            {displayed.rolls.map((roll, index) => (
              <TrainingDie
                key={`${resultVersion}-${index}`}
                roll={roll}
                settleDelayMs={index * ROLL_SETTLE_STAGGER_MS}
              />
            ))}
          </ul>

          <p className="training-result-dialog__count">
            {displayed.successCount} / {displayed.totalPlayers} 位球員練習成功
          </p>
          <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
            關閉
          </button>
        </div>
      )}
    </dialog>
  )
}
