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
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Geist Mono",
        body: "Geist Mono",
        code: "Geist Mono",
      },
      colors: {
        lightMode: {
          light: "#FFFCF0",           // bg: paper
          lightgray: "#E6E4D9",       // ui: base-100
          gray: "#B7B5AC",            // tx-3: base-300
          darkgray: "#6F6E69",        // tx-2: base-600
          dark: "#100F0F",            // tx: black
          secondary: "#205EA6",       // bl: blue-600
          tertiary: "#24837B",        // cy: cyan-600
          highlight: "rgba(32, 94, 166, 0.15)",
          textHighlight: "#AD830188", // ye: yellow-600 with transparency
        },
        darkMode: {
          light: "#100F0F",           // bg: black
          lightgray: "#282726",       // ui: base-900
          gray: "#575653",            // tx-3: base-700
          darkgray: "#878580",        // tx-2: base-500
          dark: "#CECDC3",            // tx: base-200
          secondary: "#4385BE",       // bl: blue-400
          tertiary: "#3AA99F",        // cy: cyan-400
          highlight: "rgba(67, 133, 190, 0.15)",
          textHighlight: "#D0A21588", // ye: yellow-400 with transparency
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
      Plugin.CustomOgImages(),
    ],
  },
}
export default config