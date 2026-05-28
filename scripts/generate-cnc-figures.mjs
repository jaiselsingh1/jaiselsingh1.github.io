import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const outDir = new URL("../quartz/static/cnc/", import.meta.url)

const W = 1600
const H = 920

const C = {
  bg: "#ffffff",
  ink: "#161616",
  line: "#3e3e3a",
  faint: "#8d8a82",
  stockTop: "#d8d4ca",
  stockLeft: "#bdb9af",
  stockRight: "#aaa69d",
  section: "#c9c6bd",
  cut: "#ffffff",
  green: "#36df33",
  greenDark: "#12a817",
  greenSoft: "#7df06f",
  red: "#ef3732",
  redDark: "#bf2b28",
  blue: "#245bd6",
  yellow: "#e7bd2f",
}

const font = "Arial, Helvetica, sans-serif"

function esc(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function doc(body, w = W, h = H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.ink}"/>
    </marker>
    <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.greenDark}"/>
    </marker>
    <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${C.redDark}"/>
    </marker>
    <linearGradient id="greenGrad" x1="0" x2="1">
      <stop offset="0" stop-color="${C.greenDark}"/>
      <stop offset=".5" stop-color="${C.green}"/>
      <stop offset="1" stop-color="${C.greenDark}"/>
    </linearGradient>
    <linearGradient id="redGrad" x1="0" x2="1">
      <stop offset="0" stop-color="${C.redDark}"/>
      <stop offset=".5" stop-color="${C.red}"/>
      <stop offset="1" stop-color="${C.redDark}"/>
    </linearGradient>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="${C.faint}" stroke-width="1.2" opacity=".5"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity=".10"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  ${body}
</svg>`
}

function text(x, y, s, size = 34, weight = 700, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="0" fill="${C.ink}" ${extra}>${esc(s)}</text>`
}

function centerText(x, y, s, size = 34, weight = 700) {
  return text(x, y, s, size, weight, `text-anchor="middle"`)
}

function line(x1, y1, x2, y2, color = C.ink, sw = 4, extra = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`
}

function path(d, fill = "none", stroke = C.line, sw = 4, extra = "") {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
}

function poly(points, fill, stroke = C.line, sw = 4, extra = "") {
  return `<polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`
}

function rect(x, y, w, h, fill, stroke = C.line, sw = 4, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
}

function sectionRect(x, y, w, h) {
  return `
    ${rect(x, y, w, h, C.section)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch)" opacity=".45"/>
  `
}

function isoBlock(x, y, w, d, h, opts = {}) {
  const dx = d * 0.55
  const dy = d * 0.33
  const top = [
    [x, y],
    [x + w, y],
    [x + w + dx, y + dy],
    [x + dx, y + dy],
  ]
  const left = [
    [x, y],
    [x + dx, y + dy],
    [x + dx, y + dy + h],
    [x, y + h],
  ]
  const right = [
    [x + dx, y + dy],
    [x + w + dx, y + dy],
    [x + w + dx, y + dy + h],
    [x + dx, y + dy + h],
  ]
  return `
    <g filter="${opts.shadow ? "url(#softShadow)" : "none"}">
      ${poly(left, opts.left ?? C.stockLeft)}
      ${poly(right, opts.right ?? C.stockRight)}
      ${poly(top, opts.top ?? C.stockTop)}
    </g>
  `
}

function dimH(x1, x2, y, label, opts = {}) {
  const color = opts.color ?? C.ink
  const labelY = opts.labelY ?? y - 18
  const anchor = opts.anchor ?? "middle"
  const marker = opts.marker ?? "arrow"
  return `
    ${line(x1, y, x2, y, color, opts.sw ?? 4, `marker-start="url(#${marker})" marker-end="url(#${marker})"`)}
    ${line(x1, y - 34, x1, y + 34, color, 3)}
    ${line(x2, y - 34, x2, y + 34, color, 3)}
    ${text((x1 + x2) / 2, labelY, label, opts.size ?? 42, 700, `text-anchor="${anchor}"`)}
  `
}

function dimV(x, y1, y2, label, opts = {}) {
  const color = opts.color ?? C.ink
  const labelX = opts.labelX ?? x - 54
  const marker = opts.marker ?? "arrow"
  return `
    ${line(x, y1, x, y2, color, opts.sw ?? 4, `marker-start="url(#${marker})" marker-end="url(#${marker})"`)}
    ${line(x - 34, y1, x + 34, y1, color, 3)}
    ${line(x - 34, y2, x + 34, y2, color, 3)}
    ${text(labelX, (y1 + y2) / 2 + 14, label, opts.size ?? 42, 700, `text-anchor="middle"`)}
  `
}

function save(name, body, w = W, h = H) {
  return sharp(Buffer.from(doc(body, w, h)))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(name, outDir)))
}

function miniPocket(x, y) {
  return `
    ${isoBlock(x, y + 24, 220, 145, 120)}
    ${path(`M${x + 72} ${y + 86} H${x + 232} L${x + 298} ${y + 126} H${x + 136} Z`, C.cut)}
    <rect x="${x + 170}" y="${y + 88}" width="38" height="150" rx="19" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="4"/>
  `
}

function miniWall(x, y) {
  return `
    ${isoBlock(x, y + 148, 235, 120, 54)}
    <rect x="${x + 112}" y="${y + 44}" width="74" height="160" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="4"/>
    ${line(x + 236, y + 78, x + 280, y + 142, C.greenDark, 6, `marker-end="url(#arrowGreen)"`)}
  `
}

function miniHole(x, y) {
  return `
    ${sectionRect(x + 32, y + 32, 260, 210)}
    <rect x="${x + 82}" y="${y + 32}" width="48" height="138" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="4"/>
    <path d="M${x + 190} ${y + 32} H${x + 238} V${y + 162} L${x + 214} ${y + 190} L${x + 190} ${y + 162} Z" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="4"/>
    ${line(x + 88, y + 58, x + 124, y + 58, C.greenSoft, 3)}
    ${line(x + 196, y + 58, x + 232, y + 58, C.greenSoft, 3)}
  `
}

function miniStock(x, y) {
  return `
    ${isoBlock(x, y + 42, 250, 150, 140)}
    ${poly(
      [
        [x + 88, y + 84],
        [x + 222, y + 84],
        [x + 284, y + 120],
        [x + 150, y + 120],
      ],
      C.green,
    )}
    ${dimH(x + 78, x + 292, y + 42, "", { color: C.ink, size: 1 })}
  `
}

function miniSetup(x, y) {
  return `
    ${isoBlock(x, y + 60, 250, 150, 140)}
    <path d="M${x + 74} ${y + 126} H${x + 212}" stroke="${C.red}" stroke-width="18"/>
    <path d="M${x + 165} ${y + 42} C${x + 255} ${y - 30} ${x + 344} ${y + 42} ${x + 340} ${y + 152}" fill="none" stroke="${C.ink}" stroke-width="7" marker-end="url(#arrow)"/>
  `
}

function miniPads(x, y) {
  return `
    ${isoBlock(x, y + 84, 270, 150, 120)}
    ${poly(
      [
        [x + 84, y + 76],
        [x + 138, y + 76],
        [x + 178, y + 100],
        [x + 124, y + 100],
      ],
      C.green,
    )}
    ${poly(
      [
        [x + 184, y + 76],
        [x + 238, y + 76],
        [x + 278, y + 100],
        [x + 224, y + 100],
      ],
      C.green,
    )}
  `
}

await mkdir(outDir, { recursive: true })

await save(
  "cnc-design-lens.png",
  `
  ${centerText(800, 72, "CNC design review", 42, 700)}
  ${centerText(800, 120, "Look for tool access, stiffness, holes, stock, setups, and datum surfaces.", 28, 500)}

  <g transform="translate(95 190)">
    ${miniPocket(0, 0)}
    ${centerText(170, 300, "Internal radii", 34)}
  </g>
  <g transform="translate(600 190)">
    ${miniWall(0, 0)}
    ${centerText(170, 300, "Feature height", 34)}
  </g>
  <g transform="translate(1090 190)">
    ${miniHole(0, 0)}
    ${centerText(170, 300, "Threads + holes", 34)}
  </g>

  <g transform="translate(95 565)">
    ${miniStock(0, 0)}
    ${centerText(170, 300, "Raw stock", 34)}
  </g>
  <g transform="translate(600 565)">
    ${miniSetup(0, 0)}
    ${centerText(170, 300, "Setups", 34)}
  </g>
  <g transform="translate(1090 565)">
    ${miniPads(0, 0)}
    ${centerText(170, 300, "Datum pads", 34)}
  </g>
`,
)

await save(
  "internal-corners.png",
  `
  ${centerText(800, 72, "Internal corners set the cutter", 42, 700)}

  <g transform="translate(90 145)">
    ${text(40, 26, "Avoid: part R = cutter R", 34)}
    ${rect(45, 70, 500, 500, C.section)}
    <path d="M175 70 V355 H545" fill="none" stroke="${C.cut}" stroke-width="170" stroke-linecap="butt"/>
    <path d="M175 270 A85 85 0 0 0 260 355" fill="none" stroke="${C.red}" stroke-width="32"/>
    <circle cx="260" cy="270" r="82" fill="none" stroke="${C.redDark}" stroke-width="6"/>
    <path d="M260 270 L175 270 M260 270 L260 355" stroke="${C.redDark}" stroke-width="4"/>
    ${line(355, 155, 276, 240, C.redDark, 6, `marker-end="url(#arrowRed)"`)}
    ${text(370, 150, "high corner", 28)}
    ${text(370, 184, "engagement", 28)}
  </g>

  <g transform="translate(760 145)">
    ${text(40, 26, "Better: part R > cutter R", 34)}
    ${rect(45, 70, 500, 500, C.section)}
    <path d="M175 70 V355 H545" fill="none" stroke="${C.cut}" stroke-width="170" stroke-linecap="butt"/>
    <path d="M175 205 A150 150 0 0 0 325 355" fill="none" stroke="${C.green}" stroke-width="34"/>
    <circle cx="265" cy="265" r="68" fill="none" stroke="${C.greenDark}" stroke-width="6"/>
    <path d="M265 265 L175 205" stroke="${C.greenDark}" stroke-width="4"/>
    ${line(410, 162, 328, 228, C.greenDark, 6, `marker-end="url(#arrowGreen)"`)}
    ${text(430, 150, "room for", 28)}
    ${text(430, 184, "toolpath", 28)}
  </g>

  ${centerText(800, 835, "Use larger internal radii; use dogbones when a square mating corner is required.", 34, 600)}
`,
)

await save(
  "feature-proportions.png",
  `
  ${centerText(800, 64, "Tall, narrow features vibrate", 42, 700)}
  ${centerText(800, 118, "Rule of thumb: keep H < 4W, or add ribs/support.", 32, 600)}

  <g transform="translate(95 150)">
    ${text(130, 38, "Poor", 44)}
    ${isoBlock(90, 420, 420, 190, 74)}
    <rect x="260" y="108" width="92" height="315" fill="url(#redGrad)" stroke="${C.line}" stroke-width="5"/>
    <path d="M390 130 C500 220 332 286 462 420" fill="none" stroke="${C.redDark}" stroke-width="8"/>
    ${line(456, 164, 510, 164, C.redDark, 6, `marker-end="url(#arrowRed)"`)}
    ${dimV(205, 108, 422, "H", { size: 52 })}
    ${dimH(260, 352, 600, "W", { labelY: 670, size: 52 })}
  </g>

  <g transform="translate(875 150)">
    ${text(130, 38, "Better", 44)}
    ${isoBlock(60, 420, 455, 190, 74)}
    <rect x="235" y="260" width="150" height="162" fill="${C.green}" stroke="${C.line}" stroke-width="5"/>
    ${poly(
      [
        [235, 420],
        [95, 320],
        [160, 320],
        [385, 420],
      ],
      C.greenSoft,
    )}
    ${poly(
      [
        [385, 420],
        [535, 320],
        [470, 320],
        [235, 420],
      ],
      C.greenSoft,
    )}
    ${dimV(445, 260, 422, "H", { size: 52 })}
    ${dimH(235, 385, 600, "W", { labelY: 670, size: 52 })}
  </g>
`,
)

await save(
  "threads-and-holes.png",
  `
  ${centerText(800, 64, "Tapped holes and drill depth", 42, 700)}

  <g transform="translate(70 150)">
    ${centerText(230, 0, "Flat bottom", 48)}
    ${sectionRect(20, 56, 420, 560)}
    <rect x="176" y="56" width="88" height="420" fill="url(#redGrad)" stroke="${C.line}" stroke-width="5"/>
    ${centerText(230, 690, "extra tool / operation", 30)}
  </g>

  <g transform="translate(595 150)">
    ${centerText(230, 0, "Blind tapped", 48)}
    ${sectionRect(20, 56, 420, 560)}
    <path d="M180 56 H268 V390 L224 438 L180 390 Z" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="5"/>
    ${Array.from({ length: 7 }, (_, i) => line(192, 92 + i * 34, 256, 92 + i * 34, C.greenSoft, 3)).join("")}
    ${dimV(358, 392, 490, "> 0.5D", { labelX: 444, size: 38 })}
    ${dimV(84, 56, 330, "L < 3D", { labelX: -10, size: 38 })}
    ${centerText(230, 690, "leave pilot depth below threads", 30)}
  </g>

  <g transform="translate(1120 150)">
    ${centerText(230, 0, "Thru hole", 48)}
    ${sectionRect(20, 56, 360, 560)}
    <rect x="154" y="56" width="88" height="560" fill="url(#greenGrad)" stroke="${C.line}" stroke-width="5"/>
    ${Array.from({ length: 7 }, (_, i) => line(166, 92 + i * 34, 230, 92 + i * 34, C.greenSoft, 3)).join("")}
    ${dimV(425, 56, 616, "L < 6D", { labelX: 360, size: 42 })}
    ${dimH(154, 242, 660, "D", { labelY: 730, size: 46 })}
  </g>
`,
)

await save(
  "stock-workholding.png",
  `
  ${centerText(800, 70, "Stock allowance is part of the design", 42, 700)}

  <g transform="translate(95 160)">
    ${text(160, 28, "Top view", 38)}
    ${isoBlock(45, 96, 610, 330, 190)}
    ${poly(
      [
        [190, 188],
        [542, 188],
        [710, 286],
        [358, 286],
      ],
      C.green,
    )}
    <path d="M175 166 H730" fill="none" stroke="${C.greenDark}" stroke-width="6" marker-start="url(#arrowGreen)" marker-end="url(#arrowGreen)"/>
    ${line(175, 166, 175, 312, C.greenDark, 3)}
    ${line(730, 166, 730, 312, C.greenDark, 3)}
    ${centerText(452, 148, "finished part inside stock envelope", 30)}
    ${line(230, 404, 355, 404, C.greenDark, 7, `marker-end="url(#arrowGreen)"`)}
    ${text(210, 462, "1 mm cleanup stock", 34)}
  </g>

  <g transform="translate(850 155)">
    ${text(185, 28, "Side view in vise", 38)}
    ${rect(70, 485, 560, 95, C.stockTop)}
    ${rect(168, 485, 364, 95, C.stockRight)}
    ${line(120, 455, 580, 455, C.line, 5)}
    ${rect(250, 210, 210, 245, C.stockRight)}
    ${poly(
      [
        [250, 210],
        [430, 210],
        [505, 252],
        [325, 252],
      ],
      C.stockTop,
    )}
    ${poly(
      [
        [300, 260],
        [418, 260],
        [468, 288],
        [350, 288],
      ],
      C.green,
    )}
    ${line(665, 455, 665, 520, C.ink, 4, `marker-start="url(#arrow)" marker-end="url(#arrow)"`)}
    ${line(635, 455, 700, 455, C.ink, 3)}
    ${line(635, 520, 700, 520, C.ink, 3)}
    ${text(590, 445, "3 mm", 38, 700, `text-anchor="middle"`)}
    ${centerText(350, 675, "leave material for the vise", 34)}
  </g>
`,
)

await save(
  "setups.png",
  `
  ${centerText(800, 70, "Reduce setups", 42, 700)}

  <g transform="translate(95 150)">
    ${centerText(330, 20, "One setup", 48)}
    ${isoBlock(90, 160, 470, 260, 245)}
    <path d="M230 252 H400" stroke="url(#greenGrad)" stroke-width="38" stroke-linecap="round"/>
    <path d="M278 405 Q278 318 365 318 H455 V500 H278Z" fill="${C.green}" stroke="${C.line}" stroke-width="5"/>
    ${line(360, 90, 360, 188, C.greenDark, 8, `marker-end="url(#arrowGreen)"`)}
    ${text(384, 116, "+Z tool access", 32)}
    ${centerText(330, 690, "related features face the same direction", 32)}
  </g>

  <g transform="translate(875 150)">
    ${centerText(330, 20, "Extra setup", 48)}
    ${isoBlock(70, 210, 500, 270, 255)}
    <path d="M170 280 H410" stroke="${C.red}" stroke-width="24"/>
    <path d="M320 100 C460 0 650 104 662 296" fill="none" stroke="${C.ink}" stroke-width="8" marker-end="url(#arrow)"/>
    ${text(382, 118, "flip / re-locate", 32)}
    ${centerText(330, 690, "side features usually need another setup", 32)}
  </g>
`,
)

await save(
  "tolerance-pads.png",
  `
  ${centerText(800, 70, "Make tight tolerance areas small", 42, 700)}

  <g transform="translate(45 150)">
    ${centerText(360, 20, "Full face", 48)}
    ${isoBlock(80, 180, 560, 315, 245)}
    <path d="M205 315 H650" stroke="${C.red}" stroke-width="36"/>
    ${dimH(190, 650, 132, "large flatness area", { size: 34, labelY: 112 })}
    <g transform="translate(245 520)">
      ${rect(0, 0, 238, 62, C.cut, C.line, 3)}
      ${path("M18 31 H70", "none", C.ink, 3)}
      <polygon points="94,15 126,31 94,47" fill="${C.ink}"/>
      ${text(142, 41, "0.05", 28)}
    </g>
    ${centerText(360, 708, "cost scales with area", 32)}
  </g>

  <g transform="translate(780 150)">
    ${centerText(360, 20, "Datum pads", 48)}
    ${isoBlock(80, 180, 560, 315, 245)}
    ${poly(
      [
        [205, 165],
        [285, 165],
        [334, 194],
        [254, 194],
      ],
      C.green,
    )}
    ${poly(
      [
        [375, 165],
        [455, 165],
        [504, 194],
        [424, 194],
      ],
      C.green,
    )}
    ${poly(
      [
        [545, 165],
        [625, 165],
        [674, 194],
        [594, 194],
      ],
      C.green,
    )}
    ${dimH(205, 674, 132, "small controlled areas", { color: C.greenDark, marker: "arrowGreen", size: 34, labelY: 112 })}
    <g transform="translate(280 520)">
      ${rect(0, 0, 238, 62, C.cut, C.line, 3)}
      ${path("M18 31 H70", "none", C.ink, 3)}
      <polygon points="94,15 126,31 94,47" fill="${C.ink}"/>
      ${text(142, 41, "0.05", 28)}
    </g>
    ${centerText(360, 708, "machine and inspect only the pads", 32)}
  </g>
`,
)

console.log("Generated CNC figures in quartz/static/cnc")
