// Builds every widget artifact from widget/src:
//   dist/index.js                                   ESM, for the npm package (React wrapper)
//   dist/loader.js                                  script-tag loader (copied over ./loader.js at release — see README)
//   web/public/v2/loader.js, santander-calc.js      served by the Vercel app
//   shopify/extensions/santander-calc/assets/…      boot script + on-demand widget for the Shopify theme app extension
//
// SC_API_BASE overrides where the widget fetches /api/rate-card from.
import { build, transform } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const api = process.env.SC_API_BASE || "https://santander-calc-demo.vercel.app";
const src = (f) => path.join(root, "widget/src", f);
const out = (f) => path.join(root, f);

// esbuild doesn't touch CSS inside a template string — minify styles.ts's
// stylesheet as real CSS before bundling (≈2 KB off every bundle).
const minifyCss = {
  name: "minify-css",
  setup(b) {
    b.onLoad({ filter: /styles\.ts$/ }, async (args) => {
      const source = readFileSync(args.path, "utf8");
      const css = source.slice(source.indexOf("`") + 1, source.lastIndexOf("`"));
      const { code } = await transform(css, { loader: "css", minify: true });
      return { contents: `export const css = ${JSON.stringify(code.trim())};`, loader: "ts" };
    });
  },
};

const common = {
  plugins: [minifyCss],
  bundle: true,
  minify: true,
  target: ["es2022"],
  define: { __SC_API__: JSON.stringify(api) },
  banner: { js: `/*! santander-calc v${pkg.version} — generated from widget/src, do not edit */` },
  legalComments: "none",
  logLevel: "warning",
};

await Promise.all([
  build({ ...common, entryPoints: [src("index.ts")], format: "esm", outfile: out("dist/index.js") }),
  build({ ...common, entryPoints: [src("loader.ts")], format: "iife", outfile: out("dist/loader.js") }),
  build({ ...common, entryPoints: [src("shopify.ts")], format: "iife", outfile: out("dist/santander-calc.js") }),
  build({ ...common, entryPoints: [src("shopify-boot.ts")], format: "iife", outfile: out("dist/santander-calc-boot.js") }),
]);

const copies = [
  ["dist/loader.js", "web/public/v2/loader.js"],
  ["dist/santander-calc.js", "web/public/v2/santander-calc.js"],
  ["dist/santander-calc.js", "shopify/extensions/santander-calc/assets/santander-calc.js"],
  ["dist/santander-calc-boot.js", "shopify/extensions/santander-calc/assets/santander-calc-boot.js"],
];
// `npm run release:loader` also replaces the v1 ./loader.js that jsDelivr and
// GitHub Pages serve — only once the Vercel API is live.
if (process.argv.includes("--release-loader")) copies.push(["dist/loader.js", "loader.js"]);
for (const [from, to] of copies) {
  mkdirSync(path.dirname(out(to)), { recursive: true });
  copyFileSync(out(from), out(to));
}

console.log(`widget built (api: ${api})`);
