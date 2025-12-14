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
        header: "Inter",
        body: "Inter",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#1a1625",           // Deep purple background
          lightgray: "#2d2438",       // Slightly lighter purple
          gray: "#7c7c99",            // Muted purple-gray
          darkgray: "#e8d5b7",        // Warm beige text
          dark: "#ffd4a3",            // Peachy orange for headings
          secondary: "#ff8552",       // Bright sunset orange for links
          tertiary: "#ffb380",        // Light orange accent
          highlight: "rgba(255, 133, 82, 0.15)", // Orange highlight
          textHighlight: "#ff855288", // Orange text highlight
        },
        darkMode: {
          light: "#0f0d15",           // Even darker purple
          lightgray: "#1f1a2e",       // Dark purple
          gray: "#5c5c79",            // Darker muted purple
          darkgray: "#e8d5b7",        // Warm beige
          dark: "#ffd4a3",            // Peachy orange
          secondary: "#ff8552",       // Sunset orange
          tertiary: "#ffb380",        // Light orange
          highlight: "rgba(255, 133, 82, 0.15)",
          textHighlight: "#ff855288",
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
