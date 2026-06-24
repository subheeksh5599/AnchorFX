import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx", "**/*.test.ts", "**/*.test.tsx"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["__tests__/**", "**/*.test.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
