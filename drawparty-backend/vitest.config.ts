// DrawParty — Vitest configuration for the backend test suite.
// Runs in a Node.js environment (no DOM); uses Vitest globals so test files
// don't need explicit imports for describe/it/expect/vi.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // "text"   → printed to stdout after each run
      // "cobertura" → XML consumed by GitLab's coverage visualisation in MR diffs
      reporter: ["text", "cobertura"],
      include: ["src/services/**", "src/socket/handlers/**"],
    },
  },
});
