import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// jsdom doesn't implement HTMLDialogElement.showModal()/close() yet; shim them so
// components using the native <dialog> element are testable. Production code still
// relies on the real browser implementation — this only affects the test environment.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// The save system persists to localStorage; without this, a save written by one test
// would leak into the next test's fresh render.
beforeEach(() => {
  window.localStorage.clear()
})
