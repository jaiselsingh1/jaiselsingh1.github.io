---
title: From Bandits To AlphaGo
description: >-
  A visual note on how exploration, UCB, PUCT, MCTS, and value-policy networks
  fit together.
tags:
  - notes
  - reinforcement-learning
  - alphago
date: "2026-05-27"
sourceNote: Obsidian/labspace/Bandits-RL/Alpha Go lecture.md
sourceUpdated: "2026-05-27"
sourceDigest: 35bba01edde3
---

[<- Notes](/notes)

# From Bandits To AlphaGo

_A visual note from [Dwarkesh Patel's conversation with Eric Jang](https://www.dwarkesh.com/p/eric-jang) and my working Obsidian notes. The YouTube version is useful for the chalkboard walkthrough: [Building AlphaGo from scratch](https://youtu.be/X_ZVSPcZhtw?si=pu5tTjk1leVFcr8M)._

AlphaGo is a clean bridge between the small toy problems in reinforcement learning and the systems people actually remember: search, learning from experience, and self-play all touch the same object. The path starts with a bandit, where the only question is "which arm should I try next?", and ends with a Go player that uses a neural net to guide a tree search on every move.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/exploration-exploitation.png" alt="Reward distributions and confidence intervals for four bandit arms." />
  <figcaption>The bandit problem separates the hidden reward distributions from the learner's current estimates. Exploration is valuable where uncertainty is still wide.</figcaption>
</figure>

## Bandits: The Small Version

In a multi-armed bandit, each arm has a reward distribution $R_i$ with mean $\mu_i$. You do not know those means ahead of time. You learn them by pulling arms, collecting rewards, and updating empirical averages.

The tension is simple:

- **Exploit**: pull the arm with the best current empirical mean.
- **Explore**: pull arms whose means are still uncertain.

Epsilon-greedy makes that tradeoff explicit. With probability $\epsilon$, pull a random arm. With probability $1 - \epsilon$, pull the arm with the highest empirical mean.

```text
for each turn:
  with probability epsilon:
    pull a random arm
  otherwise:
    pull the arm with the highest empirical mean
```

That works, but it leaves a meaningful choice outside the algorithm: you have to pick $\epsilon$.

## UCB: Optimism As A Rule

Upper Confidence Bound algorithms make exploration feel less like a knob and more like a consequence of uncertainty. Instead of asking for the best empirical mean alone, UCB scores each arm by:

$$
\bar{x}_i + \sqrt{\frac{2\log t}{N_i(t)}}
$$

The first term is what you currently believe. The second term is a bonus for not knowing enough yet.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/ucb-bonus.png" alt="The UCB bonus decays as an arm is sampled more often." />
  <figcaption>UCB is not random dithering. It turns uncertainty into a bonus term, so rarely sampled arms can temporarily outrank arms with higher empirical means.</figcaption>
</figure>

As an arm gets pulled more often, $N_i(t)$ grows and the uncertainty bonus shrinks. As time passes, $\log t$ grows slowly, so neglected arms can still become worth revisiting. This is the nice property: exploration is coupled to evidence.

Regret is the usual way to measure whether this is working:

$$
\operatorname{Regret}(T) = T\mu_* - \sum_{t=1}^{T} r_t
$$

It asks how much reward you left on the table compared with always pulling the best arm.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/regret-curves.png" alt="Cumulative reward and regret definition." />
  <figcaption>Regret is the cumulative gap between the learner and the best fixed arm in hindsight.</figcaption>
</figure>

## From UCB To PUCT

AlphaGo uses the same basic instinct as UCB, but inside a tree. The decision is no longer "which bandit arm?" It is "which child move from this board position?"

The PUCT score looks like:

$$
a^* = \arg\max_a \left(Q(s,a) + c_{\mathrm{puct}} \frac{P(s,a)\sqrt{N(s)}}{1 + N(s,a)}\right)
$$

The $Q(s,a)$ term is the backed-up value estimate. The $P(s,a)$ term is the neural network's prior over plausible moves. The visit counts keep the search from staring at the same child forever.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/ucb-to-puct.png" alt="UCB and PUCT as index rules over different objects." />
  <figcaption>PUCT keeps the index-rule shape of UCB, but scores child edges in a search tree and weights exploration by a learned policy prior.</figcaption>
</figure>

This is the conceptual jump: in ordinary UCB, uncertainty is mostly a function of counts. In AlphaGo, the exploration term is also shaped by a learned prior over moves.

## MCTS: Search On Every Move

Monte Carlo Tree Search is the procedure that turns those scores into an actual move. For each real move, AlphaGo rebuilds or reuses a search tree around the current board position and runs many simulations.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/mcts-loop.png" alt="One simulation through an MCTS tree." />
  <figcaption>Each simulation descends by PUCT, expands a leaf, evaluates it with the network, and backs the value up along the selected path.</figcaption>
</figure>

Each simulation has four steps:

1. **Selection**: start at the root and repeatedly choose the child with the best PUCT score.
2. **Expansion**: when the search reaches a leaf, add child edges for legal moves.
3. **Evaluation**: ask the neural network for a policy prior $\pi_\theta(a \mid s)$ and value estimate $V_\theta(s)$.
4. **Backup**: propagate the leaf value back up the path, updating visit counts and action values.

The value estimate is important because it is a shortcut. Without a learned value function, you would need to play out the game to know whether a line was good. With $V_\theta(s) \approx p(\text{win})$, the search can stop early and still get a useful signal.

## The Network: Policy And Value

The Go board can be encoded like an image: one plane for black stones, one for white stones, and another for empty or auxiliary state. A ResNet is a natural fit because local board patterns matter a lot.

<figure class="alphago-figure alphago-image-figure">
  <img src="/static/alphago/policy-value-network.png" alt="Board encoding, policy/value heads, and self-play improvement loop." />
  <figcaption>The network gives MCTS both a prior over legal moves and a value estimate; self-play trains the network toward the stronger targets produced by search.</figcaption>
</figure>

The trunk produces two heads:

- $\pi_\theta(a \mid s)$: a distribution over moves, often thought of as logits over the board intersections.
- $V_\theta(s)$: a scalar estimate of the current player's chance of winning.

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

## Still Chewing On

- At the end of the game, your leaf nodes are going to tell you if you "won" or "lost" in some deterministic way but how do you actually propagate that up the tree?
- Within the lecture, Eric notes that ResNets do outperform the transformer architectures due to the local inductive bias w/ the convolutions vs the transformer architectures (you could pool global w/ the resnets too i think?)
- what about temporal information?
- Fork Eric's repo (https://github.com/ericjang/autogo) and try the 2v2 scenario which is when you don't have complete information and are limited by partial observability
- Original paper started by initialising using a SL dataset of human play
- later this was removed -> when it was taught to self play (start with SL for your own experiments) -> initial state is very important in DL
