import { defineConfig } from "@playwright/test";
import { loadTestEnv } from "./tests/test-env";

const port = 3100;

export default defineConfig({
  testDir: "scripts",
  testMatch: "landing-shots.spec.ts",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npx next dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: loadTestEnv(),
  },
});
