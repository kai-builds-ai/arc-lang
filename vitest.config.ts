import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/stdlib-native.test.ts"],
    testTimeout: 30000,
  },
});
