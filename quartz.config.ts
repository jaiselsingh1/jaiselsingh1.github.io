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
        title: "Agave",
        header: "Agave",
        body: "Agave",
        code: "Agave",
      },
      colors: {
        lightMode: {
          light: "#b9bdc5",
          lightgray: "#aaadb5",
          gray: "#92959d",
          darkgray: "#36383f",
          dark: "#16161d",
          secondary: "#3c56aa",
          tertiary: "#667ad3",
          highlight: "rgba(60, 86, 170, 0.15)",
          textHighlight: "rgba(60, 86, 170, 0.15)",
        },
        darkMode: {
          light: "#16161d",
          lightgray: "#36383f",
          gray: "#575a61",
          darkgray: "#b9bdc5",
          dark: "#d2d6de",
          secondary: "#4ea494",
          tertiary: "#667ad3",
          highlight: "rgba(78, 164, 148, 0.15)",
          textHighlight: "rgba(78, 164, 148, 0.15)",
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
