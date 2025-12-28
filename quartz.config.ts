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
          light: "#fdf6e3",           // bg: solarized base3
          lightgray: "#eee8d5",       // bg-2: solarized base2
          gray: "#93a1a1",            // ui-3: solarized base1
          darkgray: "#657b83",        // tx-2: solarized base00
          dark: "#586e75",            // tx: solarized base01
          secondary: "#268bd2",       // solarized blue
          tertiary: "#2aa198",        // solarized cyan
          highlight: "rgba(38, 139, 210, 0.15)",
          textHighlight: "#b5890088", // solarized yellow with transparency
        },
        darkMode: {
          light: "#100F0F",           // bg: black
          lightgray: "#282726",       // bg-2: base-900
          gray: "#575653",            // ui-3: base-700
          darkgray: "#878580",        // tx-2: base-500
          dark: "#CECDC3",            // tx: base-200
          secondary: "#4385BE",       // blue-400
          tertiary: "#3AA99F",        // cyan-400
          highlight: "rgba(67, 133, 190, 0.15)",
          textHighlight: "#D0A21588", // yellow-400 with transparency
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