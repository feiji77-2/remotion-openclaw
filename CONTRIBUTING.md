# Contributing

## Development flow

1. Use `remotion-video/examples/project.json` as the public contract example.
2. Keep `scenes[]` as the only duration source.
3. Add or change scene families through `src/project/sceneRegistry.tsx` with a Zod payload schema.
4. Follow `remotion:remotion-best-practices` for Remotion code.
5. Run the complete verification set before submitting changes.

```bash
npm test
npm run typecheck
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30 --scale 0.25
```

Do not add server APIs, queues, workflow steps, provider calls, or a second project contract to the render path.
