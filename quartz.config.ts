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
        header: "Fira Code",
        body: "Fira Code",
        code: "Fira Code",
      },
      colors: {
        lightMode: {
          light: "#FFFCF0",           // Paper
          lightgray: "#E6E4D9",       // 100
          gray: "#B7B5AC",            // 300
          darkgray: "#6F6E69",        // 600
          dark: "#100F0F",            // Black
          secondary: "#205EA6",       // Blue
          tertiary: "#24837B",        // Cyan
          highlight: "rgba(32, 94, 166, 0.15)",
          textHighlight: "#D0A21588",
        },
        darkMode: {
          light: "#100F0F",           // Black
          lightgray: "#1C1B1A",       // 950
          gray: "#878580",            // 500
          darkgray: "#CECDC3",        // 200
          dark: "#FFFCF0",            // Paper
          secondary: "#4385BE",       // Blue (adjusted for dark)
          tertiary: "#3AA99F",        // Cyan (adjusted for dark)
          highlight: "rgba(67, 133, 190, 0.15)",
          textHighlight: "#D0A21588",
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