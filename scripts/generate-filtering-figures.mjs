import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const outDir = new URL("../quartz/static/filtering/", import.meta.url)

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
  green: "#66800b",
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
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  ${body}
</svg>`
}

function text(x, y, value, size = 28, weight = 500, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function monoText(x, y, value, size = 24, weight = 500, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${mono}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function centerText(x, y, value, size = 28, weight = 600) {
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
    ${label(x - 10, y - 18, yLabel, C.muted, 24, "start")}
  `
}

function pointsToPath(points) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ")
}

function gaussianPath({ x, y, w, h, mean, sigma, color, labelText, sw = 5 }) {
  const pts = []
  for (let i = 0; i <= 160; i += 1) {
    const xv = i / 160
    const z = (xv - mean) / sigma
    const density = Math.exp(-0.5 * z * z)
    pts.push([x + xv * w, y + h - density * h * 0.88])
  }
  return `
    ${path(pointsToPath(pts), "none", color, sw)}
    ${line(x + mean * w, y + h, x + mean * w, y + h - 260, color, 2.5, 'stroke-dasharray="7 9" opacity=".75"')}
    ${labelText ? label(x + mean * w + 12, y + h - 238, labelText, color, 24) : ""}
  `
}

function plotLine(x, y, w, h, values, color, sw = 5) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [
    x + (i / (values.length - 1)) * w,
    y + h - ((v - min) / span) * h,
  ])
  return polyline(pts, color, sw)
}

function barChart(x, y, w, h, values, color, maxValue = Math.max(...values)) {
  const gap = 8
  const bw = (w - gap * (values.length - 1)) / values.length
  return values
    .map((value, i) => {
      const bh = (value / maxValue) * h
      return rect(x + i * (bw + gap), y + h - bh, bw, bh, color, color, 1.5, 'rx="3"')
    })
    .join("")
}

function arrow(x1, y1, x2, y2, color = C.ink) {
  return line(
    x1,
    y1,
    x2,
    y2,
    color,
    3,
    `marker-end="url(#${color === C.teal ? "arrowTeal" : color === C.blue ? "arrowBlue" : "arrow"})"`,
  )
}

function stepBox(x, y, w, h, title, lines, color = C.ink) {
  return `
    ${rect(x, y, w, h, C.panel, color, 3, 'rx="8"')}
    ${text(x + 24, y + 42, title, 27, 700)}
    ${lines.map((lineText, i) => label(x + 24, y + 82 + i * 34, lineText, C.muted, 23)).join("")}
  `
}

function save(name, body, w = W, h = H) {
  return sharp(Buffer.from(doc(body, w, h)))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(name, outDir)))
}

await mkdir(outDir, { recursive: true })

await save(
  "sensor-fusion.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Two noisy estimates of the same state", 31, 700)}
  ${axis(112, 178, 720, 520, "state value", "density")}
  ${gaussianPath({ x: 112, y: 178, w: 720, h: 520, mean: 0.42, sigma: 0.17, color: C.amber, labelText: "" })}
  ${gaussianPath({ x: 112, y: 178, w: 720, h: 520, mean: 0.64, sigma: 0.14, color: C.blue, labelText: "" })}
  ${gaussianPath({ x: 112, y: 178, w: 720, h: 520, mean: 0.54, sigma: 0.09, color: C.teal, labelText: "", sw: 6 })}
  ${line(580, 226, 640, 226, C.amber, 6)}
  ${label(652, 235, "sensor A", C.amber, 23)}
  ${line(580, 266, 640, 266, C.blue, 6)}
  ${label(652, 275, "sensor B", C.blue, 23)}
  ${line(580, 306, 640, 306, C.teal, 7)}
  ${label(652, 315, "fused", C.teal, 23)}
  ${label(156, 760, "Fused belief is narrower and lands between the inputs.", C.muted, 25)}

  ${label(936, 82, "B", C.ink, 28)}
  ${text(970, 82, "Precision weighting", 31, 700)}
  ${panel(940, 168, 520, 530)}
  ${monoText(990, 244, "tau = 1 / sigma^2", 27, 600)}
  ${line(990, 286, 1370, 286, C.hair, 2)}
  ${label(990, 340, "sensor A variance", C.muted, 24)}
  ${rect(1230, 318, 150, 28, "#eadca1", C.amber, 2, 'rx="4"')}
  ${label(990, 408, "sensor B variance", C.muted, 24)}
  ${rect(1230, 386, 120, 28, "#d4e3f0", C.blue, 2, 'rx="4"')}
  ${label(990, 476, "fused variance", C.muted, 24)}
  ${rect(1230, 454, 74, 28, "#cce5df", C.teal, 2, 'rx="4"')}
  ${line(990, 528, 1370, 528, C.hair, 2)}
  ${monoText(990, 588, "mu = sum(tau_i mu_i) / sum(tau_i)", 23, 600)}
  ${monoText(990, 632, "sigma^2 = 1 / sum(tau_i)", 23, 600)}
`,
)

await save(
  "predict-update-loop.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "A filter is a recurrent belief update", 31, 700)}
  ${stepBox(120, 180, 300, 160, "Posterior", ["x+ and P+", "best current belief"], C.teal)}
  ${stepBox(560, 180, 300, 160, "Predict", ["apply process model", "add process noise Q"], C.blue)}
  ${stepBox(1000, 180, 300, 160, "Prior", ["x- and P-", "belief before z"], C.violet)}
  ${stepBox(1000, 560, 300, 160, "Update", ["residual y = z - h(x-)", "choose gain K"], C.amber)}
  ${stepBox(560, 560, 300, 160, "Measurement", ["sensor z", "noise model R"], C.red)}
  ${arrow(420, 260, 560, 260)}
  ${arrow(860, 260, 1000, 260)}
  ${arrow(1150, 340, 1150, 560)}
  ${arrow(1000, 640, 860, 640)}
  ${arrow(560, 640, 420, 340)}
  ${label(1120, 454, "prediction becomes prior", C.muted, 24, "middle")}
  ${label(708, 516, "measurement explains residual", C.muted, 24, "middle")}

  ${label(104, 814, "Prediction usually widens uncertainty; update usually narrows it.", C.muted, 25)}
  ${line(820, 852, 1220, 852, C.hair, 8)}
  ${line(820, 852, 950, 852, C.blue, 8)}
  ${line(1145, 852, 1220, 852, C.teal, 8)}
  ${label(955, 862, "wider", C.blue, 23)}
  ${label(1230, 862, "narrower", C.teal, 23)}
`,
)

await save(
  "residual-line.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "The update moves along the residual", 31, 700)}
  ${line(210, 440, 1390, 440, C.ink, 4)}
  ${label(210, 488, "low state value", C.muted, 24)}
  ${label(1390, 488, "high state value", C.muted, 24, "end")}
  ${circle(500, 440, 16, C.panel, C.blue, 5)}
  ${label(500, 386, "prediction x-", C.blue, 27, "middle")}
  ${line(390, 440, 610, 440, C.blue, 9, 'opacity=".65"')}
  ${circle(1080, 440, 16, C.panel, C.amber, 5)}
  ${label(1080, 386, "measurement z", C.amber, 27, "middle")}
  ${line(1010, 440, 1150, 440, C.amber, 9, 'opacity=".65"')}
  ${circle(765, 440, 18, C.panel, C.teal, 6)}
  ${label(765, 536, "posterior x+", C.teal, 27, "middle")}
  ${arrow(520, 358, 1050, 358, C.ink)}
  ${label(785, 332, "residual r = z - x-", C.ink, 27, "middle")}
  ${path("M500 442 C590 560 675 582 765 466", "none", C.teal, 4, 'marker-end="url(#arrowTeal)"')}
  ${panel(310, 650, 980, 130)}
  ${monoText(360, 705, "x+ = x- + K (z - x-)", 32, 700)}
  ${label(360, 750, "Small K trusts prediction. Large K trusts measurement.", C.muted, 25)}
`,
)

const truth = Array.from({ length: 70 }, (_, i) => {
  const t = i / 69
  return 0.18 + 0.55 * t + 0.18 * t * t
})
const lowGain = truth.map((v, i) => v - 0.08 - 0.12 * (i / 69))
const highGain = truth.map((v, i) => v + 0.035 * Math.sin(i * 1.8))
const dots = Array.from({ length: 20 }, (_, i) => {
  const t = i / 19
  const base = 0.18 + 0.55 * t + 0.18 * t * t
  return [150 + t * 610, 665 - (base + 0.06 * Math.sin(i * 2.3)) * 430]
})

await save(
  "gh-tradeoff.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Gain is a model commitment", 31, 700)}
  ${axis(120, 200, 660, 500, "time", "state")}
  ${plotLine(120, 200, 660, 500, truth, C.ink, 5)}
  ${plotLine(120, 200, 660, 500, lowGain, C.blue, 5)}
  ${plotLine(120, 200, 660, 500, highGain, C.amber, 4)}
  ${dots.map(([x, y]) => circle(x, y, 7, C.panel, C.red, 3)).join("")}
  ${label(620, 250, "true motion", C.ink, 24)}
  ${label(610, 382, "low gain: smooth but lagging", C.blue, 24)}
  ${label(560, 518, "high gain: reactive but noisy", C.amber, 24)}
  ${label(190, 760, "No gain choice fixes an omitted acceleration term.", C.muted, 25)}

  ${label(900, 82, "B", C.ink, 28)}
  ${text(934, 82, "g and h in the alpha-beta filter", 31, 700)}
  ${panel(920, 178, 520, 560)}
  ${monoText(970, 252, "x_pred = x + dx dt", 26, 600)}
  ${monoText(970, 308, "r      = z - x_pred", 26, 600)}
  ${monoText(970, 364, "x      = x_pred + g r", 26, 600)}
  ${monoText(970, 420, "dx     = dx + h r / dt", 26, 600)}
  ${line(970, 476, 1340, 476, C.hair, 2)}
  ${label(970, 542, "g: position correction", C.teal, 26)}
  ${rect(970, 570, 300, 28, "#cce5df", C.teal, 2, 'rx="4"')}
  ${label(970, 646, "h: rate correction", C.violet, 26)}
  ${rect(970, 674, 210, 28, "#ded9f0", C.violet, 2, 'rx="4"')}
`,
)

await save(
  "histogram-bayes.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Discrete Bayes filter", 31, 700)}
  ${panel(100, 160, 310, 600)}
  ${text(130, 212, "belief", 28, 700)}
  ${barChart(130, 270, 240, 150, [0.03, 0.06, 0.15, 0.34, 0.24, 0.1, 0.05, 0.03], C.teal, 0.34)}
  ${label(130, 468, "previous posterior", C.muted, 22)}
  ${monoText(130, 560, "bel(x)", 30, 700)}
  ${arrow(410, 455, 530, 455)}

  ${panel(530, 160, 310, 600)}
  ${text(560, 212, "predict", 28, 700)}
  ${barChart(560, 270, 240, 150, [0.01, 0.03, 0.07, 0.14, 0.26, 0.24, 0.16, 0.09], C.blue, 0.26)}
  ${label(560, 468, "motion shifts and spreads", C.muted, 22)}
  ${monoText(560, 558, "prior", 27, 700)}
  ${monoText(560, 598, "= motion * bel", 25, 700)}
  ${arrow(840, 455, 960, 455)}

  ${panel(960, 160, 310, 600)}
  ${text(990, 212, "update", 28, 700)}
  ${barChart(990, 270, 240, 150, [0.02, 0.02, 0.06, 0.18, 0.5, 0.62, 0.2, 0.04], C.amber, 0.62)}
  ${label(990, 468, "likelihood scores z", C.muted, 22)}
  ${monoText(990, 558, "posterior", 27, 700)}
  ${monoText(990, 598, "= eta L prior", 25, 700)}
  ${arrow(1270, 455, 1390, 455)}

  ${panel(1390, 160, 110, 600)}
  ${barChart(1410, 270, 70, 150, [0.01, 0.01, 0.04, 0.12, 0.4, 0.36, 0.05, 0.01], C.teal, 0.4)}
  ${label(1445, 470, "new", C.muted, 22, "middle")}
  ${label(1445, 500, "belief", C.muted, 22, "middle")}
`,
)

await save(
  "kalman-bridge.png",
  `
  ${label(92, 82, "A", C.ink, 28)}
  ${text(126, 82, "Gaussian Bayes in one dimension", 31, 700)}
  ${axis(112, 178, 650, 520, "state", "density")}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.42, sigma: 0.16, color: C.blue, labelText: "" })}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.65, sigma: 0.13, color: C.amber, labelText: "" })}
  ${gaussianPath({ x: 112, y: 178, w: 650, h: 520, mean: 0.53, sigma: 0.085, color: C.teal, labelText: "", sw: 6 })}
  ${line(520, 226, 580, 226, C.blue, 6)}
  ${label(592, 235, "prior", C.blue, 23)}
  ${line(520, 266, 580, 266, C.amber, 6)}
  ${label(592, 275, "likelihood", C.amber, 23)}
  ${line(520, 306, 580, 306, C.teal, 7)}
  ${label(592, 315, "posterior", C.teal, 23)}
  ${label(154, 760, "A Kalman update is this product in matrix form.", C.muted, 25)}

  ${label(880, 82, "B", C.ink, 28)}
  ${text(914, 82, "Matrix predict-update pipeline", 31, 700)}
  ${stepBox(900, 160, 520, 120, "Predict state", ["x- = F x+ + B u"], C.blue)}
  ${stepBox(900, 330, 520, 120, "Predict covariance", ["P- = F P+ F^T + Q"], C.blue)}
  ${stepBox(900, 500, 520, 120, "Compute gain", ["K = P- H^T (H P- H^T + R)^-1"], C.amber)}
  ${stepBox(900, 670, 520, 120, "Correct belief", ["x+ = x- + K y", "P+ = (I - K H) P-"], C.teal)}
  ${arrow(1160, 280, 1160, 330)}
  ${arrow(1160, 450, 1160, 500)}
  ${arrow(1160, 620, 1160, 670)}
`,
)

console.log("Generated filtering figures in quartz/static/filtering")
