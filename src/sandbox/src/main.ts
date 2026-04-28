import { Scene } from "@haydn/core";
import { Renderer } from "@haydn/renderer-webgpu";

async function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("canvas not found");

  if (!("gpu" in navigator)) {
    showFatal("WebGPU is not available in this browser. Try Chrome, Edge, or Safari 18.2+.");
    return;
  }

  const scene = new Scene();

  scene.createNode({
    type: "panel",
    props: { size: [0.9, 0.6], color: "#1e293b", title: "Tools" },
    transform: { position: [-1.0, 0.1, -0.5] },
  });

  const canvasPanel = scene.createNode({
    type: "panel",
    props: { size: [0.9, 0.6], color: "#0f766e", title: "Canvas" },
    transform: { position: [0, 0.1, -0.5] },
  });

  // Per-frame title update — pressure-tests the props-change → renderer
  // path. Currently every title change rebuilds the panel's canvas texture
  // from scratch (see renderer-webgpu/panel-mesh.ts updatePanelMesh), which
  // means a full canvas redraw + new CanvasTexture per frame here.
  scene.events.on("frame", ({ time }) => {
    canvasPanel.setProps({ title: `Canvas — ${time.toFixed(1)}s` });
  });

  scene.createNode({
    type: "panel",
    props: { size: [0.9, 0.6], color: "#7c2d12", title: "Inspector" },
    transform: { position: [1.0, 0.1, -0.5] },
  });

  scene.events.on("pointer", (e) => {
    if (e.type === "pointerdown" && e.nodeId) {
      console.log("pointerdown", e.nodeId, e.point);
    }
  });

  const renderer = new Renderer({ scene, canvas });

  try {
    await renderer.init();
  } catch (err) {
    showFatal(`WebGPU init failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const onResize = () => renderer.resize(canvas.clientWidth, canvas.clientHeight);
  window.addEventListener("resize", onResize);
  onResize();
}

function showFatal(message: string): void {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#fca5a5;background:#0b1020;font:14px/1.5 system-ui,sans-serif;";
  el.textContent = message;
  document.body.appendChild(el);
}

main();
