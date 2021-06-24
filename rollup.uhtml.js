import { nodeResolve } from "@rollup/plugin-node-resolve";

import { resolveImportOf } from "./rollupHelpers.js";

export default {
  input: resolveImportOf("uhtml", "."),
  output: {
    file: "static/app/uhtml.mjs",
    format: "es",
  },
  plugins: [nodeResolve()],
};
