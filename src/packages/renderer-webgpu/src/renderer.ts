import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import type { Node, NodeType, Scene } from "@haydn/core";
import { DragController } from "./drag.js";
import { applyTransformToMesh, createPanelMesh, updatePanelMesh } from "./panel-mesh.js";
import { computeBillboardQuaternion } from "./billboard.js";

export interface RendererOptions {
  scene: Scene;
  canvas: HTMLCanvasElement;
  background?: THREE.ColorRepresentation;
  enableDrag?: boolean;
}

/**
 * Mirrors a Haydn Scene into a Three.js scene and renders it with WebGPU.
 * The renderer is a *consumer* of @haydn/core. It must not mutate the scene
 * except via Scene.dispatchPointer.
 */
export class Renderer {
  readonly three: WebGPURenderer;
  readonly threeScene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly haydn: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly meshes = new Map<string, THREE.Object3D>();
  private readonly unsubs: Array<() => void> = [];
  private readonly drag: DragController | null;
  private rafId = 0;
  private disposed = false;

  constructor(opts: RendererOptions) {
    this.haydn = opts.scene;
    this.canvas = opts.canvas;

    this.three = new WebGPURenderer({ canvas: opts.canvas, antialias: true });
    this.three.setPixelRatio(globalThis.devicePixelRatio);
    this.three.setSize(opts.canvas.clientWidth, opts.canvas.clientHeight, false);

    this.threeScene.background = new THREE.Color(opts.background ?? 0x0b1020);

    this.camera = new THREE.PerspectiveCamera(
      60,
      opts.canvas.clientWidth / opts.canvas.clientHeight,
      0.01,
      100,
    );
    this.camera.position.set(0, 0, 1.0);

    this.threeScene.add(new THREE.AmbientLight(0xffffff, 1));

    this.haydn.root.traverse((n) => this.handleAdded(n, n.parent));

    this.unsubs.push(
      this.haydn.events.on("node:added", ({ node, parent }) => this.handleAdded(node, parent)),
      this.haydn.events.on("node:removed", ({ node }) => this.handleRemoved(node)),
      this.haydn.events.on("node:transform-changed", ({ node }) => this.handleTransformChanged(node)),
      this.haydn.events.on("node:props-changed", ({ node, keys }) => this.handlePropsChanged(node, keys)),
      this.haydn.events.on("node:visibility-changed", ({ node }) => this.handleVisibilityChanged(node)),
    );

    this.drag = opts.enableDrag === false
      ? null
      : new DragController(this.canvas, this.camera, this.haydn, this.threeScene);
  }

  async init(): Promise<void> {
    await this.three.init();
    this.start();
  }

  start(): void {
    if (this.rafId) return;
    const loop = (t: number) => {
      if (this.disposed) return;
      this.haydn.tick(t / 1000);
      this.applyBillboards();
      this.three.render(this.threeScene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * For every panel node with `props.billboard === true`, override its mesh
   * quaternion so the panel faces the camera. Runs every frame; the cost is
   * one quaternion compute + assign per billboard panel.
   */
  private applyBillboards(): void {
    const camPos: [number, number, number] = [
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
    ];
    for (const [id, obj] of this.meshes) {
      const node = this.haydn.getNode(id);
      if (!node || node.type !== "panel") continue;
      const panel = node as Node<"panel">;
      if (!panel.props.billboard) continue;
      const p = panel.transform.position;
      const q = computeBillboardQuaternion([p[0], p[1], p[2]], camPos);
      obj.quaternion.set(q[0], q[1], q[2], q[3]);
    }
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  resize(width: number, height: number): void {
    this.three.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.drag?.dispose();
    for (const unsub of this.unsubs) unsub();
    for (const obj of this.meshes.values()) this.disposeObject(obj);
    this.meshes.clear();
    this.three.dispose();
  }

  private handleAdded(node: Node<NodeType>, _parent: Node<NodeType> | null): void {
    if (this.meshes.has(node.id)) return;
    const obj = this.makeObject(node);
    this.meshes.set(node.id, obj);
    this.threeScene.add(obj);
  }

  private handleRemoved(node: Node<NodeType>): void {
    const obj = this.meshes.get(node.id);
    if (!obj) return;
    this.threeScene.remove(obj);
    this.disposeObject(obj);
    this.meshes.delete(node.id);
  }

  private handleTransformChanged(node: Node<NodeType>): void {
    const obj = this.meshes.get(node.id);
    if (!obj) return;
    applyTransformToMesh(obj, node as Node<"panel" | "group">);
  }

  private handlePropsChanged(node: Node<NodeType>, keys: ReadonlyArray<string>): void {
    if (node.type !== "panel") return;
    const obj = this.meshes.get(node.id);
    if (!(obj instanceof THREE.Mesh)) return;
    updatePanelMesh(obj, node as Node<"panel">, keys);
    // When billboard turns off, the per-frame override stops writing, so we
    // restore the node's authored rotation onto the mesh once.
    if (keys.includes("billboard") && !(node as Node<"panel">).props.billboard) {
      applyTransformToMesh(obj, node as Node<"panel">);
    }
  }

  private handleVisibilityChanged(node: Node<NodeType>): void {
    const obj = this.meshes.get(node.id);
    if (obj) obj.visible = node.visible;
  }

  private makeObject(node: Node<NodeType>): THREE.Object3D {
    if (node.type === "panel") return createPanelMesh(node as Node<"panel">);
    const group = new THREE.Group();
    applyTransformToMesh(group, node as Node<"group">);
    group.userData["haydnNodeId"] = node.id;
    return group;
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}
