import { describe, expect, it } from "vitest";
import { DEFAULT_PANEL_PIXELS_PER_METER } from "@haydn/core";
import { resolvePanelResolution } from "@haydn/renderer-webgpu";

describe("resolvePanelResolution — falls back to size × default density when omitted", () => {
  it("returns the explicit resolution when one is given", () => {
    expect(resolvePanelResolution({ size: [0.8, 0.5], resolution: [800, 500] })).toEqual([800, 500]);
  });

  it("derives resolution from size × DEFAULT_PANEL_PIXELS_PER_METER when omitted", () => {
    expect(resolvePanelResolution({ size: [0.8, 0.5] })).toEqual([
      0.8 * DEFAULT_PANEL_PIXELS_PER_METER,
      0.5 * DEFAULT_PANEL_PIXELS_PER_METER,
    ]);
  });

  it("rounds derived resolution to integers (textures need integer dimensions)", () => {
    const [w, h] = resolvePanelResolution({ size: [0.333, 0.111] });
    expect(Number.isInteger(w)).toBe(true);
    expect(Number.isInteger(h)).toBe(true);
  });
});
