import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const node = process.execPath;
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmTestArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npm test"] : ["test"];
const resetScript = resolve("scripts", "reset-local.mjs");
const testFile = resolve("test", "integrated-local-validation.test.ts");
const baselineEnv = { ...process.env };

delete baselineEnv.STR140_VALIDATE_LOCAL;

execFileSync(npmCommand, npmTestArgs, {
  env: baselineEnv,
  stdio: "inherit"
});

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
