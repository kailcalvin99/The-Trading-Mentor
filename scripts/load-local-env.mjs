import fs from "node:fs";
import path from "node:path";

export function loadLocalEnv({ cwd = process.cwd() } = {}) {
  const envPath = path.join(cwd, ".env");
  if (!fs.existsSync(envPath)) {
    return { exists: false, path: envPath };
  }

  process.loadEnvFile(envPath);

  // Node intentionally preserves values already supplied by the shell/host.
  return { exists: true, path: envPath };
}
