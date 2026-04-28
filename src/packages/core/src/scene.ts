import { Emitter } from "./emitter.js";
import { Node, type NodeInit } from "./node.js";
import type { NodeType, PointerEvent } from "./types.js";

export interface SceneEvents {
  "node:added": { node: Node<NodeType>; parent: Node<NodeType> | null };
  "node:removed": { node: Node<NodeType>; parent: Node<NodeType> | null };
  "node:transform-changed": { node: Node<NodeType> };
  "node:props-changed": { node: Node<NodeType>; keys: ReadonlyArray<string> };
  "node:visibility-changed": { node: Node<NodeType> };
  "frame": { dt: number; time: number };
  "pointer": PointerEvent;
}

export class Scene {
  readonly events = new Emitter<SceneEvents>();
  readonly root: Node<"group">;
  private nodesById = new Map<string, Node<NodeType>>();
  private lastFrameTime = 0;
  private startTime = 0;

  constructor() {
    this.root = new Node({ type: "group", id: "__root__", props: {} });
    this.attach(this.root, null);
  }

  createNode<T extends NodeType>(init: NodeInit<T>, parent?: Node<NodeType>): Node<T> {
    const node = new Node(init);
    this.add(node, parent ?? this.root);
    return node;
  }

  add(node: Node<NodeType>, parent: Node<NodeType>): void {
    if (node.parent) this.remove(node);
    parent.children.push(node);
    node.parent = parent;
    this.attach(node, parent);
  }

  remove(node: Node<NodeType>): void {
    const parent = node.parent;
    if (!parent) return;
    const idx = parent.children.indexOf(node);
    if (idx >= 0) parent.children.splice(idx, 1);
    node.parent = null;
    this.detach(node, parent);
  }

  getNode(id: string): Node<NodeType> | undefined {
    return this.nodesById.get(id);
  }

  /** Drive the runtime by one frame. Time is in seconds. */
  tick(now: number): void {
    if (this.startTime === 0) {
      this.startTime = now;
      this.lastFrameTime = now;
    }
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.events.emit("frame", { dt, time: now - this.startTime });
  }

  /** Renderers call this when the user interacts with a node they manage. */
  dispatchPointer(event: PointerEvent): void {
    this.events.emit("pointer", event);
  }

  private attach(node: Node<NodeType>, parent: Node<NodeType> | null): void {
    node.traverse((n) => {
      this.nodesById.set(n.id, n);
      n.onMutate = this.handleMutation;
    });
    this.events.emit("node:added", { node, parent });
  }

  private detach(node: Node<NodeType>, parent: Node<NodeType> | null): void {
    node.traverse((n) => {
      this.nodesById.delete(n.id);
      n.onMutate = null;
    });
    this.events.emit("node:removed", { node, parent });
  }

  private handleMutation = (
    node: Node<NodeType>,
    kind: "transform" | "props" | "visibility",
    keys?: ReadonlyArray<string>,
  ): void => {
    if (kind === "transform") this.events.emit("node:transform-changed", { node });
    else if (kind === "props") this.events.emit("node:props-changed", { node, keys: keys ?? [] });
    else this.events.emit("node:visibility-changed", { node });
  };
}
