import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const outDir = new URL("../quartz/static/filtering/", import.meta.url)

const W = 1800
const H = 1080

const C = {
  bg: "#fffcf0",
  ink: "#100f0f",
  muted: "#6f6b63",
  hair: "#d7d1c4",
  panel: "#fffdf6",
  teal: "#24837b",
  tealSoft: "#cce5df",
  blue: "#4385be",
  blueSoft: "#d4e3f0",
  amber: "#d0a215",
  amberSoft: "#eadca1",
  red: "#c84a42",
  redSoft: "#f0cbc7",
  violet: "#7868b7",
  violetSoft: "#ded9f0",
}

const font = "Arial, Helvetica, sans-serif"
const mono = "Lilex, Menlo, Consolas, monospace"

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function doc(body, w = W, h = H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.ink}"/>
    </marker>
    <marker id="arrowTeal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.teal}"/>
    </marker>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.blue}"/>
    </marker>
    <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.amber}"/>
    </marker>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  ${body}
</svg>`
}

function text(x, y, value, size = 36, weight = 500, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function monoText(x, y, value, size = 34, weight = 600, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${mono}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(value)}</text>`
}

function label(x, y, value, color = C.muted, size = 30, anchor = "start") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="500" letter-spacing="0" fill="${color}" text-anchor="${anchor}">${esc(value)}</text>`
}

function title(value, sub = "") {
  return `
    ${text(94, 92, value, 46, 750)}
    ${sub ? label(96, 142, sub, C.muted, 29) : ""}
  `
}

function line(x1, y1, x2, y2, color = C.ink, sw = 4, extra = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`
}

function rect(x, y, w, h, fill = "none", stroke = C.ink, sw = 3, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
}

function circle(cx, cy, r, fill = C.panel, stroke = C.ink, sw = 4, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
}

function path(d, fill = "none", stroke = C.ink, sw = 4, extra = "") {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
}

function polyline(points, color = C.ink, sw = 5, extra = "") {
  return `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
}

function panel(x, y, w, h, extra = "") {
  return rect(x, y, w, h, C.panel, C.hair, 2.4, `rx="12" ${extra}`)
}

function chip(x, y, w, textValue, fill, stroke, color = C.ink) {
  return `
    ${rect(x, y, w, 58, fill, stroke, 2.5, 'rx="29"')}
    ${label(x + w / 2, y + 38, textValue, color, 28, "middle")}
  `
}

function axis(x, y, w, h, xLabel, yLabel) {
  return `
    ${line(x, y + h, x + w, y + h, C.ink, 4)}
    ${line(x, y, x, y + h, C.ink, 4)}
    ${[0.25, 0.5, 0.75].map((t) => line(x, y + h * t, x + w, y + h * t, C.hair, 1.8)).join("")}
    ${label(x + w, y + h + 52, xLabel, C.muted, 29, "end")}
    ${label(x - 12, y - 18, yLabel, C.muted, 29)}
  `
}

function pointsToPath(points) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ")
}

function gaussianPoints({ x, y, w, h, mean, sigma, scale = 0.9 }) {
  const pts = []
  for (let i = 0; i <= 180; i += 1) {
    const xv = i / 180
    const z = (xv - mean) / sigma
    const density = Math.exp(-0.5 * z * z)
    pts.push([x + xv * w, y + h - density * h * scale])
  }
  return pts
}

function gaussian({ x, y, w, h, mean, sigma, color, sw = 7, fill = "none" }) {
  const pts = gaussianPoints({ x, y, w, h, mean, sigma })
  const curve = pointsToPath(pts)
  const area = `${curve} L${x + w} ${y + h} L${x} ${y + h} Z`
  return `
    ${fill === "none" ? "" : path(area, fill, "none", 0, 'opacity=".45"')}
    ${path(curve, "none", color, sw)}
  `
}

function plotLine(x, y, w, h, values, color, sw = 6) {
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
  const gap = 10
  const bw = (w - gap * (values.length - 1)) / values.length
  return values
    .map((value, i) => {
      const bh = (value / maxValue) * h
      return rect(x + i * (bw + gap), y + h - bh, bw, bh, color, color, 1.5, 'rx="5"')
    })
    .join("")
}

function arrow(x1, y1, x2, y2, color = C.ink, sw = 5) {
  const marker =
    color === C.teal
      ? "arrowTeal"
      : color === C.blue
        ? "arrowBlue"
        : color === C.amber
          ? "arrowAmber"
          : "arrow"
  return line(x1, y1, x2, y2, color, sw, `marker-end="url(#${marker})"`)
}

function stepBox(x, y, w, h, heading, body, color, soft) {
  return `
    ${rect(x, y, w, h, soft, color, 4, 'rx="14"')}
    ${text(x + 30, y + 52, heading, 36, 750)}
    ${body.map((lineText, i) => label(x + 30, y + 100 + i * 40, lineText, C.ink, 29)).join("")}
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
  ${title("Sensor fusion is uncertainty-weighted", "Two weak measurements can become one stronger belief if their noise is modeled.")}
  ${panel(90, 190, 1040, 720)}
  ${axis(170, 300, 850, 430, "state", "belief density")}
  ${gaussian({ x: 170, y: 300, w: 850, h: 430, mean: 0.36, sigma: 0.18, color: C.amber, fill: C.amberSoft })}
  ${gaussian({ x: 170, y: 300, w: 850, h: 430, mean: 0.66, sigma: 0.16, color: C.blue, fill: C.blueSoft })}
  ${gaussian({ x: 170, y: 300, w: 850, h: 430, mean: 0.52, sigma: 0.09, color: C.teal, sw: 9, fill: C.tealSoft })}
  ${chip(264, 820, 210, "sensor A", C.amberSoft, C.amber, C.amber)}
  ${chip(512, 820, 210, "sensor B", C.blueSoft, C.blue, C.blue)}
  ${chip(760, 820, 210, "fused", C.tealSoft, C.teal, C.teal)}

  ${panel(1190, 190, 520, 720)}
  ${text(1240, 260, "Precision sets trust", 38, 750)}
  ${label(1240, 326, "precision = 1 / variance", C.muted, 31)}
  ${line(1240, 390, 1660, 390, C.hair, 2.5)}
  ${label(1240, 462, "wide sensor", C.muted, 30)}
  ${rect(1465, 432, 165, 42, C.amberSoft, C.amber, 3, 'rx="7"')}
  ${label(1240, 548, "narrower sensor", C.muted, 30)}
  ${rect(1465, 518, 118, 42, C.blueSoft, C.blue, 3, 'rx="7"')}
  ${label(1240, 634, "fused belief", C.muted, 30)}
  ${rect(1465, 604, 72, 42, C.tealSoft, C.teal, 3, 'rx="7"')}
  ${line(1240, 704, 1660, 704, C.hair, 2.5)}
  ${monoText(1240, 770, "mu_post = weighted mean", 31)}
  ${monoText(1240, 824, "var_post < each input", 31)}
`,
)

await save(
  "predict-update-loop.png",
  `
  ${title("A filter is a two-step loop", "Prediction spends the model; update spends the measurement.")}
  ${stepBox(120, 240, 390, 210, "1  Predict", ["propagate state", "add process noise"], C.blue, C.blueSoft)}
  ${stepBox(640, 240, 390, 210, "2  Prior", ["best guess before", "seeing the sensor"], C.violet, C.violetSoft)}
  ${stepBox(1160, 240, 390, 210, "3  Update", ["compare with z", "apply gain"], C.amber, C.amberSoft)}
  ${stepBox(640, 640, 390, 210, "4  Posterior", ["corrected state", "new uncertainty"], C.teal, C.tealSoft)}
  ${arrow(510, 345, 640, 345, C.blue)}
  ${arrow(1030, 345, 1160, 345, C.amber)}
  ${arrow(1355, 450, 930, 640, C.teal)}
  ${arrow(640, 745, 510, 450, C.ink)}
  ${label(585, 548, "next epoch", C.muted, 30, "middle")}

  ${panel(160, 835, 520, 120)}
  ${label(200, 885, "Prediction", C.blue, 32)}
  ${label(415, 885, "widens belief", C.ink, 32)}
  ${line(220, 925, 600, 925, C.hair, 10)}
  ${line(220, 925, 430, 925, C.blue, 10)}

  ${panel(950, 835, 520, 120)}
  ${label(990, 885, "Update", C.teal, 32)}
  ${label(1160, 885, "narrows belief", C.ink, 32)}
  ${line(1010, 925, 1390, 925, C.hair, 10)}
  ${line(1250, 925, 1390, 925, C.teal, 10)}
`,
)

await save(
  "residual-line.png",
  `
  ${title("The residual is the correction signal", "The gain decides how far the estimate moves toward the measurement.")}
  ${panel(120, 235, 1560, 455)}
  ${line(235, 450, 1545, 450, C.ink, 5)}
  ${label(235, 510, "low state value", C.muted, 30)}
  ${label(1545, 510, "high state value", C.muted, 30, "end")}
  ${circle(520, 450, 26, C.panel, C.blue, 7)}
  ${label(520, 382, "prediction", C.blue, 34, "middle")}
  ${monoText(520, 566, "x-", 40, 700, 'text-anchor="middle"')}
  ${circle(1260, 450, 26, C.panel, C.amber, 7)}
  ${label(1260, 382, "measurement", C.amber, 34, "middle")}
  ${monoText(1260, 566, "z", 40, 700, 'text-anchor="middle"')}
  ${circle(820, 450, 30, C.panel, C.teal, 8)}
  ${label(820, 382, "posterior", C.teal, 34, "middle")}
  ${monoText(820, 566, "x+", 40, 700, 'text-anchor="middle"')}
  ${arrow(560, 308, 1210, 308)}
  ${label(885, 282, "residual = z - predicted measurement", C.ink, 32, "middle")}
  ${path("M545 472 C620 620 745 650 820 485", "none", C.teal, 6, 'marker-end="url(#arrowTeal)"')}

  ${panel(250, 760, 1300, 150)}
  ${monoText(320, 830, "x+ = x- + K (z - H x-)", 42, 750)}
  ${label(320, 880, "K near 0 trusts the model; K near 1 trusts the measurement.", C.muted, 31)}
`,
)

const truth = Array.from({ length: 90 }, (_, i) => {
  const t = i / 89
  return 0.12 + 0.48 * t + 0.32 * t * t
})
const lowGain = truth.map((v, i) => v - 0.07 - 0.11 * (i / 89))
const highGain = truth.map((v, i) => v + 0.04 * Math.sin(i * 1.55))
const measurements = Array.from({ length: 24 }, (_, i) => {
  const t = i / 23
  const base = 0.12 + 0.48 * t + 0.32 * t * t
  return [185 + t * 790, 735 - (base + 0.055 * Math.sin(i * 2.4)) * 500]
})

await save(
  "gh-tradeoff.png",
  `
  ${title("g-h filters trade noise for lag", "Fixed gains are simple, but the model must match the motion you are tracking.")}
  ${panel(90, 205, 1040, 745)}
  ${axis(190, 305, 790, 510, "time", "state")}
  ${plotLine(190, 305, 790, 510, truth, C.ink, 7)}
  ${plotLine(190, 305, 790, 510, lowGain, C.blue, 7)}
  ${plotLine(190, 305, 790, 510, highGain, C.amber, 5)}
  ${measurements.map(([x, y]) => circle(x, y, 9, C.panel, C.red, 4)).join("")}
  ${chip(260, 850, 190, "truth", C.panel, C.ink, C.ink)}
  ${chip(480, 850, 260, "low gain", C.blueSoft, C.blue, C.blue)}
  ${chip(770, 850, 285, "high gain", C.amberSoft, C.amber, C.amber)}

  ${panel(1190, 205, 520, 745)}
  ${text(1240, 270, "What the gains mean", 38, 750)}
  ${label(1240, 360, "g: position correction", C.teal, 32)}
  ${label(1280, 410, "larger g follows z more closely", C.ink, 29)}
  ${label(1240, 510, "h: rate correction", C.violet, 32)}
  ${label(1280, 560, "larger h changes velocity faster", C.ink, 29)}
  ${line(1240, 635, 1660, 635, C.hair, 2.5)}
  ${text(1240, 710, "If the system accelerates", 34, 750)}
  ${label(1240, 760, "a constant-velocity model lags.", C.ink, 30)}
  ${label(1240, 810, "That is model error, not just", C.muted, 29)}
  ${label(1240, 852, "a bad-looking gain choice.", C.muted, 29)}
`,
)

await save(
  "histogram-bayes.png",
  `
  ${title("Histogram filters keep the whole belief", "Prediction spreads probability; measurement concentrates it again.")}
  ${panel(90, 205, 1620, 760)}
  ${text(150, 280, "Predict: move and blur", 40, 750)}
  ${barChart(150, 350, 300, 170, [0.03, 0.06, 0.16, 0.34, 0.24, 0.1, 0.05, 0.02], C.teal, 0.34)}
  ${monoText(190, 585, "bel(x)", 37, 700)}
  ${arrow(510, 438, 640, 438, C.blue)}
  ${label(575, 405, "motion", C.blue, 30, "middle")}
  ${barChart(700, 350, 300, 170, [0.01, 0.03, 0.07, 0.14, 0.26, 0.24, 0.16, 0.09], C.blue, 0.26)}
  ${monoText(715, 585, "prior = motion * bel", 34, 700)}

  ${line(150, 660, 1580, 660, C.hair, 2.5)}
  ${text(150, 735, "Update: score by likelihood and normalize", 40, 750)}
  ${barChart(150, 800, 300, 135, [0.01, 0.03, 0.07, 0.14, 0.26, 0.24, 0.16, 0.09], C.blue, 0.26)}
  ${monoText(210, 986, "prior", 34, 700)}
  ${text(520, 882, "x", 44, 750)}
  ${barChart(600, 800, 300, 135, [0.02, 0.02, 0.06, 0.18, 0.5, 0.62, 0.2, 0.04], C.amber, 0.62)}
  ${monoText(650, 986, "likelihood", 34, 700)}
  ${text(970, 882, "=", 44, 750)}
  ${barChart(1050, 800, 300, 135, [0.01, 0.01, 0.04, 0.12, 0.4, 0.36, 0.05, 0.01], C.teal, 0.4)}
  ${monoText(1100, 986, "posterior", 34, 700)}
  ${chip(1390, 810, 220, "normalize", C.tealSoft, C.teal, C.teal)}
`,
)

await save(
  "kalman-bridge.png",
  `
  ${title("Kalman filters are Gaussian Bayes filters", "Keep only a mean and covariance, then run the same predict-update logic.")}
  ${panel(90, 205, 820, 745)}
  ${axis(170, 320, 640, 430, "state", "belief density")}
  ${gaussian({ x: 170, y: 320, w: 640, h: 430, mean: 0.36, sigma: 0.18, color: C.blue, fill: C.blueSoft })}
  ${gaussian({ x: 170, y: 320, w: 640, h: 430, mean: 0.66, sigma: 0.15, color: C.amber, fill: C.amberSoft })}
  ${gaussian({ x: 170, y: 320, w: 640, h: 430, mean: 0.51, sigma: 0.09, color: C.teal, sw: 9, fill: C.tealSoft })}
  ${chip(190, 820, 170, "prior", C.blueSoft, C.blue, C.blue)}
  ${chip(390, 820, 230, "likelihood", C.amberSoft, C.amber, C.amber)}
  ${chip(650, 820, 205, "posterior", C.tealSoft, C.teal, C.teal)}

  ${panel(990, 205, 720, 745)}
  ${stepBox(1050, 270, 600, 150, "Predict", ["x- = F x+ + B u", "P- = F P+ F^T + Q"], C.blue, C.blueSoft)}
  ${arrow(1350, 420, 1350, 500, C.ink)}
  ${stepBox(1050, 500, 600, 150, "Compute gain", ["K balances P- against R"], C.amber, C.amberSoft)}
  ${arrow(1350, 650, 1350, 730, C.ink)}
  ${stepBox(1050, 730, 600, 150, "Correct", ["x+ = x- + K y", "P+ shrinks after measurement"], C.teal, C.tealSoft)}
  ${label(1090, 945, "Q: process noise    R: measurement noise", C.muted, 30)}
`,
)

console.log("Generated filtering figures in quartz/static/filtering")
