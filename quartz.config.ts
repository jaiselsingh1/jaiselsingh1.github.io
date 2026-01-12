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
          light: "#fdf6e3",           // bg: Solarized Light base3
          lightgray: "#eee8d5",       // bg-2: Solarized Light base2
          gray: "#93a1a1",            // ui-3: Solarized Light base1
          darkgray: "#657b83",        // tx-2: Solarized Light base00
          dark: "#073642",            // tx: Solarized Light base02
          secondary: "#268bd2",       // accent: Solarized Blue
          tertiary: "#2aa198",        // secondary accent: Solarized Cyan
          highlight: "rgba(38, 139, 210, 0.10)",
          textHighlight: "#268bd222",
        },
        darkMode: {
          light: "#002b36",           // bg: Solarized Dark base03
          lightgray: "#073642",       // bg-2: Solarized Dark base02
          gray: "#586e75",            // ui-3: Solarized Dark base01
          darkgray: "#839496",        // tx-2: Solarized Dark base0
          dark: "#93a1a1",            // tx: Solarized Dark base1
          secondary: "#268bd2",       // accent: Solarized Blue
          tertiary: "#2aa198",        // secondary: Solarized Cyan
          highlight: "rgba(38, 139, 210, 0.15)",
          textHighlight: "#268bd233",
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
          dark: "solarized-dark",
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