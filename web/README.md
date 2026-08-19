# Run 001 visualization

This is the source for the static explorer at <https://infoxiao.github.io/turf-war-run-001/>.

The build reads the 20 accepted raw runs from the repository-level `runs/` directory, validates their completion and protocol metadata, and embeds the resulting messages, actions, canvases, and summaries into the site.

```sh
npm ci
npm run build:static
```
For a GitHub Pages-style subpath build:

```sh
NEXT_PUBLIC_SITE_URL=https://infoxiao.github.io/turf-war-run-001 \
PAGES_BASE_PATH=/turf-war-run-001 \
npm run build:static
```
