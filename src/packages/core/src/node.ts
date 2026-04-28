import type { NodeProps, NodeType, Quat, Transform, Vec3 } from "./types.js";
import { IDENTITY_TRANSFORM } from "./types.js";

let nextId = 0;
const newId = (type: string) => `${type}_${(nextId++).toString(36)}`;

export interface NodeInit<T extends NodeType> {
  type: T;
  id?: string;
  transform?: Partial<Transform>;
  props: NodeProps[T];
  visible?: boolean;
}

type NodeMutationCallback = (
  node: Node<NodeType>,
  kind: "transform" | "props" | "visibility",
  /** For `kind === "props"`, the names of the props the caller passed to `setProps`. */
  keys?: ReadonlyArray<string>,
) => void;

export class Node<T extends NodeType = NodeType> {
  readonly id: string;
  readonly type: T;
  parent: Node<NodeType> | null = null;
  readonly children: Node<NodeType>[] = [];

  private _transform: Transform;
  private _props: NodeProps[T];
  private _visible: boolean;

  /** Set by Scene when the node is attached. Renderers observe via Scene events. */
  onMutate: NodeMutationCallback | null = null;

  constructor(init: NodeInit<T>) {
    this.id = init.id ?? newId(init.type);
    this.type = init.type;
    this._transform = {
      position: init.transform?.position ?? IDENTITY_TRANSFORM.position,
      rotation: init.transform?.rotation ?? IDENTITY_TRANSFORM.rotation,
      scale: init.transform?.scale ?? IDENTITY_TRANSFORM.scale,
    };
    this._props = init.props;
    this._visible = init.visible ?? true;
  }

  get transform(): Readonly<Transform> {
    return this._transform;
  }

  get props(): Readonly<NodeProps[T]> {
    return this._props;
  }

  get visible(): boolean {
    return this._visible;
  }

  setPosition(p: Vec3): void {
    this._transform = { ...this._transform, position: p };
    this.onMutate?.(this, "transform");
  }

  setRotation(r: Quat): void {
    this._transform = { ...this._transform, rotation: r };
    this.onMutate?.(this, "transform");
  }

  setScale(s: Vec3): void {
    this._transform = { ...this._transform, scale: s };
    this.onMutate?.(this, "transform");
  }

  setTransform(t: Partial<Transform>): void {
    this._transform = { ...this._transform, ...t };
    this.onMutate?.(this, "transform");
  }

  setProps(props: Partial<NodeProps[T]>): void {
    const keys = Object.keys(props);
    if (keys.length === 0) return;
    this._props = { ...this._props, ...props };
    this.onMutate?.(this, "props", keys);
  }

  setVisible(visible: boolean): void {
    if (this._visible === visible) return;
    this._visible = visible;
    this.onMutate?.(this, "visibility");
  }

  traverse(visitor: (node: Node<NodeType>) => void): void {
    visitor(this);
    for (const child of this.children) child.traverse(visitor);
  }
}
