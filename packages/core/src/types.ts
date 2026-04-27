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

export interface NodeProps {
  /**
   * `size`: panel dimensions in world meters (e.g. [0.8, 0.5] = 80cm wide, 50cm tall).
   * `resolution`: pixel dimensions of the panel's content texture (e.g. [800, 500]).
   * The two are independent: a 1m panel can be rendered at 512px or 4096px depending
   * on how sharp you want the content to look at the user's viewing distance.
   */
  panel: { size: Vec2; resolution: Vec2; color?: string; title?: string };
  group: Record<string, never>;
}

export interface PointerEvent {
  type: "pointerdown" | "pointermove" | "pointerup";
  nodeId: string | null;
  point: Vec3;
  buttons: number;
}
