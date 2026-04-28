import { describe, expect, it } from "vitest";
import { computeBillboardQuaternion } from "@haydn/renderer-webgpu";

// computeBillboardQuaternion(panelPos, cameraPos) returns a quaternion that
// rotates the panel's local +Z axis to point from the panel toward the camera.
// A panel mesh in Three.js faces +Z by default, so applying this quaternion
// makes the panel "look at" the camera while staying upright (no roll).

const EPSILON = 1e-6;

function quatApprox(a: readonly number[], b: readonly number[]): boolean {
  return a.every((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) < EPSILON);
}

describe("computeBillboardQuaternion", () => {
  it("returns the identity rotation when the camera is directly in front (+Z) of the panel", () => {
    const q = computeBillboardQuaternion([0, 0, 0], [0, 0, 5]);
    expect(quatApprox(q, [0, 0, 0, 1])).toBe(true);
  });

  it("rotates 180° around Y when the camera is directly behind (-Z)", () => {
    const q = computeBillboardQuaternion([0, 0, 0], [0, 0, -5]);
    // 180° around world-up Y: quaternion [0, 1, 0, 0]
    expect(quatApprox(q, [0, 1, 0, 0])).toBe(true);
  });

  it("rotates 90° around Y when the camera is directly to the right (+X)", () => {
    const q = computeBillboardQuaternion([0, 0, 0], [5, 0, 0]);
    // 90° around Y: quaternion [0, sin(45°), 0, cos(45°)] ≈ [0, 0.707, 0, 0.707]
    const s = Math.SQRT1_2;
    expect(quatApprox(q, [0, s, 0, s])).toBe(true);
  });

  it("rotates -90° around Y when the camera is directly to the left (-X)", () => {
    const q = computeBillboardQuaternion([0, 0, 0], [-5, 0, 0]);
    const s = Math.SQRT1_2;
    expect(quatApprox(q, [0, -s, 0, s])).toBe(true);
  });

  it("returns a unit quaternion", () => {
    const q = computeBillboardQuaternion([1, 2, 3], [4, 5, 6]);
    const lenSq = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    expect(Math.abs(lenSq - 1)).toBeLessThan(EPSILON);
  });

  it("returns identity when camera coincides with panel (no direction to face)", () => {
    // Edge case: zero direction vector. Should not produce NaN.
    const q = computeBillboardQuaternion([1, 2, 3], [1, 2, 3]);
    expect(q.every((v) => Number.isFinite(v))).toBe(true);
    expect(quatApprox(q, [0, 0, 0, 1])).toBe(true);
  });
});
