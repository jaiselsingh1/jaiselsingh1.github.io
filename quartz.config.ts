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
        header: "MonoLisa",
        body: "MonoLisa",
        code: "MonoLisa",
      },
      colors: {
        lightMode: {
          light: "#F7F5F2",
          lightgray: "#EEEAE4",
          gray: "#D1CCC5",
          darkgray: "#5B5954",
          dark: "#1B1A18",
          secondary: "#2E4A66",
          tertiary: "#688199",
          highlight: "rgba(46, 74, 102, 0.10)",
          textHighlight: "#2E4A6620",
        },
        darkMode: {
          light: "#12110F",
          lightgray: "#1A1917",
          gray: "#3E3A36",
          darkgray: "#C7C1BA",
          dark: "#F0ECE6",
          secondary: "#7AA0C0",
          tertiary: "#9BB6CC",
          highlight: "rgba(122, 160, 192, 0.18)",
          textHighlight: "#7AA0C033",
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
