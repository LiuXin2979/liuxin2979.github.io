import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://liuxin2979.github.io",
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
    },
  },
});
