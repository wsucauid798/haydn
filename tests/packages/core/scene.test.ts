import { describe, expect, it, vi } from "vitest";
import { Node, Scene } from "@haydn/core";

describe("Scene — node lifecycle events", () => {
  it("emits node:added when createNode is called", () => {
    const scene = new Scene();
    const fn = vi.fn();
    scene.events.on("node:added", fn);
    const node = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toEqual({ node, parent: scene.root });
  });

  it("emits node:added with the explicit parent when one is given", () => {
    const scene = new Scene();
    const group = scene.createNode({ type: "group", props: {} });
    const fn = vi.fn();
    scene.events.on("node:added", fn);
    const child = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } }, group);
    expect(fn).toHaveBeenCalledWith({ node: child, parent: group });
  });

  it("emits node:removed and forgets the node from nodesById", () => {
    const scene = new Scene();
    const node = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    const fn = vi.fn();
    scene.events.on("node:removed", fn);
    scene.remove(node);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toEqual({ node, parent: scene.root });
    expect(scene.getNode(node.id)).toBeUndefined();
  });
});

describe("Scene — nodesById tracks the whole subtree", () => {
  it("getNode resolves a node attached at the root", () => {
    const scene = new Scene();
    const node = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    expect(scene.getNode(node.id)).toBe(node);
  });

  it("getNode resolves descendants attached as a pre-built subtree", () => {
    const scene = new Scene();
    // Build a detached subtree: group -> panel.
    const group = new Node({ type: "group", props: {} });
    const panel = new Node({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    group.children.push(panel);
    panel.parent = group;
    scene.add(group, scene.root);
    expect(scene.getNode(group.id)).toBe(group);
    expect(scene.getNode(panel.id)).toBe(panel);
  });

  it("removing a subtree forgets every descendant", () => {
    const scene = new Scene();
    const group = new Node({ type: "group", props: {} });
    const panel = new Node({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    group.children.push(panel);
    panel.parent = group;
    scene.add(group, scene.root);
    scene.remove(group);
    expect(scene.getNode(group.id)).toBeUndefined();
    expect(scene.getNode(panel.id)).toBeUndefined();
  });
});

describe("Scene — mutation events propagate from nodes attached anywhere in the tree", () => {
  it("setPosition on a descendant emits node:transform-changed", () => {
    const scene = new Scene();
    const group = scene.createNode({ type: "group", props: {} });
    const panel = scene.createNode(
      { type: "panel", props: { size: [1, 1], resolution: [10, 10] } },
      group,
    );
    const fn = vi.fn();
    scene.events.on("node:transform-changed", fn);
    panel.setPosition([1, 2, 3]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toEqual({ node: panel });
  });

  it("setVisible only emits when visibility actually changes", () => {
    const scene = new Scene();
    const node = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    const fn = vi.fn();
    scene.events.on("node:visibility-changed", fn);
    node.setVisible(true); // already visible by default
    expect(fn).not.toHaveBeenCalled();
    node.setVisible(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("a detached node does not emit on the scene anymore", () => {
    const scene = new Scene();
    const node = scene.createNode({ type: "panel", props: { size: [1, 1], resolution: [10, 10] } });
    scene.remove(node);
    const fn = vi.fn();
    scene.events.on("node:transform-changed", fn);
    node.setPosition([9, 9, 9]);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("Scene — node:props-changed reports which keys changed", () => {
  it("setProps emits the event with the keys the caller passed", () => {
    const scene = new Scene();
    const node = scene.createNode({
      type: "panel",
      props: { size: [1, 1], resolution: [10, 10], color: "#000" },
    });
    const fn = vi.fn();
    scene.events.on("node:props-changed", fn);
    node.setProps({ color: "#fff" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toEqual({ node, keys: ["color"] });
  });

  it("multi-key setProps reports all the caller's keys", () => {
    const scene = new Scene();
    const node = scene.createNode({
      type: "panel",
      props: { size: [1, 1], resolution: [10, 10] },
    });
    const fn = vi.fn();
    scene.events.on("node:props-changed", fn);
    node.setProps({ color: "#fff", title: "Hi" });
    expect(fn).toHaveBeenCalledTimes(1);
    const payload = fn.mock.calls[0]?.[0] as { node: Node; keys: string[] };
    expect(payload.node).toBe(node);
    expect(payload.keys).toEqual(expect.arrayContaining(["color", "title"]));
    expect(payload.keys).toHaveLength(2);
  });

  it("setProps with no keys is a no-op (no event)", () => {
    const scene = new Scene();
    const node = scene.createNode({
      type: "panel",
      props: { size: [1, 1], resolution: [10, 10] },
    });
    const fn = vi.fn();
    scene.events.on("node:props-changed", fn);
    node.setProps({});
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("Scene — frame and pointer dispatch", () => {
  it("tick emits frame with dt and time relative to the first tick", () => {
    const scene = new Scene();
    const fn = vi.fn();
    scene.events.on("frame", fn);
    scene.tick(100);
    scene.tick(100.5);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0]?.[0]).toEqual({ dt: 0, time: 0 });
    const second = fn.mock.calls[1]?.[0] as { dt: number; time: number };
    expect(second.dt).toBeCloseTo(0.5);
    expect(second.time).toBeCloseTo(0.5);
  });

  it("dispatchPointer forwards the event verbatim", () => {
    const scene = new Scene();
    const fn = vi.fn();
    scene.events.on("pointer", fn);
    scene.dispatchPointer({ type: "pointerdown", nodeId: "x", point: [1, 2, 3], buttons: 1 });
    expect(fn).toHaveBeenCalledWith({ type: "pointerdown", nodeId: "x", point: [1, 2, 3], buttons: 1 });
  });
});
