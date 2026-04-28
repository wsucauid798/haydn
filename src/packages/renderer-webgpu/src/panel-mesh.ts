import * as THREE from "three";
import type { Node } from "@haydn/core";

/** A panel is rendered as a plane with an optional canvas-rendered title strip. */
export function createPanelMesh(node: Node<"panel">): THREE.Mesh {
  const { size, resolution, color, title } = node.props;

  const geometry = new THREE.PlaneGeometry(size[0], size[1]);
  const texture = makePanelTexture(resolution[0], resolution[1], color ?? "#1f2937", title);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);

  applyTransformToMesh(mesh, node);
  mesh.userData["haydnNodeId"] = node.id;
  return mesh;
}

/**
 * Decide which work `updatePanelMesh` needs to do given the props that
 * changed on a panel node. Pure function — no DOM, no Three.js — so it's
 * unit-testable in isolation.
 *
 * - `size` affects geometry only.
 * - `color`, `title`, `resolution` affect the texture only.
 * - Anything else (including unknown keys) is a no-op for the mesh.
 */
export function decidePanelRebuild(
  changedKeys: ReadonlyArray<string>,
): { geometry: boolean; texture: boolean } {
  let geometry = false;
  let texture = false;
  for (const k of changedKeys) {
    if (k === "size") geometry = true;
    else if (k === "color" || k === "title" || k === "resolution") texture = true;
  }
  return { geometry, texture };
}

export function updatePanelMesh(
  mesh: THREE.Mesh,
  node: Node<"panel">,
  changedKeys: ReadonlyArray<string>,
): void {
  const { geometry: rebuildGeometry, texture: rebuildTexture } = decidePanelRebuild(changedKeys);
  if (!rebuildGeometry && !rebuildTexture) return;

  const { size, resolution, color, title } = node.props;

  if (rebuildGeometry) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(size[0], size[1]);
  }

  if (rebuildTexture) {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.map = makePanelTexture(resolution[0], resolution[1], color ?? "#1f2937", title);
    material.needsUpdate = true;
  }
}

export function applyTransformToMesh(mesh: THREE.Object3D, node: Node<"panel" | "group">): void {
  const { position, rotation, scale } = node.transform;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
}

function makePanelTexture(
  logicalW: number,
  logicalH: number,
  color: string,
  title: string | undefined,
): THREE.CanvasTexture {
  // The caller specifies a *logical* content resolution (device-independent).
  // We scale the backing canvas by the device pixel ratio so text and edges
  // stay crisp on high-DPI displays without the caller having to know.
  const dpr = Math.max(1, globalThis.devicePixelRatio ?? 1);
  const canvas = document.createElement("canvas");
  const w = Math.round(logicalW * dpr);
  const h = Math.round(logicalH * dpr);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    // Border, title-bar, and font sizes scale with canvas height so they stay
    // visually consistent across resolutions and pixel ratios.
    const border = Math.max(2, Math.round(h * 0.008));
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, w - border, h - border);

    if (title) {
      const titleH = Math.round(h * 0.11);
      const fontPx = Math.round(h * 0.047);
      const pad = Math.round(h * 0.04);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, titleH);
      ctx.fillStyle = "#f9fafb";
      ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(title, pad, titleH / 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Sharper sampling when the panel is viewed at oblique angles.
  texture.anisotropy = 16;
  return texture;
}
