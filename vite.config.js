import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";
import { name } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve("src", "index.ts"),
      name,
      formats: ["es", "umd"],
      fileName: (format) => `${name}.${format}.js`,
    },

    // If you have peer deps, include here
    rollupOptions: {
      external: [
        // "react",
        // "styled-components",
      ],
      output: {
        globals: {
          //   react: "React",
          //   "styled-components": "styled-components",
        },
      },
    },
  },
});
