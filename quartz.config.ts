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
          light: "#FAFAFA",           // bg: near-white
          lightgray: "#F0F0F0",       // bg-2: light gray
          gray: "#B0B0B0",            // ui-3: medium gray
          darkgray: "#5C5C5C",        // tx-2: dark gray
          dark: "#1A1A1A",            // tx: near-black
          secondary: "#E63946",       // accent: refined red
          tertiary: "#457B9D",        // secondary accent: muted blue
          highlight: "rgba(230, 57, 70, 0.08)",
          textHighlight: "#E6394622",
        },
        darkMode: {
          light: "#0D0D0D",           // bg: deep black
          lightgray: "#1A1A1A",       // bg-2: slightly lighter
          gray: "#404040",            // ui-3: medium gray
          darkgray: "#A0A0A0",        // tx-2: light gray
          dark: "#F0F0F0",            // tx: near-white
          secondary: "#E63946",       // accent: same red
          tertiary: "#A8DADC",        // secondary: soft cyan
          highlight: "rgba(230, 57, 70, 0.12)",
          textHighlight: "#E6394633",
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
          light: "solarized-light",
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