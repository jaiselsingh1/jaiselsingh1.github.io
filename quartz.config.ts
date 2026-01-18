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
          light: "#FFFCF0",           // bg: Flexoki Paper
          lightgray: "#F2F0E5",       // bg-2: Flexoki Base-50
          gray: "#B7B5AC",            // ui-3: Flexoki Base-400
          darkgray: "#6F6E69",        // tx-2: Flexoki Base-600
          dark: "#1C1B1A",            // tx: Flexoki Base-950
          secondary: "#205EA6",       // accent: Flexoki Blue-600
          tertiary: "#24837B",        // secondary accent: Flexoki Cyan-600
          highlight: "rgba(32, 94, 166, 0.10)",
          textHighlight: "#205EA622",
        },
        darkMode: {
          light: "#100F0F",           // bg: Flexoki Black
          lightgray: "#1C1B1A",       // bg-2: Flexoki Base-950
          gray: "#575653",            // ui-3: Flexoki Base-700
          darkgray: "#B7B5AC",        // tx-2: Flexoki Base-400
          dark: "#CECDC3",            // tx: Flexoki Base-200
          secondary: "#4385BE",       // accent: Flexoki Blue-400
          tertiary: "#3AA99F",        // secondary: Flexoki Cyan-400
          highlight: "rgba(67, 133, 190, 0.15)",
          textHighlight: "#4385BE33",
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
          light: "github-light",
          dark: "github-dark",
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