import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const TopNav: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  return (
    <nav class="top-nav" aria-label="Primary navigation">
      <a class="top-nav-home" href="/">
        {cfg.pageTitle}
      </a>
      <a class="top-nav-link" href="https://jaiselsingh1.github.io/RoBlog/">
        RoBlog
      </a>
    </nav>
  )
}

TopNav.css = `
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  font-family: var(--headerFont);
  font-size: 0.95rem;
}

.top-nav a {
  color: var(--darkgray);
  text-decoration: none;
  text-underline-offset: 0.18em;
  text-decoration-thickness: 1px;
}

.top-nav a:hover {
  color: var(--secondary);
  text-decoration: underline;
}

.top-nav-home {
  font-weight: 700;
}

.top-nav-link {
  white-space: nowrap;
}
`

export default (() => TopNav) satisfies QuartzComponentConstructor
