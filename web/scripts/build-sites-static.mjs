import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });
await cp("out", "dist/client", { recursive: true });

await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
`,
);

await writeFile(
  "dist/server/wrangler.json",
  `${JSON.stringify({
    name: "turf-war-viewer",
    compatibility_date: "2026-05-15",
    main: "index.js",
    no_bundle: true,
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
    assets: { directory: "../client" },
  })}\n`,
);
