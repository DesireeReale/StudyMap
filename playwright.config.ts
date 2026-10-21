import { defineConfig } from "@playwright/test";
import { loadTestEnv } from "./tests/test-env";

const port = 3100;

export default defineConfig({
  testDir: "e2e",
  workers: 2,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `npx next dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...loadTestEnv(), AI_MOCK_DELAY_MS: "2000" },
  },
});
