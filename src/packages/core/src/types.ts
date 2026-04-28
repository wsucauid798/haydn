export type Vec3 = readonly [number, number, number];
export type Vec2 = readonly [number, number];
export type Quat = readonly [number, number, number, number];

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export const IDENTITY_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

export type NodeType = "panel" | "group";

/** Pixels per world-meter used when a panel is created without an explicit `resolution`. */
export const DEFAULT_PANEL_PIXELS_PER_METER = 1000;

export interface NodeProps {
  /**
   * `size`: panel dimensions in world meters (e.g. [0.8, 0.5] = 80cm wide, 50cm tall).
   * `resolution`: optional override for the panel's content texture in pixels
   * (e.g. [800, 500]). Defaults to `size * DEFAULT_PANEL_PIXELS_PER_METER` per
   * axis, which is a reasonable density for typical UI at typical viewing
   * distances. Override when you need finer or coarser content.
   */
  panel: {
    size: Vec2;
    resolution?: Vec2;
    color?: string;
    title?: string;
    /** When true, the renderer keeps the panel rotated to face the camera each frame. */
    billboard?: boolean;
  };
  group: Record<string, never>;
}

export interface PointerEvent {
  type: "pointerdown" | "pointermove" | "pointerup";
  nodeId: string | null;
  point: Vec3;
  buttons: number;
}
