import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import chokidar from "chokidar"
import matter from "gray-matter"
import prettier from "prettier"

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const args = new Set(process.argv.slice(2))

function noteConfig(config) {
  const sourcePath = process.env[config.sourceEnv] ?? config.defaultSourcePath
  const slug = config.slug

  return {
    ...config,
    sourcePath,
    vaultRoot: path.resolve(sourcePath, "../../"),
    targetPath: path.join(rootDir, `content/notes/${slug}.md`),
    attachmentDir: path.join(rootDir, `content/notes/${slug}-assets`),
    publicAttachmentPath: `./${slug}-assets`,
  }
}

const notes = [
  noteConfig({
    id: "alphago",
    slug: "from-bandits-to-alphago",
    sourceEnv: "ALPHAGO_SOURCE_NOTE",
    defaultSourcePath: "/Users/jaisel/Documents/Obsidian/labspace/Bandits-RL/Alpha Go lecture.md",
    sourceNote: "Obsidian/labspace/Bandits-RL/Alpha Go lecture.md",
    staticDir: "alphago",
    figureClass: "alphago-figure",
    imageFigureClass: "alphago-image-figure",
    render: renderAlphaGoArticle,
  }),
  noteConfig({
    id: "filtering",
    slug: "filtering-estimation-kalman-filters",
    sourceEnv: "FILTERING_SOURCE_NOTE",
    defaultSourcePath:
      "/Users/jaisel/Documents/Obsidian/labspace/Filtering-Estimation/RLabbe KF Book.md",
    sourceNote: "Obsidian/labspace/Filtering-Estimation/RLabbe KF Book.md",
    staticDir: "filtering",
    figureClass: "filtering-figure",
    imageFigureClass: "filtering-image-figure",
    render: renderFilteringArticle,
  }),
]

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

function alphaGoThreads(body) {
  const threads = []

  if (body.includes("ResNets")) {
    threads.push(
      "How much of AlphaGo's architecture choice is about local board geometry, and where would transformer-style global attention actually help?",
    )
  }

  if (body.includes("partial observability") || body.includes("autogo")) {
    threads.push(
      "What changes in the 2v2/partial-observability setting, where the state is no longer complete and search cannot rely on the same perfect-information assumptions?",
    )
  }

  if (body.includes("value head and policy head disagree")) {
    threads.push(
      "How should a system diagnose and correct disagreement between the policy head's preferred move and the value head's preferred successor state?",
    )
  }

  if (body.includes("resigning") || body.includes("terminal values")) {
    threads.push(
      "How much does resignation or weak late-game coverage bias the value function, especially when the most useful evaluations are in the middle of the game?",
    )
  }

  if (body.includes("Test time scaling")) {
    threads.push(
      "How smooth is the test-time scaling curve: how much better does play get as the number of MCTS simulations increases?",
    )
  }

  if (body.includes("DAgger")) {
    threads.push(
      "The self-play loop resembles dataset aggregation: MCTS relabels the policy with stronger actions, but only to the extent that the search/value estimates are reliable.",
    )
  }

  return threads
}

function filteringThreads(body) {
  const threads = []
  const lowerBody = body.toLowerCase()

  if (lowerBody.includes("detect and/or estimate changes in the process model")) {
    threads.push(
      "How can a filter detect model drift when the changing part of the process is not directly measured?",
    )
  }

  if (lowerBody.includes("lag error") || lowerBody.includes("systematic lag")) {
    threads.push(
      "When should lag be treated as a tuning problem, and when is it evidence that the state model needs acceleration or a different process term?",
    )
  }

  if (
    lowerBody.includes("not lie to the filter") ||
    lowerBody.includes("not to lie to the filter")
  ) {
    threads.push(
      "How should gains or covariance terms be chosen from real sensor behavior instead of tuned to one convenient data set?",
    )
  }

  if (lowerBody.includes("multidimensional systems")) {
    threads.push(
      "Where does the histogram filter become computationally unreasonable, and what approximation should replace it?",
    )
  }

  if (lowerBody.includes("particle filters")) {
    threads.push(
      "Which tracking problems require preserving multimodality with particles instead of collapsing belief to one Gaussian?",
    )
  }

  return threads
}

function resolveAttachment(note, rawTarget) {
  const withoutAlias = rawTarget.split("|")[0]?.split("#")[0]?.trim()
  if (!withoutAlias) return undefined

  const candidates = []
  if (path.isAbsolute(withoutAlias)) {
    candidates.push(withoutAlias)
  } else {
    candidates.push(path.resolve(path.dirname(note.sourcePath), withoutAlias))
    candidates.push(path.resolve(note.vaultRoot, withoutAlias))
    candidates.push(path.resolve(note.vaultRoot, "Images", path.basename(withoutAlias)))
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

async function copySourceAttachments(note, body) {
  const matches = [
    ...body.matchAll(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif|svg))(?:\|[^\]]*)?\]\]/gi),
    ...body.matchAll(/!\[[^\]]*\]\(([^)]+\.(?:png|jpe?g|webp|gif|svg))\)/gi),
  ]

  if (matches.length === 0) return []

  await mkdir(note.attachmentDir, { recursive: true })

  const copied = []
  for (const match of matches) {
    const candidates = resolveAttachment(note, decodeURI(match[1]))
    if (!candidates) continue

    const src = await firstExisting(candidates)
    if (!src) continue

    const safeName = path.basename(src).replace(/[^\w.-]+/g, "-")
    const dest = path.join(note.attachmentDir, safeName)
    await copyFile(src, dest)
    copied.push({
      alt: path.basename(src, path.extname(src)).replaceAll("-", " "),
      href: `${note.publicAttachmentPath}/${safeName}`,
    })
  }

  return copied
}

function figure(note, name, alt, caption) {
  return `<figure class="${note.figureClass} ${note.imageFigureClass}">
  <img src="/static/${note.staticDir}/${name}.png" alt="${alt}" />
  <figcaption>${caption}</figcaption>
</figure>`
}

function attachmentSection(note, attachments) {
  if (attachments.length === 0) return ""

  const figures = attachments
    .map((asset) => {
      return `<figure class="${note.figureClass} ${note.imageFigureClass}">
  <img src="${asset.href}" alt="${asset.alt}" />
  <figcaption>Attachment synced from the Obsidian source note.</figcaption>
</figure>`
    })
    .join("\n\n")

  return `\n## Synced Source Attachments\n\n${figures}\n`
}

function threadSection(threads) {
  if (threads.length === 0) return ""

  return `\n## Open Questions\n\n${threads.map((line) => `- ${line}`).join("\n")}\n`
}

function renderAlphaGoArticle({ note, body, data, attachments, sourceUpdated, digest }) {
  const title = frontmatterValue(data.title, "From Bandits To AlphaGo")
  const description = frontmatterValue(
    data.description,
    "A visual note on how bandits, UCB, PUCT, MCTS, policy/value networks, and self-play fit together.",
  )
  const threads = alphaGoThreads(body)

  const article = `[<- Notes](/notes)

# ${title}

_A curated public version of my Obsidian notes from [Dwarkesh Patel's conversation with Eric Jang](https://www.dwarkesh.com/p/eric-jang). The YouTube version is useful for the chalkboard walkthrough: [Building AlphaGo from scratch](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)._

AlphaGo is useful because it separates a hard problem into three coupled computations:

1. A fast neural network estimates a policy and a value for the current board.
2. Monte Carlo Tree Search spends test-time compute to improve the local policy around that board.
3. Self-play turns the search-improved decisions back into training data for the next network.

The path to that system starts with a smaller question: when you do not know which action is best, how should you trade off exploiting your current estimate against exploring what you have not measured well?

${figure(
  note,
  "exploration-exploitation",
  "Reward distributions and confidence intervals for four bandit arms.",
  "The bandit problem separates the hidden reward distributions from the learner's current estimates. Exploration is valuable where uncertainty is still wide.",
)}

## Bandits: The Small Version

In a multi-armed bandit, there are $k$ arms. Each arm $i$ has a reward distribution $R_i$ with unknown mean $\\mu_i$. On each turn, the learner pulls one arm, observes one reward, and updates its estimate of that arm's mean.

If $N_i(t)$ is the number of times arm $i$ has been pulled by time $t$, and $r_{i,j}$ are the observed rewards from that arm, the empirical mean is:

$$
\\bar{x}_i(t) = \\frac{1}{N_i(t)} \\sum_{j=1}^{N_i(t)} r_{i,j}
$$

The tension is simple:

- **Exploit**: pull the arm with the best current empirical mean.
- **Explore**: pull arms whose means are still uncertain.

Epsilon-greedy makes that tradeoff explicit. With probability $\\epsilon$, pull a random arm. With probability $1 - \\epsilon$, pull the arm with the highest empirical mean.

\`\`\`text
for each turn:
  with probability epsilon:
    pull a random arm
  otherwise:
    pull best empirical-mean arm
\`\`\`

That works, and it is often the right baseline. But it leaves a meaningful choice outside the algorithm: you have to pick $\\epsilon$. A high $\\epsilon$ keeps sampling weak arms for too long; a low $\\epsilon$ can prematurely lock onto a lucky estimate.

## UCB: Optimism As A Rule

Upper Confidence Bound algorithms make exploration a consequence of uncertainty. Instead of asking for the best empirical mean alone, UCB scores each arm by:

$$
\\bar{x}_i + \\sqrt{\\frac{2\\log t}{N_i(t)}}
$$

The first term is exploitation: what the data currently says. The second term is an exploration bonus: how much optimism the algorithm assigns because the arm has not been measured enough.

${figure(
  note,
  "ucb-bonus",
  "The UCB bonus decays as an arm is sampled more often.",
  "UCB is not random dithering. It turns uncertainty into a bonus term, so rarely sampled arms can temporarily outrank arms with higher empirical means.",
)}

For fixed $t$, the bonus falls like $1 / \\sqrt{N_i(t)}$: repeated pulls shrink uncertainty. As time passes, $\\log t$ grows slowly, so an arm that has been ignored for a long time can become worth revisiting. UCB therefore does not need random exploration in the same way epsilon-greedy does. It assigns each action an optimistic index and takes the action with the highest index.

Regret is the usual way to measure whether this is working:

$$
\\operatorname{Regret}(T) = T\\mu_* - \\sum_{t=1}^{T} r_t
$$

It asks how much reward you left on the table compared with always pulling the best arm.

${figure(
  note,
  "regret-curves",
  "Cumulative reward and regret definition.",
  "Regret is the cumulative gap between the learner and the best fixed arm in hindsight.",
)}

The important point is not the exact constant in the bound. It is that UCB-style algorithms can get sublinear regret in the clean stochastic setting. Average regret goes down because the learner spends only a controlled amount of time on actions that are probably bad.

## From UCB To PUCT

AlphaGo uses the same index-rule instinct inside a game tree. The decision is no longer "which bandit arm should I pull?" It is "which move edge $(s,a)$ should search follow from this board position?"

The PUCT score looks like:

$$
\\begin{aligned}
a^* = \\arg\\max_a\\; &Q(s,a) \\\\
&+ c_{\\mathrm{puct}} \\frac{P(s,a)\\sqrt{N(s)}}{1 + N(s,a)}
\\end{aligned}
$$

The $Q(s,a)$ term is the backed-up value estimate for taking move $a$ from state $s$. The $P(s,a)$ term is the neural network's prior probability for that move. $N(s)$ is the number of visits to the parent state, and $N(s,a)$ is the number of visits to the child edge.

${figure(
  note,
  "ucb-to-puct",
  "UCB and PUCT as index rules over different objects.",
  "PUCT keeps the index-rule shape of UCB, but scores child edges in a search tree and weights exploration by a learned policy prior.",
)}

This is the conceptual jump: in ordinary UCB, optimism is mostly count-based. In PUCT, optimism is also policy-shaped. Moves the network thinks are plausible get more search attention early; moves that have already been searched heavily lose their bonus through the $1 + N(s,a)$ denominator.

Go is deterministic, so the uncertainty here is not "what reward will this stochastic arm sample?" It is "what would happen if I spent more compute under this move?" PUCT turns search budget into a scarce resource and allocates it using both evidence and learned prior knowledge.

## MCTS: Search On Every Move

Monte Carlo Tree Search is the procedure that turns those scores into an actual move. At each board position, AlphaGo runs many simulations rooted at the current state. A simulation is not a full game in the human sense; it is one pass through the current search tree that expands or updates a small part of it.

${figure(
  note,
  "mcts-loop",
  "One simulation through an MCTS tree.",
  "Each simulation descends by PUCT, expands a leaf, evaluates it with the network, and backs the value up along the selected path.",
)}

Each simulation has four steps:

1. **Selection**: start at the root and repeatedly choose the child edge with the best PUCT score.
2. **Expansion**: when the search reaches a new leaf, add child edges for legal moves from that board.
3. **Evaluation**: ask the neural network for policy priors $P(s, \\cdot)$ and a value estimate $V_\\theta(s)$.
4. **Backup**: propagate the leaf value back along the selected path, updating visit counts and action values.

The backup step is what makes a local leaf evaluation affect earlier decisions. If a simulation returns value $v$, the edge statistics update roughly as:

$$
N(s,a) \\leftarrow N(s,a) + 1
$$

$$
Q(s,a) \\leftarrow Q(s,a) + \\frac{v - Q(s,a)}{N(s,a)}
$$

In a zero-sum game, the value is interpreted from the current player's perspective. When the path crosses to the opponent's turn, the value must be flipped or negated depending on the value convention. The note version of this is: if $x$ is good for player one, then $1 - x$ is good for player two when values are represented as win probabilities.

The value estimate is important because it is a shortcut. Without a learned value function, you would need to play out the game to know whether a line was good. With $V_\\theta(s) \\approx p(\\text{win})$, the search can stop early and still get a useful signal.

The original AlphaGo used both a value network and rollout evaluations. A leaf could be scored by blending the learned value with a rollout value:

$$
\\alpha V_\\theta(s) + (1 - \\alpha)V_{\\mathrm{rollout}}(s)
$$

The rollout policy played forward cheaply from the leaf rather than running a full search again. Later AlphaGo-style systems leaned harder on learned values and self-play, and AlphaGo Zero removed human data and rollouts entirely. That change matters: the system becomes less a hand-built search-plus-rollout engine and more a loop where search trains the network that later makes search stronger.

## The Network: Policy And Value

The Go board can be encoded as a stack of feature planes: current-player stones, opponent stones, empty intersections, history, legal-move masks, or other auxiliary state depending on the implementation. Conceptually it is image-like, but the pixels are board facts rather than colors.

${figure(
  note,
  "policy-value-network",
  "Board encoding, policy/value heads, and self-play improvement loop.",
  "The network gives MCTS both a prior over legal moves and a value estimate; self-play trains the network toward the stronger targets produced by search.",
)}

A convolutional ResNet is a natural fit because Go contains many local spatial patterns: ladders, eyes, liberties, shape, connection, and territory. Global coordination matters too, but the local inductive bias is valuable enough that ResNets remain a strong default for this kind of board state.

The network trunk produces two heads:

- $\\pi_\\theta(a \\mid s)$: a distribution over moves, often thought of as logits over the board intersections.
- $V_\\theta(s)$: a scalar estimate of the current player's chance of winning.

The policy head makes search cheaper. In principle, a value network alone can induce a policy: try every legal move, run the value network on every successor board, and choose the move with the best value. But that requires a forward pass for each candidate successor. Batching helps, but it is still an expensive way to answer "which moves are worth considering?"

The policy head amortizes that work. One forward pass gives a distribution over legal moves, and MCTS can focus its branching factor around moves the network thinks are plausible. The value head solves the complementary problem: it lets search stop before terminal states while still getting a prediction about the likely winner.

The two heads can disagree. The policy head can prefer a move that looks natural from pattern recognition, while the value head may score a different successor as better after evaluation. MCTS is one mechanism for resolving that tension, but alignment between the heads matters because both are used to steer the same search.

## Self-Play

The self-play loop is easiest to understand if there are two policies in mind:

- $\\pi_\\theta(a \\mid s)$: the fast neural network policy from one forward pass.
- $\\pi_{\\mathrm{MCTS}}(a \\mid s)$: the slower search policy produced after many simulations.

After search, the MCTS policy is usually derived from visit counts:

$$
\\pi_{\\mathrm{MCTS}}(a \\mid s) =
\\frac{N(s,a)^{1 / \\tau}}{\\sum_b N(s,b)^{1 / \\tau}}
$$

Here $\\tau$ controls how sharp the distribution is. High temperature preserves exploration; low temperature concentrates probability on the most visited moves.

The training loop is:

1. Use the current network to guide search.
2. Let MCTS produce a stronger move distribution from the current board.
3. Store the board, the search policy, and the eventual game outcome.
4. Train the network to predict the search policy and the outcome.
5. Repeat with the improved network.

This is the reinforcement learning part in a more concrete form. The system is not only receiving terminal rewards and hoping credit assignment works out. MCTS creates improved local policy targets during self-play, and supervised updates compress those expensive search results back into the fast network. The next round of search then starts from a better prior and a better value estimate.

This also explains why test-time scaling matters. More simulations at inference can produce a stronger $\\pi_{\\mathrm{MCTS}}$ because the agent spends more compute examining the local game tree. The neural network is fast intuition; search is slow deliberation; training distills some of that deliberation back into intuition.

There is a useful analogy to DAgger in robotics. In DAgger, an expert relabels states visited by the learner so the policy trains on better actions in the distribution it actually encounters. In AlphaGo-style self-play, MCTS plays the role of a computational expert: it relabels positions with a search-improved action distribution. The analogy has limits because MCTS is not an oracle. Its targets are only as good as the search budget, the policy prior, the value function, and the states the system has learned to evaluate.

That caveat shows up around resignations and late-game data. If games often end by resignation, the value function may see fewer true terminal continuations. Terminal positions are easy to label, and opening positions are often near $0.5$, but the middle game is where value prediction does the most work. A system that evaluates middle-game positions well can cut away enormous parts of the tree without pretending the worst-case complexity of Go has disappeared.

The main lesson is that AlphaGo converts search into data and data back into better search. Bandits explain the exploration pressure; PUCT adapts that pressure to tree edges using a learned prior; MCTS turns compute into a stronger local policy; self-play trains the network to approximate the result.

${threadSection(threads)}

## References

- Dwarkesh Patel, [Eric Jang - Building AlphaGo from scratch](https://www.dwarkesh.com/p/eric-jang)
- YouTube, [Dwarkesh Podcast with Eric Jang](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)
- Eric Jang, [autogo](https://github.com/ericjang/autogo)
- Peter Auer, Nicol\u00f2 Cesa-Bianchi, and Paul Fischer, [Finite-time Analysis of the Multiarmed Bandit Problem](https://link.springer.com/article/10.1023/A:1013689704352)
- Cameron Browne et al., [A Survey of Monte Carlo Tree Search Methods](https://ieeexplore.ieee.org/document/6145622)
- David Silver et al., [Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961)
- David Silver et al., [Mastering the game of Go without human knowledge](https://www.nature.com/articles/nature24270)
${attachmentSection(note, attachments)}
`

  const frontmatter = {
    title,
    description,
    tags: ["notes", "reinforcement-learning", "alphago"],
    date: frontmatterValue(data.date, "2026-05-27"),
    sourceNote: note.sourceNote,
    sourceUpdated,
    sourceDigest: digest,
  }

  return matter.stringify(article, frontmatter)
}

function renderFilteringArticle({ note, body, data, attachments, sourceUpdated, digest }) {
  const title = frontmatterValue(data.title, "Filtering, Estimation, And Kalman Filters")
  const description = frontmatterValue(
    data.description,
    "A visual note on noisy sensors, predictor-corrector filters, Bayes filters, and the Kalman filter bridge.",
  )
  const threads = filteringThreads(body)

  const article = `[<- Notes](/notes)

# ${title}

_A curated public version of my Obsidian notes while working through Roger Labbe's [Kalman and Bayesian Filters in Python](https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python) and Thrun, Burgard, and Fox's [Probabilistic Robotics](https://robots.stanford.edu/probabilistic-robotics/)._

Filtering is the problem of estimating hidden state from imperfect information. A sensor reading is not the state. It is evidence about the state. A motion model is not the state either. It is a prediction about how the state should evolve. A useful filter keeps both sources of information and weights them by how trustworthy they are.

That principle is the thread from simple g-h filters to histogram Bayes filters to Kalman filters:

1. Predict what the system should do next.
2. Compare that prediction with a measurement.
3. Move the estimate by an amount justified by uncertainty.
4. Carry the new estimate and uncertainty into the next step.

${figure(
  note,
  "sensor-fusion",
  "Two noisy sensor estimates combine into a narrower posterior estimate.",
  "Independent imperfect measurements can produce a better estimate when their uncertainties are modeled. The fused estimate moves toward the more precise source and becomes narrower than either source alone.",
)}

## Noisy Sensors

Sensors are inaccurate by design in the sense that they measure the world through noise, bias, resolution limits, latency, calibration drift, and environmental effects. The right response is not to throw away a noisy reading. It is to model how noisy the reading is.

For two independent scalar Gaussian estimates, the cleanest form is precision weighting:

$$
\\mu = \\frac{\\tau_1 \\mu_1 + \\tau_2 \\mu_2}{\\tau_1 + \\tau_2},
\\quad
\\tau_i = \\frac{1}{\\sigma_i^2}
$$

Precision is inverse variance. A smaller variance gives a larger precision, so the fused mean moves closer to the more reliable estimate. The fused variance becomes:

$$
\\sigma^2 = \\frac{1}{\\tau_1 + \\tau_2}
$$

This is the mathematical version of the note's rule: never discard information when the uncertainty model is credible. The estimate should land between the inputs, and the uncertainty should reflect how much evidence supports it.

## Predictor-Corrector Loop

A filter becomes useful when measurements arrive over time. At each epoch, it alternates between a prediction step and an update step.

${figure(
  note,
  "predict-update-loop",
  "Prediction and measurement update as a recurrent filter loop.",
  "Prediction propagates the state through a process model and increases uncertainty. Measurement update uses the residual to correct the state and usually reduces uncertainty.",
)}

The prediction step uses a process model:

$$
\\hat{x}_k^- = f(\\hat{x}_{k-1}^+, u_k)
$$

The update step compares the measurement with what the prediction expected:

$$
r_k = z_k - h(\\hat{x}_k^-)
$$

The residual, also called the innovation, is the part of the measurement not explained by the prediction. A scalar update has the form:

$$
\\hat{x}_k^+ = \\hat{x}_k^- + K_k r_k
$$

The gain $K_k$ controls how far the estimate moves toward the measurement. If the prediction is trusted more, $K_k$ is small. If the measurement is trusted more, $K_k$ is large.

${figure(
  note,
  "residual-line",
  "Prediction, measurement, residual, and updated estimate on one line.",
  "The update is a movement along the residual line. The gain determines where the posterior estimate lands between prediction and measurement.",
)}

## g-h Filters

The g-h filter, also called an alpha-beta filter, is the compact version of this idea for position and rate. It tracks a value $x$ and its rate $\\dot{x}$.

\`\`\`text
x_pred = x + dx * dt
dx_pred = dx

residual = z - x_pred

x = x_pred + g * residual
dx = dx_pred + h * residual / dt
\`\`\`

The $g$ gain decides how much the position estimate follows the measurement. The $h$ gain decides how much the rate estimate changes after seeing the residual. Large gains react quickly but pass more measurement noise through. Small gains reject noise but lag behind real changes.

${figure(
  note,
  "gh-tradeoff",
  "A g-h filter trading off noise rejection against lag under model mismatch.",
  "Gains are not decoration. They encode a belief about sensor noise and process behavior. Bad gains can look good on one data set and fail when the motion changes.",
)}

This is why filters are designed, not selected ad hoc. If the real system accelerates but the model assumes constant velocity, no choice of fixed $g$ and $h$ can remove the systematic lag completely. The filter is reporting a modeling mistake, not only a tuning mistake.

## Bayesian Filters

Bayesian filtering keeps a belief distribution over state. The prior is the belief before incorporating the new measurement. The posterior is the belief after incorporating it.

For a discrete state space, prediction is:

$$
\\overline{bel}(x_k) =
\\sum_{x_{k-1}} p(x_k \\mid u_k, x_{k-1}) bel(x_{k-1})
$$

Update is:

$$
bel(x_k) = \\eta\\, p(z_k \\mid x_k)\\, \\overline{bel}(x_k)
$$

The likelihood $p(z_k \\mid x_k)$ scores how compatible the measurement is with each possible state. It does not need to sum to one over states; the normalizer $\\eta$ turns the product back into a probability distribution.

${figure(
  note,
  "histogram-bayes",
  "A histogram Bayes filter predicting by convolution and updating by likelihood multiplication.",
  "The motion model spreads belief during prediction. The measurement model concentrates belief during update. The posterior becomes the next cycle's input.",
)}

In the hallway example from the notes, the state is a categorical distribution over positions. A motion command shifts the distribution, but uncertainty about the motion spreads probability mass to neighboring cells. For translational motion, this prediction is a convolution between the current belief and a motion-error kernel.

Without probabilities, prediction looks like adding motion to a state estimate. With probabilities, prediction moves and spreads belief. That spreading is information loss. The update step can recover certainty only if the measurement is informative enough.

Histogram filters are powerful because they can represent multimodal belief. They are also expensive because they must update each state cell. In high-dimensional continuous systems, this becomes the pressure that leads to approximations.

## The Kalman Bridge

The Kalman filter is the continuous Gaussian version of the same predictor-corrector story. It assumes the belief is summarized by a mean and covariance, and in the basic form it assumes linear dynamics and linear measurements.

${figure(
  note,
  "kalman-bridge",
  "Kalman filtering as Gaussian Bayes plus a matrix predict-update pipeline.",
  "Kalman filtering preserves the Bayes filter structure while replacing full distributions with a Gaussian mean and covariance.",
)}

The linear predict step is:

$$
\\hat{x}_k^- = F_k \\hat{x}_{k-1}^+ + B_k u_k
$$

$$
P_k^- = F_k P_{k-1}^+ F_k^T + Q_k
$$

The update step is:

$$
y_k = z_k - H_k \\hat{x}_k^-
$$

$$
K_k = P_k^- H_k^T (H_k P_k^- H_k^T + R_k)^{-1}
$$

$$
\\hat{x}_k^+ = \\hat{x}_k^- + K_k y_k
$$

Here $P$ is state uncertainty, $Q$ is process noise, $R$ is measurement noise, and $H$ maps state into measurement space. The Kalman gain is not a magic knob. It is the consequence of the relative uncertainty in the prediction and the measurement.

This is the compact connection: a g-h filter uses fixed gains, a histogram Bayes filter carries an explicit probability table, and a Kalman filter carries a Gaussian belief through linear algebra. All three ask the same question at every step: given my model and my measurement, how much should my belief move?

${threadSection(threads)}

## References

- Roger Labbe, [Kalman and Bayesian Filters in Python](https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python)
- Roger Labbe, [Kalman and Bayesian Filters in Python PDF](https://drive.google.com/file/d/0By_SW19c1BfhSVFzNHc0SjduNzg/view?curius=5954&resourcekey=0-41olC9ht9xE3wQe2zHZ45A)
- Sebastian Thrun, Wolfram Burgard, and Dieter Fox, [Probabilistic Robotics](https://mitpress.mit.edu/9780262201629/probabilistic-robotics/)
- Thrun, Burgard, and Fox, [Probabilistic Robotics official site](https://robots.stanford.edu/probabilistic-robotics/)
${attachmentSection(note, attachments)}
`

  const frontmatter = {
    title,
    description,
    tags: ["notes", "filtering", "estimation", "kalman-filters"],
    date: frontmatterValue(data.date, "2026-05-30"),
    sourceNote: note.sourceNote,
    sourceUpdated,
    sourceDigest: digest,
  }

  return matter.stringify(article, frontmatter)
}

async function syncOne(note) {
  const raw = await readFile(note.sourcePath, "utf8")
  const parsed = matter(raw)
  const info = await stat(note.sourcePath)
  const sourceUpdated = formatDate(info.mtime)
  const digest = hashContent(raw)
  const attachments = await copySourceAttachments(note, parsed.content)
  const rendered = note.render({
    note,
    body: parsed.content,
    data: parsed.data,
    attachments,
    sourceUpdated,
    digest,
  })
  const formatted = await prettier.format(rendered, { filepath: note.targetPath })

  await mkdir(path.dirname(note.targetPath), { recursive: true })
  await writeFile(note.targetPath, formatted, "utf8")
  console.log(
    `Synced ${path.basename(note.sourcePath)} -> ${path.relative(rootDir, note.targetPath)}`,
  )
}

async function syncAll() {
  for (const note of notes) {
    await syncOne(note)
  }
}

function startQuartzPreview() {
  const child = spawn("npm", ["run", "quartz", "--", "build", "--serve"], {
    cwd: rootDir,
    stdio: "inherit",
  })

  return child
}

async function main() {
  await syncAll()

  if (!args.has("--watch")) return

  const quartz = args.has("--serve") ? startQuartzPreview() : undefined
  const sourceToNote = new Map(notes.map((note) => [path.resolve(note.sourcePath), note]))
  const watcher = chokidar.watch(
    notes.map((note) => note.sourcePath),
    { ignoreInitial: true },
  )

  watcher.on("change", (changedPath) => {
    const note = sourceToNote.get(path.resolve(changedPath))
    const task = note ? syncOne(note) : syncAll()
    task.catch((error) => {
      console.error(error)
    })
  })

  console.log(`Watching ${notes.map((note) => note.sourcePath).join(", ")}`)

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
