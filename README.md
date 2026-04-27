# Haydn

A spatial runtime for the open web.

Haydn is a renderer-agnostic spatial runtime. Web apps describe a spatial scene, and renderers (browser-first, desktop next) draw it. The runtime owns the scene graph; renderers are consumers.

## Status

v0.0 — early. WebGPU renderer only. No React bindings yet.

## Packages

- `@haydn/core` — runtime: scene graph, nodes, transforms, events. No renderer dependencies.
- `@haydn/renderer-webgpu` — Three.js WebGPU renderer that consumes a `Scene`.
- `examples/sandbox` — three draggable panels in 3D.

## Run

```bash
npm install
npm run dev
```

Requires WebGPU (Chrome, Edge, or Safari 18.2+).

## License

MIT — see [LICENSE](./LICENSE).
