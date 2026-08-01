import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const node = process.execPath;
const resetScript = resolve("scripts", "reset-local.mjs");
const testFile = resolve("test", "integrated-local-validation.test.ts");

execFileSync(node, [resetScript], {
  stdio: "inherit"
});

execFileSync(node, ["--test", "--experimental-strip-types", testFile], {
  env: {
    ...process.env,
    STR140_VALIDATE_LOCAL: "1"
  },
  stdio: "inherit"
});
