import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const outDir = new URL("../quartz/static/alphago/", import.meta.url)

const W = 1600
const H = 920

const C = {
  bg: "#fffcf0",
  ink: "#100f0f",
  muted: "#6f6b63",
  faint: "#b7b1a6",
  hair: "#d7d1c4",
  panel: "#fffdf6",
  teal: "#24837b",
  teal2: "#3aa99f",
  blue: "#4385be",
  amber: "#d0a215",
  red: "#c84a42",
  violet: "#7868b7",
}

const font = "Arial, Helvetica, sans-serif"
const mono = "Lilex, Menlo, Consolas, monospace"

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function doc(body, w = W, h = H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.ink}"/>
    </marker>
    <marker id="arrowTeal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.teal}"/>
    </marker>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.blue}"/>
    </marker>
    <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.amber}"/>
    </marker>
    <pattern id="stoneGrid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#7b632f" stroke-width="1.5" opacity=".75"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  ${body}
</svg>`
}

function text(x, y, value, size = 28, weight = 500, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function monoText(x, y, value, size = 25, weight = 500, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${mono}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function centerText(x, y, value, size = 28, weight = 500) {
  return text(x, y, value, size, weight, 'text-anchor="middle"')
}

function label(x, y, value, color = C.muted, size = 23, anchor = "start") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="500" letter-spacing="0" fill="${color}" text-anchor="${anchor}">${esc(value)}</text>`
}

function line(x1, y1, x2, y2, color = C.ink, sw = 3, extra = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`
}

function rect(x, y, w, h, fill = "none", stroke = C.ink, sw = 3, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
}

function circle(cx, cy, r, fill = C.panel, stroke = C.ink, sw = 3, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
}

function path(d, fill = "none", stroke = C.ink, sw = 3, extra = "") {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
}

function polyline(points, color = C.ink, sw = 4, extra = "") {
  return `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
}

function panel(x, y, w, h, extra = "") {
  return rect(x, y, w, h, C.panel, C.hair, 2, `rx="8" ${extra}`)
}

function axis(x, y, w, h, xLabel, yLabel) {
  const grid = [0.25, 0.5, 0.75]
    .map((t) => line(x, y + h * t, x + w, y + h * t, C.hair, 1.4))
    .join("")
  return `
    ${grid}
    ${line(x, y + h, x + w, y + h, C.ink, 3)}
    ${line(x, y, x, y + h, C.ink, 3)}
    ${label(x + w, y + h + 45, xLabel, C.muted, 24, "end")}
    ${label(x - 12, y - 18, yLabel, C.muted, 24, "start")}
  `
}

function pointsToPath(points) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ")
}

function gaussianPath({ x, y, w, h, mean, sigma, color, labelText }) {
  const pts = []
  for (let i = 0; i <= 150; i += 1) {
    const xv = i / 150
    const z = (xv - mean) / sigma
    const density = Math.exp(-0.5 * z * z)
    pts.push([x + xv * w, y + h - density * h * 0.88])
  }
  return `
    ${path(pointsToPath(pts), "none", color, 5)}
    ${line(x + mean * w, y + h, x + mean * w, y + h - 235, color, 2.5, 'stroke-dasharray="7 9" opacity=".8"')}
    ${label(x + mean * w + 10, y + h - 220, labelText, color, 24)}
  `
}

function ciRow(x, y, name, mean, width, color, note = "") {
  const scaleX = x + 170 + mean * 430
  const lo = x + 170 + (mean - width) * 430
  const hi = x + 170 + (mean + width) * 430
  return `
    ${label(x, y + 8, name, C.ink, 26)}
    ${line(x + 170, y, x + 600, y, C.hair, 2)}
    ${line(lo, y, hi, y, color, 8)}
    ${circle(scaleX, y, 10, C.panel, color, 5)}
    ${note ? label(x + 598, y + 8, note, color, 24, "end") : ""}
  `
}

function save(name, body, w = W, h = H) {
  return sharp(Buffer.from(doc(body, w, h)))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(name, outDir)))
}

function plotLine(x, y, w, h, values, color, sw = 5) {
  const max = Math.max(...values)
  const pts = values.map((v, i) => [x + (i / (values.length - 1)) * w, y + h - (v / max) * h])
  return polyline(pts, color, sw)
}

function row(x0, y, values, widths, fills = []) {
  let x = x0
  return values
    .map((value, i) => {
      const cell = `
        ${rect(x, y, widths[i], 52, fills[i] ?? "none", C.hair, 1.5)}
        ${i === 0 ? text(x + 22, y + 34, value, 24, 600) : monoText(x + widths[i] / 2, y + 34, value, 21, 500, 'text-anchor="middle"')}
      `
      x += widths[i]
      return cell
    })
    .join("")
}

function treeNode(cx, cy, r, fill, labelText, sub = "", stroke = C.ink) {
  return `
    ${circle(cx, cy, r, fill, stroke, 3)}
    ${centerText(cx, cy + 9, labelText, 25, 700)}
    ${sub ? label(cx, cy + r + 26, sub, C.muted, 20, "middle") : ""}
  `
}

function goBoard(x, y, size) {
  const step = size / 8
  const stones = [
    [2, 2, C.ink],
    [5, 2, C.panel],
    [4, 4, C.ink],
    [3, 5, C.panel],
    [6, 6, C.ink],
    [5, 5, C.panel],
  ]
  return `
    ${rect(x, y, size, size, "#d6b16c", "#7b632f", 3, 'rx="4"')}
    ${rect(x, y, size, size, "url(#stoneGrid)", "none", 0)}
    ${stones.map(([gx, gy, fill]) => circle(x + gx * step, y + gy * step, 15, fill, C.ink, 3)).join("")}
  `
}

function tensorStack(x, y) {
  return `
    ${rect(x, y, 116, 210, "#d6e5f2", C.blue, 3, 'rx="6"')}
    ${rect(x + 34, y + 24, 116, 210, "#c7e6df", C.teal, 3, 'rx="6"')}
    ${rect(x + 68, y + 48, 116, 210, "#f2df9a", C.amber, 3, 'rx="6"')}
    ${label(x + 90, y + 298, "state planes", C.muted, 24, "middle")}
  `
}

await mkdir(outDir, { recursive: true })

await save(
  "exploration-exploitation.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Reward distributions and estimates", 31, 700)}
  ${axis(112, 178, 650, 520, "reward", "density")}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.32, sigma: 0.105, color: C.teal, labelText: "arm A" })}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.52, sigma: 0.15, color: C.amber, labelText: "arm B" })}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.68, sigma: 0.09, color: C.blue, labelText: "arm C" })}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.78, sigma: 0.18, color: C.violet, labelText: "arm D" })}
  ${label(156, 758, "True means are hidden; only sampled rewards are observed.", C.muted, 25)}

  ${label(882, 82, "B", C.ink, 28)}
  ${text(916, 82, "Current belief after a few pulls", 31, 700)}
  ${panel(890, 164, 610, 560)}
  ${line(1078, 265, 1430, 265, C.hair, 2)}
  ${label(1078, 240, "low", C.muted, 22, "middle")}
  ${label(1255, 240, "estimated mean", C.muted, 22, "middle")}
  ${label(1430, 240, "high", C.muted, 22, "middle")}
  ${ciRow(940, 332, "Arm A", 0.32, 0.06, C.teal, "known")}
  ${ciRow(940, 432, "Arm B", 0.52, 0.19, C.amber, "explore")}
  ${ciRow(940, 532, "Arm C", 0.68, 0.05, C.blue, "exploit")}
  ${ciRow(940, 632, "Arm D", 0.48, 0.22, C.violet, "uncertain")}
  ${label(952, 745, "Wide intervals invite exploration.", C.muted, 25)}
  ${label(952, 782, "High estimates invite exploitation.", C.muted, 25)}
`,
)

await save(
  "ucb-bonus.png",
  `
  ${label(94, 82, "A", C.ink, 28)}
  ${text(128, 82, "The exploration bonus is count-dependent", 31, 700)}
  ${axis(110, 175, 650, 530, "", "bonus")}
  ${plotLine(
    110,
    175,
    650,
    530,
    Array.from({ length: 80 }, (_, i) => 1 / Math.sqrt(i + 1)),
    C.teal,
    6,
  )}
  ${line(268, 175, 268, 705, C.amber, 3, 'stroke-dasharray="8 9"')}
  ${line(595, 175, 595, 705, C.blue, 3, 'stroke-dasharray="8 9"')}
  ${label(268, 742, "few pulls", C.amber, 25, "middle")}
  ${label(595, 742, "many pulls", C.blue, 25, "middle")}
  ${label(744, 790, "pulls of arm i", C.muted, 24, "end")}
  ${label(365, 270, "sqrt(2 log t / N_i(t))", C.teal, 28)}
  ${line(360, 286, 284, 340, C.teal, 3, 'marker-end="url(#arrowTeal)"')}

  ${label(880, 82, "B", C.ink, 28)}
  ${text(914, 82, "Index calculation at one time step", 31, 700)}
  ${panel(900, 170, 570, 500)}
  ${row(948, 238, ["arm", "xbar", "N", "bonus", "index", "decision"], [72, 88, 62, 86, 86, 98], [C.panel, C.panel, C.panel, C.panel, C.panel, C.panel])}
  ${row(948, 292, ["A", "0.62", "42", "0.19", "0.81", ""], [72, 88, 62, 86, 86, 98], [null, null, null, null, null, null])}
  ${row(948, 346, ["B", "0.56", "5", "0.55", "1.11", "try"], [72, 88, 62, 86, 86, 98], [null, null, null, null, "rgba(208,162,21,.14)", "rgba(208,162,21,.14)"])}
  ${row(948, 400, ["C", "0.71", "55", "0.17", "0.88", ""], [72, 88, 62, 86, 86, 98], [null, null, null, null, null, null])}
  ${row(948, 454, ["D", "0.47", "4", "0.62", "1.09", ""], [72, 88, 62, 86, 86, 98], [null, null, null, null, null, null])}
  ${line(116, 235, 826, 235, C.ink, 0)}
  ${monoText(948, 590, "index_i = xbar_i + sqrt(2 log t / N_i)", 26, 600)}
  ${label(948, 630, "The best-looking arm need not be the next arm pulled.", C.muted, 24)}
`,
)

await save(
  "regret-curves.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Cumulative reward", 31, 700)}
  ${axis(120, 170, 1010, 560, "time", "reward")}
  ${path("M140 694 C360 598 610 478 1110 230 L1110 382 C642 524 382 648 140 716 Z", "rgba(208,162,21,.28)", "none", 0)}
  ${path("M140 694 C360 598 610 478 1110 230", "none", C.teal, 6)}
  ${path("M140 716 C388 648 642 524 1110 382", "none", C.blue, 6)}
  ${label(940, 250, "best fixed arm", C.teal, 26)}
  ${label(914, 426, "learner", C.blue, 26)}
  ${line(1020, 268, 1080, 242, C.teal, 3, 'marker-end="url(#arrowTeal)"')}
  ${line(996, 438, 1084, 392, C.blue, 3, 'marker-end="url(#arrowBlue)"')}
  ${centerText(654, 488, "cumulative regret", 35, 700)}

  ${label(1212, 82, "B", C.ink, 28)}
  ${text(1246, 82, "Definition", 31, 700)}
  ${panel(1192, 170, 300, 560)}
  ${monoText(1234, 285, "Regret(T)", 29, 700)}
  ${monoText(1234, 340, "= T mu_*", 29, 500)}
  ${monoText(1234, 395, "- sum_t r_t", 29, 500)}
  ${line(1232, 455, 1454, 455, C.hair, 2)}
  ${label(1234, 520, "Lower regret means", C.muted, 24)}
  ${label(1234, 556, "the learner found", C.muted, 24)}
  ${label(1234, 592, "good actions faster.", C.muted, 24)}
`,
)

await save(
  "ucb-to-puct.png",
  `
  ${label(86, 82, "A", C.ink, 28)}
  ${text(120, 82, "Same index idea, different object", 31, 700)}
  ${panel(96, 156, 1390, 270)}
  ${monoText(154, 252, "UCB arm score:", 30, 700)}
  ${monoText(430, 252, "xbar_i", 30, 500)}
  ${monoText(580, 252, "+", 30, 500)}
  ${monoText(660, 252, "sqrt(2 log t / N_i)", 30, 500)}
  ${line(430, 270, 530, 270, C.blue, 4)}
  ${line(660, 270, 1015, 270, C.amber, 4)}
  ${label(480, 315, "current value", C.blue, 24, "middle")}
  ${label(838, 315, "count-based optimism", C.amber, 24, "middle")}
  ${line(1140, 252, 1280, 252, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${label(1210, 222, "tree edge", C.muted, 23, "middle")}
  ${monoText(154, 382, "PUCT edge score:", 30, 700)}
  ${monoText(462, 382, "Q(s,a)", 30, 500)}
  ${monoText(580, 382, "+", 30, 500)}
  ${monoText(660, 382, "c_puct P(s,a) sqrt(N(s)) / (1 + N(s,a))", 30, 500)}
  ${line(462, 400, 572, 400, C.blue, 4)}
  ${line(660, 400, 1365, 400, C.teal, 4)}
  ${label(518, 445, "backed-up value", C.blue, 24, "middle")}
  ${label(1004, 445, "policy prior weighted by visits", C.teal, 24, "middle")}

  ${label(86, 552, "B", C.ink, 28)}
  ${text(120, 552, "Child-edge bookkeeping at a node", 31, 700)}
  ${panel(96, 612, 750, 190)}
  ${row(116, 650, ["move", "Q", "P", "N", "U", "score"], [140, 135, 105, 105, 105, 120], [C.panel, C.panel, C.panel, C.panel, C.panel, C.panel])}
  ${row(116, 704, ["a1", "0.42", ".18", "60", ".09", ".51"], [140, 135, 105, 105, 105, 120], [null, null, null, null, null, null])}
  ${row(116, 758, ["a2", "0.35", ".39", "8", ".31", ".66"], [140, 135, 105, 105, 105, 120], [null, null, "rgba(36,131,123,.14)", "rgba(36,131,123,.14)", "rgba(36,131,123,.14)", "rgba(36,131,123,.14)"])}

  ${label(958, 552, "C", C.ink, 28)}
  ${text(992, 552, "Search focuses, but does not collapse", 31, 700)}
  ${circle(1140, 704, 34, C.panel, C.ink, 3)}
  ${line(1140, 738, 1030, 806, C.hair, 3)}
  ${line(1140, 738, 1140, 806, C.teal, 7)}
  ${line(1140, 738, 1250, 806, C.hair, 3)}
  ${circle(1030, 824, 26, C.panel, C.hair, 3)}
  ${circle(1140, 824, 26, "rgba(36,131,123,.18)", C.teal, 4)}
  ${circle(1250, 824, 26, C.panel, C.hair, 3)}
  ${label(1302, 790, "high P, low N", C.teal, 24)}
  ${line(1290, 780, 1168, 815, C.teal, 3, 'marker-end="url(#arrowTeal)"')}
`,
)

await save(
  "mcts-loop.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "One simulation through the search tree", 31, 700)}
  ${panel(110, 150, 900, 620)}
  ${treeNode(550, 235, 36, C.panel, "s", "root")}
  ${line(550, 271, 360, 392, C.hair, 3)}
  ${line(550, 271, 550, 392, C.teal, 7)}
  ${line(550, 271, 740, 392, C.hair, 3)}
  ${treeNode(360, 420, 30, C.panel, "a1", "N=84 Q=.44", C.hair)}
  ${treeNode(550, 420, 30, "rgba(36,131,123,.16)", "a2", "N=9 Q=.38", C.teal)}
  ${treeNode(740, 420, 30, C.panel, "a3", "N=31 Q=.41", C.hair)}
  ${line(550, 450, 470, 565, C.teal, 6)}
  ${line(550, 450, 630, 565, C.hair, 3)}
  ${treeNode(470, 590, 28, "rgba(36,131,123,.16)", "leaf", "expand", C.teal)}
  ${treeNode(630, 590, 24, C.panel, "", "", C.hair)}
  ${line(470, 618, 470, 690, C.blue, 5, 'marker-end="url(#arrowBlue)"')}
  ${label(500, 672, "evaluate with network: P, V", C.blue, 25)}
  ${path("M448 588 C310 520 310 304 514 236", "none", C.amber, 5, 'stroke-dasharray="9 11" marker-end="url(#arrowAmber)"')}
  ${label(230, 392, "backup value", C.amber, 25)}

  ${label(1092, 82, "B", C.ink, 28)}
  ${text(1126, 82, "Iteration anatomy", 31, 700)}
  ${panel(1070, 150, 390, 620)}
  ${line(1130, 240, 1130, 650, C.hair, 2)}
  ${circle(1130, 240, 13, C.teal)}
  ${circle(1130, 370, 13, C.teal)}
  ${circle(1130, 500, 13, C.teal)}
  ${circle(1130, 630, 13, C.teal)}
  ${text(1170, 248, "Selection", 28, 700)}
  ${label(1170, 286, "descend by PUCT", C.muted, 23)}
  ${text(1170, 378, "Expansion", 28, 700)}
  ${label(1170, 416, "add legal children", C.muted, 23)}
  ${text(1170, 508, "Evaluation", 28, 700)}
  ${label(1170, 546, "query policy/value net", C.muted, 23)}
  ${text(1170, 638, "Backup", 28, 700)}
  ${label(1170, 676, "update Q and N", C.muted, 23)}
`,
)

await save(
  "policy-value-network.png",
  `
  ${label(90, 82, "A", C.ink, 28)}
  ${text(124, 82, "Network-guided search", 31, 700)}
  ${goBoard(130, 230, 250)}
  ${label(255, 530, "board state", C.muted, 24, "middle")}
  ${line(420, 355, 505, 355, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${tensorStack(530, 245)}
  ${line(760, 355, 850, 355, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${panel(880, 230, 245, 250)}
  ${Array.from({ length: 6 }, (_, i) => rect(925 + i * 28, 285, 18, 130, i % 2 ? "#c7e6df" : "#d6e5f2", i % 2 ? C.teal : C.blue, 2)).join("")}
  ${label(1002, 530, "residual trunk", C.muted, 24, "middle")}
  ${line(1126, 320, 1245, 250, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${line(1126, 410, 1245, 500, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${panel(1260, 190, 220, 130)}
  ${text(1302, 245, "policy", 28, 700)}
  ${monoText(1302, 288, "pi(a|s)", 24, 500)}
  ${panel(1260, 480, 220, 130)}
  ${text(1302, 535, "value", 28, 700)}
  ${monoText(1302, 578, "V(s)", 24, 500)}

  ${label(90, 678, "B", C.ink, 28)}
  ${text(124, 678, "Self-play improvement loop", 31, 700)}
  ${panel(442, 704, 760, 138)}
  ${text(482, 786, "network", 27, 700)}
  ${line(598, 776, 714, 776, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${text(742, 786, "MCTS", 27, 700)}
  ${line(840, 776, 952, 776, C.ink, 4, 'marker-end="url(#arrow)"')}
  ${text(982, 786, "stronger targets", 27, 700)}
  ${path("M1020 832 C820 895 584 886 520 814", "none", C.teal, 4, 'marker-end="url(#arrowTeal)"')}
  ${label(725, 890, "train on visit counts and outcomes", C.teal, 24, "middle")}
`,
)

console.log("Generated AlphaGo figures in quartz/static/alphago")
