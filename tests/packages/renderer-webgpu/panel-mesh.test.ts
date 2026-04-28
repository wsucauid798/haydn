import { describe, expect, it } from "vitest";
import { decidePanelRebuild } from "@haydn/renderer-webgpu";

describe("decidePanelRebuild — maps changed prop keys to rebuild work", () => {
  it("rebuilds nothing when no keys changed", () => {
    expect(decidePanelRebuild([])).toEqual({ geometry: false, texture: false });
  });

  it("rebuilds geometry only when `size` changes", () => {
    expect(decidePanelRebuild(["size"])).toEqual({ geometry: true, texture: false });
  });

  it("rebuilds texture only when `color` changes", () => {
    expect(decidePanelRebuild(["color"])).toEqual({ geometry: false, texture: true });
  });

  it("rebuilds texture only when `title` changes", () => {
    expect(decidePanelRebuild(["title"])).toEqual({ geometry: false, texture: true });
  });

  it("rebuilds texture only when `resolution` changes", () => {
    expect(decidePanelRebuild(["resolution"])).toEqual({ geometry: false, texture: true });
  });

  it("rebuilds both when geometry and texture keys are mixed", () => {
    expect(decidePanelRebuild(["size", "color"])).toEqual({ geometry: true, texture: true });
  });

  it("ignores unknown keys", () => {
    expect(decidePanelRebuild(["whatever"])).toEqual({ geometry: false, texture: false });
  });

  it("rebuilds texture once even when multiple texture keys change", () => {
    // Output is a flag, not a count — but the result should still be true.
    expect(decidePanelRebuild(["color", "title", "resolution"])).toEqual({
      geometry: false,
      texture: true,
    });
  });
});
