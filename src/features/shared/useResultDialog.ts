import { useEffect, useRef, useState } from 'react'

/**
 * 管理「新結果進來時開啟 <dialog>」的生命週期:result 以參考相等比較,
 * 即使新結果的內容跟上一次一樣(App 端每次都會給一個全新物件),也會重新開啟。
 * result 變回 null 不會自動關閉對話框,只影響下一次開啟時顯示的內容。
 *
 * version 每次收到新的(參考相異的)非 null result 就 +1,給需要在新結果進來時
 * 強制重新掛載子節點的呼叫端(例如訓練骰子要在同樣點數的新結果上重新播放動畫)當 key 用;
 * 在 render 階段算出,不用另開一個只為了 setState 的 effect。
 */
export function useResultDialog<T>(result: T | null) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [displayed, setDisplayed] = useState<T | null>(null)
  const [prevResult, setPrevResult] = useState<T | null>(null)
  const [version, setVersion] = useState(0)

  if (result !== prevResult) {
    setPrevResult(result)
    if (result) {
      setDisplayed(result)
      setVersion((v) => v + 1)
    }
  }

  useEffect(() => {
    if (result) dialogRef.current?.showModal()
  }, [result])

  return { dialogRef, displayed, version }
}
