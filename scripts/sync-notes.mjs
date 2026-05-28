import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import chokidar from "chokidar"
import matter from "gray-matter"
import prettier from "prettier"

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const sourcePath =
  process.env.ALPHAGO_SOURCE_NOTE ??
  "/Users/jaisel/Documents/Obsidian/labspace/Bandits-RL/Alpha Go lecture.md"
const vaultRoot = path.resolve(sourcePath, "../../")
const targetPath = path.join(rootDir, "content/notes/from-bandits-to-alphago.md")
const attachmentDir = path.join(rootDir, "content/notes/from-bandits-to-alphago-assets")
const publicAttachmentPath = "./from-bandits-to-alphago-assets"

const args = new Set(process.argv.slice(2))

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12)
}

function formatDate(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}`
}

function frontmatterValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback
  return value
}

function cleanSourceBullet(line) {
  return line
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function sourceThreads(body) {
  const interesting = body
    .split("\n")
    .map(cleanSourceBullet)
    .filter(Boolean)
    .filter((line) => {
      return (
        line.includes("?") ||
        line.includes("partial observability") ||
        line.includes("SL dataset") ||
        line.includes("self play") ||
        line.includes("ResNets") ||
        line.includes("Autogo") ||
        line.includes("autogo")
      )
    })

  return [...new Set(interesting)].slice(0, 6)
}

function resolveAttachment(rawTarget) {
  const withoutAlias = rawTarget.split("|")[0]?.split("#")[0]?.trim()
  if (!withoutAlias) return undefined

  const candidates = []
  if (path.isAbsolute(withoutAlias)) {
    candidates.push(withoutAlias)
  } else {
    candidates.push(path.resolve(path.dirname(sourcePath), withoutAlias))
    candidates.push(path.resolve(vaultRoot, withoutAlias))
    candidates.push(path.resolve(vaultRoot, "Images", path.basename(withoutAlias)))
  }

  return candidates
}

async function firstExisting(paths) {
  for (const candidate of paths) {
    try {
      const info = await stat(candidate)
      if (info.isFile()) return candidate
    } catch {
      // try next candidate
    }
  }
  return undefined
}

async function copySourceAttachments(body) {
  const matches = [
    ...body.matchAll(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif|svg))(?:\|[^\]]*)?\]\]/gi),
    ...body.matchAll(/!\[[^\]]*\]\(([^)]+\.(?:png|jpe?g|webp|gif|svg))\)/gi),
  ]

  if (matches.length === 0) return []

  await mkdir(attachmentDir, { recursive: true })

  const copied = []
  for (const match of matches) {
    const candidates = resolveAttachment(decodeURI(match[1]))
    if (!candidates) continue

    const src = await firstExisting(candidates)
    if (!src) continue

    const safeName = path.basename(src).replace(/[^\w.-]+/g, "-")
    const dest = path.join(attachmentDir, safeName)
    await copyFile(src, dest)
    copied.push({
      alt: path.basename(src, path.extname(src)).replaceAll("-", " "),
      href: `${publicAttachmentPath}/${safeName}`,
    })
  }

  return copied
}

function figure(name, alt, caption) {
  return `<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/${name}.png" alt="${alt}" />
  <figcaption>${caption}</figcaption>
</figure>`
}

function attachmentSection(attachments) {
  if (attachments.length === 0) return ""

  const figures = attachments
    .map((asset) => {
      return `<figure class="alphago-figure alphago-image-figure">
  <img src="${asset.href}" alt="${asset.alt}" />
  <figcaption>Attachment synced from the Obsidian source note.</figcaption>
</figure>`
    })
    .join("\n\n")

  return `\n## Synced Source Attachments\n\n${figures}\n`
}

function threadSection(threads) {
  if (threads.length === 0) return ""

  return `\n## Still Chewing On\n\n${threads.map((line) => `- ${line}`).join("\n")}\n`
}

function renderArticle({ body, data, attachments, sourceUpdated, digest }) {
  const title = frontmatterValue(data.title, "From Bandits To AlphaGo")
  const description = frontmatterValue(
    data.description,
    "A visual note on how exploration, UCB, PUCT, MCTS, and value-policy networks fit together.",
  )
  const threads = sourceThreads(body)

  const article = `[<- Notes](/notes)

# ${title}

_A visual note from [Dwarkesh Patel's conversation with Eric Jang](https://www.dwarkesh.com/p/eric-jang) and my working Obsidian notes. The YouTube version is useful for the chalkboard walkthrough: [Building AlphaGo from scratch](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)._

AlphaGo is a clean bridge between the small toy problems in reinforcement learning and the systems people actually remember: search, learning from experience, and self-play all touch the same object. The path starts with a bandit, where the only question is "which arm should I try next?", and ends with a Go player that uses a neural net to guide a tree search on every move.

${figure(
  "exploration-exploitation",
  "Reward distributions and confidence intervals for four bandit arms.",
  "The bandit problem separates the hidden reward distributions from the learner's current estimates. Exploration is valuable where uncertainty is still wide.",
)}

## Bandits: The Small Version

In a multi-armed bandit, each arm has a reward distribution $R_i$ with mean $\\mu_i$. You do not know those means ahead of time. You learn them by pulling arms, collecting rewards, and updating empirical averages.

The tension is simple:

- **Exploit**: pull the arm with the best current empirical mean.
- **Explore**: pull arms whose means are still uncertain.

Epsilon-greedy makes that tradeoff explicit. With probability $\\epsilon$, pull a random arm. With probability $1 - \\epsilon$, pull the arm with the highest empirical mean.

\`\`\`text
for each turn:
  with probability epsilon:
    pull a random arm
  otherwise:
    pull the arm with the highest empirical mean
\`\`\`

That works, but it leaves a meaningful choice outside the algorithm: you have to pick $\\epsilon$.

## UCB: Optimism As A Rule

Upper Confidence Bound algorithms make exploration feel less like a knob and more like a consequence of uncertainty. Instead of asking for the best empirical mean alone, UCB scores each arm by:

$$
\\bar{x}_i + \\sqrt{\\frac{2\\log t}{N_i(t)}}
$$

The first term is what you currently believe. The second term is a bonus for not knowing enough yet.

${figure(
  "ucb-bonus",
  "The UCB bonus decays as an arm is sampled more often.",
  "UCB is not random dithering. It turns uncertainty into a bonus term, so rarely sampled arms can temporarily outrank arms with higher empirical means.",
)}

As an arm gets pulled more often, $N_i(t)$ grows and the uncertainty bonus shrinks. As time passes, $\\log t$ grows slowly, so neglected arms can still become worth revisiting. This is the nice property: exploration is coupled to evidence.

Regret is the usual way to measure whether this is working:

$$
\\operatorname{Regret}(T) = T\\mu_* - \\sum_{t=1}^{T} r_t
$$

It asks how much reward you left on the table compared with always pulling the best arm.

${figure(
  "regret-curves",
  "Cumulative reward and regret definition.",
  "Regret is the cumulative gap between the learner and the best fixed arm in hindsight.",
)}

## From UCB To PUCT

AlphaGo uses the same basic instinct as UCB, but inside a tree. The decision is no longer "which bandit arm?" It is "which child move from this board position?"

The PUCT score looks like:

$$
a^* = \\arg\\max_a \\left(Q(s,a) + c_{\\mathrm{puct}} \\frac{P(s,a)\\sqrt{N(s)}}{1 + N(s,a)}\\right)
$$

The $Q(s,a)$ term is the backed-up value estimate. The $P(s,a)$ term is the neural network's prior over plausible moves. The visit counts keep the search from staring at the same child forever.

${figure(
  "ucb-to-puct",
  "UCB and PUCT as index rules over different objects.",
  "PUCT keeps the index-rule shape of UCB, but scores child edges in a search tree and weights exploration by a learned policy prior.",
)}

This is the conceptual jump: in ordinary UCB, uncertainty is mostly a function of counts. In AlphaGo, the exploration term is also shaped by a learned prior over moves.

## MCTS: Search On Every Move

Monte Carlo Tree Search is the procedure that turns those scores into an actual move. For each real move, AlphaGo rebuilds or reuses a search tree around the current board position and runs many simulations.

${figure(
  "mcts-loop",
  "One simulation through an MCTS tree.",
  "Each simulation descends by PUCT, expands a leaf, evaluates it with the network, and backs the value up along the selected path.",
)}

Each simulation has four steps:

1. **Selection**: start at the root and repeatedly choose the child with the best PUCT score.
2. **Expansion**: when the search reaches a leaf, add child edges for legal moves.
3. **Evaluation**: ask the neural network for a policy prior $\\pi_\\theta(a \\mid s)$ and value estimate $V_\\theta(s)$.
4. **Backup**: propagate the leaf value back up the path, updating visit counts and action values.

The value estimate is important because it is a shortcut. Without a learned value function, you would need to play out the game to know whether a line was good. With $V_\\theta(s) \\approx p(\\text{win})$, the search can stop early and still get a useful signal.

## The Network: Policy And Value

The Go board can be encoded like an image: one plane for black stones, one for white stones, and another for empty or auxiliary state. A ResNet is a natural fit because local board patterns matter a lot.

${figure(
  "policy-value-network",
  "Board encoding, policy/value heads, and self-play improvement loop.",
  "The network gives MCTS both a prior over legal moves and a value estimate; self-play trains the network toward the stronger targets produced by search.",
)}

The trunk produces two heads:

- $\\pi_\\theta(a \\mid s)$: a distribution over moves, often thought of as logits over the board intersections.
- $V_\\theta(s)$: a scalar estimate of the current player's chance of winning.

This is why the system feels different from naive RL. MCTS does not merely sample a trajectory and hope the final reward assigns credit correctly. At each position, search can produce a stronger policy target than the raw network initially had.

## Self-Play

The original AlphaGo used supervised learning from human games before leaning into reinforcement learning. Later systems pushed harder on self-play. Either way, the loop is the same shape:

1. Use the current network to guide search.
2. Let search produce a better move distribution.
3. Train the network to imitate that stronger distribution and predict game outcomes.
4. Repeat.

That loop is what makes AlphaGo such a useful reference point. It is not just "RL did a thing." It is learning, search, and data generation braided together.

## References

- Dwarkesh Patel, [Eric Jang - Building AlphaGo from scratch](https://www.dwarkesh.com/p/eric-jang)
- YouTube, [Dwarkesh Podcast with Eric Jang](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)
- Eric Jang, [autogo](https://github.com/ericjang/autogo)
- Peter Auer, Nicolò Cesa-Bianchi, and Paul Fischer, [Finite-time Analysis of the Multiarmed Bandit Problem](https://link.springer.com/article/10.1023/A:1013689704352)
- Cameron Browne et al., [A Survey of Monte Carlo Tree Search Methods](https://ieeexplore.ieee.org/document/6145622)
- David Silver et al., [Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961)
- David Silver et al., [Mastering the game of Go without human knowledge](https://www.nature.com/articles/nature24270)
${threadSection(threads)}${attachmentSection(attachments)}
`

  const frontmatter = {
    title,
    description,
    tags: ["notes", "reinforcement-learning", "alphago"],
    date: frontmatterValue(data.date, "2026-05-27"),
    sourceNote: "Obsidian/labspace/Bandits-RL/Alpha Go lecture.md",
    sourceUpdated,
    sourceDigest: digest,
  }

  return matter.stringify(article, frontmatter)
}

async function syncOnce() {
  const raw = await readFile(sourcePath, "utf8")
  const parsed = matter(raw)
  const info = await stat(sourcePath)
  const sourceUpdated = formatDate(info.mtime)
  const digest = hashContent(raw)
  const attachments = await copySourceAttachments(parsed.content)
  const rendered = renderArticle({
    body: parsed.content,
    data: parsed.data,
    attachments,
    sourceUpdated,
    digest,
  })
  const formatted = await prettier.format(rendered, { filepath: targetPath })

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, formatted, "utf8")
  console.log(`Synced ${path.basename(sourcePath)} -> ${path.relative(rootDir, targetPath)}`)
}

function startQuartzPreview() {
  const child = spawn("npm", ["run", "quartz", "--", "build", "--serve"], {
    cwd: rootDir,
    stdio: "inherit",
  })

  return child
}

async function main() {
  await syncOnce()

  if (!args.has("--watch")) return

  const quartz = args.has("--serve") ? startQuartzPreview() : undefined
  const watcher = chokidar.watch(sourcePath, { ignoreInitial: true })

  watcher.on("change", () => {
    syncOnce().catch((error) => {
      console.error(error)
    })
  })

  console.log(`Watching ${sourcePath}`)

  const shutdown = async () => {
    await watcher.close()
    quartz?.kill("SIGTERM")
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
