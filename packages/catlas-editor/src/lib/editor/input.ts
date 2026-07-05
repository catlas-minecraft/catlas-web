const POINTER_END_RELEASE_DELAY_MS = 50;

export class CanvasClickSuppression {
  #active = false;
  #timeout: ReturnType<typeof setTimeout> | null = null;

  arm() {
    this.#clearTimeout();
    this.#active = true;
  }

  consume() {
    if (!this.#active) return false;
    this.clear();
    return true;
  }

  releaseAfterPointerEnd(delayMs = POINTER_END_RELEASE_DELAY_MS) {
    if (!this.#active) return;
    this.#clearTimeout();
    this.#timeout = setTimeout(() => {
      this.#timeout = null;
      this.#active = false;
    }, delayMs);
  }

  clear() {
    this.#clearTimeout();
    this.#active = false;
  }

  #clearTimeout() {
    if (this.#timeout === null) return;
    clearTimeout(this.#timeout);
    this.#timeout = null;
  }
}
