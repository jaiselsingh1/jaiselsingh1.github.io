---
title: From Bandits To AlphaGo
description: >-
  A visual note on how bandits, UCB, PUCT, MCTS, policy/value networks, and
  self-play fit together.
tags:
  - notes
  - reinforcement-learning
  - alphago
date: "2026-05-27"
sourceNote: Obsidian/labspace/Bandits-RL/Alpha Go lecture.md
sourceUpdated: "2026-05-28"
sourceDigest: 2473b71f23ee
---

[<- Notes](/notes)

# From Bandits To AlphaGo

_A curated public version of my Obsidian notes from [Dwarkesh Patel's conversation with Eric Jang](https://www.dwarkesh.com/p/eric-jang). The YouTube version is useful for the chalkboard walkthrough: [Building AlphaGo from scratch](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)._

AlphaGo is useful because it separates a hard problem into three coupled computations:

1. A fast neural network estimates a policy and a value for the current board.
2. Monte Carlo Tree Search spends test-time compute to improve the local policy around that board.
3. Self-play turns the search-improved decisions back into training data for the next network.

The path to that system starts with a smaller question: when you do not know which action is best, how should you trade off exploiting your current estimate against exploring what you have not measured well?

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/exploration-exploitation.png" alt="Reward distributions and confidence intervals for four bandit arms." />
  <figcaption>The bandit problem separates the hidden reward distributions from the learner's current estimates. Exploration is valuable where uncertainty is still wide.</figcaption>
</figure>

## Bandits: The Small Version

In a multi-armed bandit, there are $k$ arms. Each arm $i$ has a reward distribution $R_i$ with unknown mean $\mu_i$. On each turn, the learner pulls one arm, observes one reward, and updates its estimate of that arm's mean.

If $N_i(t)$ is the number of times arm $i$ has been pulled by time $t$, and $r_{i,j}$ are the observed rewards from that arm, the empirical mean is:

$$
\bar{x}_i(t) = \frac{1}{N_i(t)} \sum_{j=1}^{N_i(t)} r_{i,j}
$$

The tension is simple:

- **Exploit**: pull the arm with the best current empirical mean.
- **Explore**: pull arms whose means are still uncertain.

Epsilon-greedy makes that tradeoff explicit. With probability $\epsilon$, pull a random arm. With probability $1 - \epsilon$, pull the arm with the highest empirical mean.

```text
for each turn:
  with probability epsilon:
    pull a random arm
  otherwise:
    pull best empirical-mean arm
```

That works, and it is often the right baseline. But it leaves a meaningful choice outside the algorithm: you have to pick $\epsilon$. A high $\epsilon$ keeps sampling weak arms for too long; a low $\epsilon$ can prematurely lock onto a lucky estimate.

## UCB: Optimism As A Rule

Upper Confidence Bound algorithms make exploration a consequence of uncertainty. Instead of asking for the best empirical mean alone, UCB scores each arm by:

$$
\bar{x}_i + \sqrt{\frac{2\log t}{N_i(t)}}
$$

The first term is exploitation: what the data currently says. The second term is an exploration bonus: how much optimism the algorithm assigns because the arm has not been measured enough.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/ucb-bonus.png" alt="The UCB bonus decays as an arm is sampled more often." />
  <figcaption>UCB is not random dithering. It turns uncertainty into a bonus term, so rarely sampled arms can temporarily outrank arms with higher empirical means.</figcaption>
</figure>

For fixed $t$, the bonus falls like $1 / \sqrt{N_i(t)}$: repeated pulls shrink uncertainty. As time passes, $\log t$ grows slowly, so an arm that has been ignored for a long time can become worth revisiting. UCB therefore does not need random exploration in the same way epsilon-greedy does. It assigns each action an optimistic index and takes the action with the highest index.

Regret is the usual way to measure whether this is working:

$$
\operatorname{Regret}(T) = T\mu_* - \sum_{t=1}^{T} r_t
$$

It asks how much reward you left on the table compared with always pulling the best arm.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/regret-curves.png" alt="Cumulative reward and regret definition." />
  <figcaption>Regret is the cumulative gap between the learner and the best fixed arm in hindsight.</figcaption>
</figure>

The important point is not the exact constant in the bound. It is that UCB-style algorithms can get sublinear regret in the clean stochastic setting. Average regret goes down because the learner spends only a controlled amount of time on actions that are probably bad.

## From UCB To PUCT

AlphaGo uses the same index-rule instinct inside a game tree. The decision is no longer "which bandit arm should I pull?" It is "which move edge $(s,a)$ should search follow from this board position?"

The PUCT score looks like:

$$
\begin{aligned}
a^* = \arg\max_a\; &Q(s,a) \\
&+ c_{\mathrm{puct}} \frac{P(s,a)\sqrt{N(s)}}{1 + N(s,a)}
\end{aligned}
$$

The $Q(s,a)$ term is the backed-up value estimate for taking move $a$ from state $s$. The $P(s,a)$ term is the neural network's prior probability for that move. $N(s)$ is the number of visits to the parent state, and $N(s,a)$ is the number of visits to the child edge.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/ucb-to-puct.png" alt="UCB and PUCT as index rules over different objects." />
  <figcaption>PUCT keeps the index-rule shape of UCB, but scores child edges in a search tree and weights exploration by a learned policy prior.</figcaption>
</figure>

This is the conceptual jump: in ordinary UCB, optimism is mostly count-based. In PUCT, optimism is also policy-shaped. Moves the network thinks are plausible get more search attention early; moves that have already been searched heavily lose their bonus through the $1 + N(s,a)$ denominator.

Go is deterministic, so the uncertainty here is not "what reward will this stochastic arm sample?" It is "what would happen if I spent more compute under this move?" PUCT turns search budget into a scarce resource and allocates it using both evidence and learned prior knowledge.

## MCTS: Search On Every Move

Monte Carlo Tree Search is the procedure that turns those scores into an actual move. At each board position, AlphaGo runs many simulations rooted at the current state. A simulation is not a full game in the human sense; it is one pass through the current search tree that expands or updates a small part of it.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/mcts-loop.png" alt="One simulation through an MCTS tree." />
  <figcaption>Each simulation descends by PUCT, expands a leaf, evaluates it with the network, and backs the value up along the selected path.</figcaption>
</figure>

Each simulation has four steps:

1. **Selection**: start at the root and repeatedly choose the child edge with the best PUCT score.
2. **Expansion**: when the search reaches a new leaf, add child edges for legal moves from that board.
3. **Evaluation**: ask the neural network for policy priors $P(s, \cdot)$ and a value estimate $V_\theta(s)$.
4. **Backup**: propagate the leaf value back along the selected path, updating visit counts and action values.

The backup step is what makes a local leaf evaluation affect earlier decisions. If a simulation returns value $v$, the edge statistics update roughly as:

$$
N(s,a) \leftarrow N(s,a) + 1
$$

$$
Q(s,a) \leftarrow Q(s,a) + \frac{v - Q(s,a)}{N(s,a)}
$$

In a zero-sum game, the value is interpreted from the current player's perspective. When the path crosses to the opponent's turn, the value must be flipped or negated depending on the value convention. The note version of this is: if $x$ is good for player one, then $1 - x$ is good for player two when values are represented as win probabilities.

The value estimate is important because it is a shortcut. Without a learned value function, you would need to play out the game to know whether a line was good. With $V_\theta(s) \approx p(\text{win})$, the search can stop early and still get a useful signal.

The original AlphaGo used both a value network and rollout evaluations. A leaf could be scored by blending the learned value with a rollout value:

$$
\alpha V_\theta(s) + (1 - \alpha)V_{\mathrm{rollout}}(s)
$$

The rollout policy played forward cheaply from the leaf rather than running a full search again. Later AlphaGo-style systems leaned harder on learned values and self-play, and AlphaGo Zero removed human data and rollouts entirely. That change matters: the system becomes less a hand-built search-plus-rollout engine and more a loop where search trains the network that later makes search stronger.

## The Network: Policy And Value

The Go board can be encoded as a stack of feature planes: current-player stones, opponent stones, empty intersections, history, legal-move masks, or other auxiliary state depending on the implementation. Conceptually it is image-like, but the pixels are board facts rather than colors.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/policy-value-network.png" alt="Board encoding, policy/value heads, and self-play improvement loop." />
  <figcaption>The network gives MCTS both a prior over legal moves and a value estimate; self-play trains the network toward the stronger targets produced by search.</figcaption>
</figure>

A convolutional ResNet is a natural fit because Go contains many local spatial patterns: ladders, eyes, liberties, shape, connection, and territory. Global coordination matters too, but the local inductive bias is valuable enough that ResNets remain a strong default for this kind of board state.

The network trunk produces two heads:

- $\pi_\theta(a \mid s)$: a distribution over moves, often thought of as logits over the board intersections.
- $V_\theta(s)$: a scalar estimate of the current player's chance of winning.

The policy head makes search cheaper. In principle, a value network alone can induce a policy: try every legal move, run the value network on every successor board, and choose the move with the best value. But that requires a forward pass for each candidate successor. Batching helps, but it is still an expensive way to answer "which moves are worth considering?"

The policy head amortizes that work. One forward pass gives a distribution over legal moves, and MCTS can focus its branching factor around moves the network thinks are plausible. The value head solves the complementary problem: it lets search stop before terminal states while still getting a prediction about the likely winner.

The two heads can disagree. The policy head can prefer a move that looks natural from pattern recognition, while the value head may score a different successor as better after evaluation. MCTS is one mechanism for resolving that tension, but alignment between the heads matters because both are used to steer the same search.

## Self-Play

The self-play loop is easiest to understand if there are two policies in mind:

- $\pi_\theta(a \mid s)$: the fast neural network policy from one forward pass.
- $\pi_{\mathrm{MCTS}}(a \mid s)$: the slower search policy produced after many simulations.

After search, the MCTS policy is usually derived from visit counts:

$$
\pi_{\mathrm{MCTS}}(a \mid s) =
\frac{N(s,a)^{1 / \tau}}{\sum_b N(s,b)^{1 / \tau}}
$$

Here $\tau$ controls how sharp the distribution is. High temperature preserves exploration; low temperature concentrates probability on the most visited moves.

The training loop is:

1. Use the current network to guide search.
2. Let MCTS produce a stronger move distribution from the current board.
3. Store the board, the search policy, and the eventual game outcome.
4. Train the network to predict the search policy and the outcome.
5. Repeat with the improved network.

This is the reinforcement learning part in a more concrete form. The system is not only receiving terminal rewards and hoping credit assignment works out. MCTS creates improved local policy targets during self-play, and supervised updates compress those expensive search results back into the fast network. The next round of search then starts from a better prior and a better value estimate.

This also explains why test-time scaling matters. More simulations at inference can produce a stronger $\pi_{\mathrm{MCTS}}$ because the agent spends more compute examining the local game tree. The neural network is fast intuition; search is slow deliberation; training distills some of that deliberation back into intuition.

There is a useful analogy to DAgger in robotics. In DAgger, an expert relabels states visited by the learner so the policy trains on better actions in the distribution it actually encounters. In AlphaGo-style self-play, MCTS plays the role of a computational expert: it relabels positions with a search-improved action distribution. The analogy has limits because MCTS is not an oracle. Its targets are only as good as the search budget, the policy prior, the value function, and the states the system has learned to evaluate.

That caveat shows up around resignations and late-game data. If games often end by resignation, the value function may see fewer true terminal continuations. Terminal positions are easy to label, and opening positions are often near $0.5$, but the middle game is where value prediction does the most work. A system that evaluates middle-game positions well can cut away enormous parts of the tree without pretending the worst-case complexity of Go has disappeared.

The main lesson is that AlphaGo converts search into data and data back into better search. Bandits explain the exploration pressure; PUCT adapts that pressure to tree edges using a learned prior; MCTS turns compute into a stronger local policy; self-play trains the network to approximate the result.

## Open Questions

- How much of AlphaGo's architecture choice is about local board geometry, and where would transformer-style global attention actually help?
- What changes in the 2v2/partial-observability setting, where the state is no longer complete and search cannot rely on the same perfect-information assumptions?
- How should a system diagnose and correct disagreement between the policy head's preferred move and the value head's preferred successor state?
- How much does resignation or weak late-game coverage bias the value function, especially when the most useful evaluations are in the middle of the game?
- How smooth is the test-time scaling curve: how much better does play get as the number of MCTS simulations increases?
- The self-play loop resembles dataset aggregation: MCTS relabels the policy with stronger actions, but only to the extent that the search/value estimates are reliable.

## References

- Dwarkesh Patel, [Eric Jang - Building AlphaGo from scratch](https://www.dwarkesh.com/p/eric-jang)
- YouTube, [Dwarkesh Podcast with Eric Jang](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)
- Eric Jang, [autogo](https://github.com/ericjang/autogo)
- Peter Auer, Nicolò Cesa-Bianchi, and Paul Fischer, [Finite-time Analysis of the Multiarmed Bandit Problem](https://link.springer.com/article/10.1023/A:1013689704352)
- Cameron Browne et al., [A Survey of Monte Carlo Tree Search Methods](https://ieeexplore.ieee.org/document/6145622)
- David Silver et al., [Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961)
- David Silver et al., [Mastering the game of Go without human knowledge](https://www.nature.com/articles/nature24270)
