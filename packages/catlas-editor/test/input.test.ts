import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { CanvasClickSuppression } from "../src/lib/editor/input";

describe("canvas click suppression", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("does not consume blank canvas clicks before an interactive pointerdown", () => {
    const suppression = new CanvasClickSuppression();

    expect(suppression.consume()).toBe(false);
  });

  test("consumes only the next canvas click after being armed", () => {
    const suppression = new CanvasClickSuppression();

    suppression.arm();

    expect(suppression.consume()).toBe(true);
    expect(suppression.consume()).toBe(false);
  });

  test("keeps the suppression active until the post-pointer timeout fires", () => {
    vi.useFakeTimers();
    const suppression = new CanvasClickSuppression();

    suppression.arm();
    suppression.releaseAfterPointerEnd(10);

    expect(suppression.consume()).toBe(true);
    vi.advanceTimersByTime(10);
    expect(suppression.consume()).toBe(false);
  });

  test("releases an unconsumed suppression after pointer end", () => {
    vi.useFakeTimers();
    const suppression = new CanvasClickSuppression();

    suppression.arm();
    suppression.releaseAfterPointerEnd(10);
    vi.advanceTimersByTime(10);

    expect(suppression.consume()).toBe(false);
  });
});
