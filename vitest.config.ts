import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 15000,
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 2,
        execArgv: ["--max-old-space-size=4096"],
      },
    },
    sequence: {
      concurrent: false,
    },
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        ".next/**",
        "src/__tests__/",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.d.ts",
        "public/**",
      ],
      thresholds: {
        statements: 50,
        branches: 65,
        functions: 55,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub framer-motion in tests: real animations race test unmounts in
      // happy-dom and surface as unhandled AbortError rejections.
      "framer-motion": path.resolve(__dirname, "./src/__tests__/framer-motion-stub.tsx"),
    },
  },
});
