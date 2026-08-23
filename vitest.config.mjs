import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The calculation engine is pure JavaScript — no DOM needed. Component
    // tests opt into jsdom with a `@vitest-environment` docblock.
    environment: "node",
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
