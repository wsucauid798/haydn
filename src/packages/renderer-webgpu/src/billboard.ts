import type { Quat, Vec3 } from "@haydn/core";

const EPSILON = 1e-9;

/**
 * Quaternion that rotates a panel at `panelPos` so its local +Z axis points
 * toward `cameraPos`. World-up is locked to +Y, so panels stay upright (no
 * roll). Pure math — no Three.js, no DOM.
 *
 * Returns the identity quaternion `[0, 0, 0, 1]` if camera and panel coincide
 * (no defined facing direction) or if forward is parallel to world-up.
 */
export function computeBillboardQuaternion(panelPos: Vec3, cameraPos: Vec3): Quat {
  const dx = cameraPos[0] - panelPos[0];
  const dy = cameraPos[1] - panelPos[1];
  const dz = cameraPos[2] - panelPos[2];
  const dlen = Math.hypot(dx, dy, dz);
  if (dlen < EPSILON) return [0, 0, 0, 1];

  // Forward (panel → camera), normalized.
  const fx = dx / dlen;
  const fy = dy / dlen;
  const fz = dz / dlen;

  // Right = normalize(cross(worldUp=[0,1,0], forward)) = normalize([fz, 0, -fx]).
  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rlen = Math.hypot(rx, rz);
  if (rlen < EPSILON) {
    // Forward is parallel to world-up: no unique facing rotation. Identity.
    return [0, 0, 0, 1];
  }
  rx /= rlen;
  rz /= rlen;

  // Up = cross(forward, right). Already unit-length given forward and right
  // are unit-length and orthogonal.
  const ux = fy * rz - fz * ry;
  const uy = fz * rx - fx * rz;
  const uz = fx * ry - fy * rx;

  // Rotation matrix (column = local axis):
  //   | rx ux fx |
  //   | ry uy fy |
  //   | rz uz fz |
  const m00 = rx, m01 = ux, m02 = fx;
  const m10 = ry, m11 = uy, m12 = fy;
  const m20 = rz, m21 = uz, m22 = fz;

  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}
