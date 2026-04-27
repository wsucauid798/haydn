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

export function updatePanelMesh(mesh: THREE.Mesh, node: Node<"panel">): void {
  const { size, resolution, color, title } = node.props;

  mesh.geometry.dispose();
  mesh.geometry = new THREE.PlaneGeometry(size[0], size[1]);

  const material = mesh.material as THREE.MeshBasicMaterial;
  material.map?.dispose();
  material.map = makePanelTexture(resolution[0], resolution[1], color ?? "#1f2937", title);
  material.needsUpdate = true;
}

export function applyTransformToMesh(mesh: THREE.Object3D, node: Node<"panel" | "group">): void {
  const { position, rotation, scale } = node.transform;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
}

function makePanelTexture(
  w: number,
  h: number,
  color: string,
  title: string | undefined,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    if (title) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, 64);
      ctx.fillStyle = "#f9fafb";
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(title, 24, 32);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
