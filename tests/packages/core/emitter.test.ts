import { describe, expect, it, vi } from "vitest";
import { Emitter } from "@haydn/core";

interface TestEvents {
  ping: { n: number };
  pong: { ok: boolean };
}

describe("Emitter", () => {
  it("delivers events to subscribed listeners", () => {
    const e = new Emitter<TestEvents>();
    const fn = vi.fn();
    e.on("ping", fn);
    e.emit("ping", { n: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
  });

  it("does not cross event types", () => {
    const e = new Emitter<TestEvents>();
    const ping = vi.fn();
    const pong = vi.fn();
    e.on("ping", ping);
    e.on("pong", pong);
    e.emit("ping", { n: 1 });
    expect(ping).toHaveBeenCalledTimes(1);
    expect(pong).not.toHaveBeenCalled();
  });

  it("supports multiple listeners on the same event", () => {
    const e = new Emitter<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    e.on("ping", a);
    e.on("ping", b);
    e.emit("ping", { n: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("`on` returns an unsubscribe function", () => {
    const e = new Emitter<TestEvents>();
    const fn = vi.fn();
    const off = e.on("ping", fn);
    off();
    e.emit("ping", { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("`off` removes a specific listener", () => {
    const e = new Emitter<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    e.on("ping", a);
    e.on("ping", b);
    e.off("ping", a);
    e.emit("ping", { n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("`clear` removes all listeners", () => {
    const e = new Emitter<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    e.on("ping", a);
    e.on("pong", b);
    e.clear();
    e.emit("ping", { n: 1 });
    e.emit("pong", { ok: true });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("emitting an event with no listeners is a no-op", () => {
    const e = new Emitter<TestEvents>();
    expect(() => e.emit("ping", { n: 1 })).not.toThrow();
  });
});
