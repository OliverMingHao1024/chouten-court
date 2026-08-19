import '@testing-library/jest-dom'

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
