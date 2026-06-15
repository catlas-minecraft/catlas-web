import * as d3 from "d3";
import { describe, expect, test } from "vite-plus/test";
import {
  getInitialTransform,
  getViewportBbox,
  TILE_PIXEL_SIZE,
  TILE_WORLD_SIZE,
} from "../src/lib/editor/util";

describe("editor world scale", () => {
  test("maps one 512-pixel tile to 512 world cells at the initial zoom", () => {
    const transform = getInitialTransform({ width: 1024, height: 512 });

    expect(TILE_PIXEL_SIZE).toBe(512);
    expect(TILE_WORLD_SIZE).toBe(512);
    expect(transform.k).toBe(1);
    expect(transform.applyX(TILE_WORLD_SIZE) - transform.applyX(0)).toBe(TILE_PIXEL_SIZE);
  });

  test("requests viewport bounds in world-cell coordinates", () => {
    const transform = d3.zoomIdentity.translate(512, 256).scale(1);

    expect(getViewportBbox(transform, { width: 1024, height: 512 })).toEqual([
      -512, -256, 512, 256,
    ]);
  });
});
