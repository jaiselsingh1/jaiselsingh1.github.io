import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Jaisel Singh",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "jaiselsingh1.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "local",
      cdnCaching: true,
      typography: {
        header: "mononoki",
        body: "mononoki",
        code: "mononoki",
      },
      colors: {
        lightMode: {
          light: "#eff1f5",           // bg: Catppuccin Latte Base
          lightgray: "#e6e9ef",       // bg-2: Catppuccin Latte Mantle
          gray: "#ccd0da",            // ui-3: Catppuccin Latte Surface0
          darkgray: "#8c8fa1",        // tx-2: Catppuccin Latte Overlay1
          dark: "#4c4f69",            // tx: Catppuccin Latte Text
          secondary: "#d20f39",       // accent: Catppuccin Latte Red
          tertiary: "#1e66f5",        // secondary accent: Catppuccin Latte Blue
          highlight: "rgba(210, 15, 57, 0.08)",
          textHighlight: "#d20f3922",
        },
        darkMode: {
          light: "#1e1e2e",           // bg: Catppuccin Mocha Base
          lightgray: "#181825",       // bg-2: Catppuccin Mocha Mantle
          gray: "#313244",            // ui-3: Catppuccin Mocha Surface0
          darkgray: "#9399b2",        // tx-2: Catppuccin Mocha Overlay1
          dark: "#cdd6f4",            // tx: Catppuccin Mocha Text
          secondary: "#f38ba8",       // accent: Catppuccin Mocha Red
          tertiary: "#89b4fa",        // secondary: Catppuccin Mocha Blue
          highlight: "rgba(243, 139, 168, 0.12)",
          textHighlight: "#f38ba833",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "catppuccin-latte",
          dark: "catppuccin-mocha",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      // Plugin.CustomOgImages(),
    ],
  },
}
export default config