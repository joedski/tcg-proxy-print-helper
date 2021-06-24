// @ts-check

import * as path from "path";
import * as fs from "fs";

export function resolveImportOf(moduleName, importName) {
  const modulePath = path.resolve(__dirname, "node_modules", "uhtml");
  const packageInfoPath = path.resolve(modulePath, "package.json");
  const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, "utf-8"));
  const importPath = path.resolve(
    modulePath,
    ...packageInfo.exports[importName].import.split(path.posix.sep)
  );
  return importPath;
}
