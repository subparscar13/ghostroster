import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" → src/* path alias so tests resolve it like Next does.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
