import * as THREE from "three";
import type { Node, Scene } from "@haydn/core";

export class DragController {
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private dragging: {
    node: Node<"panel">;
    plane: THREE.Plane;
    offset: THREE.Vector3;
  } | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly camera: THREE.Camera,
    private readonly scene: Scene,
    private readonly threeRoot: THREE.Object3D,
  ) {
    this.element.addEventListener("pointerdown", this.onDown);
    this.element.addEventListener("pointermove", this.onMove);
    this.element.addEventListener("pointerup", this.onUp);
    this.element.addEventListener("pointercancel", this.onUp);
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.onDown);
    this.element.removeEventListener("pointermove", this.onMove);
    this.element.removeEventListener("pointerup", this.onUp);
    this.element.removeEventListener("pointercancel", this.onUp);
  }

  private updateNdc(e: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private hitTest(): { mesh: THREE.Mesh; nodeId: string; point: THREE.Vector3 } | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.threeRoot.children, true);
    for (const hit of hits) {
      const id = hit.object.userData["haydnNodeId"] as string | undefined;
      if (id) return { mesh: hit.object as THREE.Mesh, nodeId: id, point: hit.point };
    }
    return null;
  }

  private onDown = (e: PointerEvent): void => {
    this.updateNdc(e);
    const hit = this.hitTest();
    if (!hit) return;
    const node = this.scene.getNode(hit.nodeId);
    if (!node || node.type !== "panel") return;

    const panel = node as Node<"panel">;
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDir.negate(), hit.point);

    const [px, py, pz] = panel.transform.position;
    const offset = new THREE.Vector3(px, py, pz).sub(hit.point);

    this.dragging = { node: panel, plane, offset };
    this.element.setPointerCapture(e.pointerId);
    this.scene.dispatchPointer({
      type: "pointerdown",
      nodeId: panel.id,
      point: [hit.point.x, hit.point.y, hit.point.z],
      buttons: e.buttons,
    });
  };

  private onMove = (e: PointerEvent): void => {
    this.updateNdc(e);
    if (!this.dragging) {
      const hit = this.hitTest();
      this.scene.dispatchPointer({
        type: "pointermove",
        nodeId: hit?.nodeId ?? null,
        point: hit ? [hit.point.x, hit.point.y, hit.point.z] : [0, 0, 0],
        buttons: e.buttons,
      });
      return;
    }

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragging.plane, intersection)) return;
    const next = intersection.add(this.dragging.offset);
    this.dragging.node.setPosition([next.x, next.y, next.z]);
  };

  private onUp = (e: PointerEvent): void => {
    if (this.dragging) {
      this.element.releasePointerCapture(e.pointerId);
      const node = this.dragging.node;
      this.dragging = null;
      this.scene.dispatchPointer({
        type: "pointerup",
        nodeId: node.id,
        point: node.transform.position,
        buttons: e.buttons,
      });
    }
  };
}
