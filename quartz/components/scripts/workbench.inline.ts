type ImageRect = {
  height: number
  width: number
  x: number
  y: number
}

type WorkbenchPortal = {
  element: HTMLElement
  height: number
  id: string
  radius: number
  width: number
  x: number
  y: number
}

type TextTarget = {
  x: number
  y: number
}

type Particle = {
  activePull: number
  activeRadius: number
  color: string
  orbitAngle: number
  orbitRadius: number
  portalIndex: number
  seed: number
  size: number
  speed: number
  startX: number
  startY: number
  textAnchor: boolean
  textX: number
  textY: number
  vx: number
  vy: number
  x: number
  y: number
}

type WorkbenchController = {
  destroy: () => void
  root: HTMLElement
}

const imageAspect = 16 / 9
const sessionKey = "jaisel-workbench-intro-seen:v5"
const particleColors = ["#f2ff45", "#d8ff4d", "#b9ff76", "#fff36a"]
const introFormMs = 1900
const introHoldMs = 1350
const introDisperseMs = 1200
const introTotalMs = introFormMs + introHoldMs + introDisperseMs
const titleBox = { height: 0.23, width: 0.54, x: 0.25, y: 0.075 }

let activeController: WorkbenchController | undefined

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function safeGetSession(key: string) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {}
}

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const item = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = item
  }
  return copy
}

function readNormalized(element: HTMLElement, key: "x" | "y" | "w" | "h", fallback: number) {
  const value = Number(element.dataset[key])
  return Number.isFinite(value) ? clamp(value, -1, 2) : fallback
}

function getImageRect(stage: HTMLElement) {
  const bounds = stage.getBoundingClientRect()
  const objectFit = getComputedStyle(stage.querySelector(".workbench-scene") ?? stage).objectFit

  if (objectFit === "fill") {
    return { height: bounds.height, width: bounds.width, x: 0, y: 0 }
  }

  const stageAspect = bounds.width / bounds.height
  if (stageAspect > imageAspect) {
    const height = bounds.width / imageAspect
    return { height, width: bounds.width, x: 0, y: (bounds.height - height) / 2 }
  }

  const width = bounds.height * imageAspect
  return { height: bounds.height, width, x: (bounds.width - width) / 2, y: 0 }
}

function createFallbackTargets(imageRect: ImageRect) {
  const targets: TextTarget[] = []
  const centerX = imageRect.x + (titleBox.x + titleBox.width / 2) * imageRect.width
  const centerY = imageRect.y + (titleBox.y + titleBox.height / 2) * imageRect.height

  for (let index = 0; index < 380; index++) {
    const angle = (index / 380) * Math.PI * 2
    const radius = imageRect.width * (0.07 + (index % 9) * 0.003)
    targets.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius * 0.38,
    })
  }

  return targets
}

function createTextTargets(
  canvasWidth: number,
  visibleWidth: number,
  imageRect: ImageRect,
  message: string,
) {
  const sampleCanvas = document.createElement("canvas")
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true })
  if (!sampleContext) return createFallbackTargets(imageRect)

  const isMobileView = visibleWidth < 760
  const titleCenter = imageRect.x + (titleBox.x + titleBox.width / 2) * imageRect.width
  const titleWidth = isMobileView
    ? Math.min(imageRect.width * titleBox.width, visibleWidth * 0.9)
    : imageRect.width * titleBox.width
  const box = {
    height: Math.max(
      isMobileView ? 96 : 120,
      imageRect.height * (isMobileView ? 0.18 : titleBox.height),
    ),
    width: Math.max(isMobileView ? 280 : 320, titleWidth),
    x: isMobileView ? titleCenter - titleWidth / 2 : imageRect.x + imageRect.width * titleBox.x,
    y: imageRect.y + imageRect.height * titleBox.y,
  }
  const sampleWidth = Math.floor(box.width)
  const sampleHeight = Math.floor(box.height)

  sampleCanvas.width = sampleWidth
  sampleCanvas.height = sampleHeight
  sampleContext.clearRect(0, 0, sampleWidth, sampleHeight)
  sampleContext.fillStyle = "#fff"
  sampleContext.textAlign = "center"
  sampleContext.textBaseline = "middle"

  const lines = isMobileView ? ["Jaisel's", "Workbench"] : [message]
  const maxFontSize = Math.min(sampleHeight * 0.62, sampleWidth * 0.12)
  const minFontSize = isMobileView ? 20 : 28
  let fontSize = Math.max(minFontSize, Math.floor(maxFontSize))
  while (fontSize > minFontSize) {
    sampleContext.font = `900 ${fontSize}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`
    const widestLine = Math.max(...lines.map((line) => sampleContext.measureText(line).width))
    const lineHeight = fontSize * 1.04
    if (widestLine <= sampleWidth * 0.94 && lineHeight * lines.length <= sampleHeight * 0.82) break
    fontSize -= 2
  }

  sampleContext.font = `900 ${fontSize}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`
  const lineHeight = fontSize * 1.04
  const firstLineY = sampleHeight * 0.5 - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => {
    sampleContext.fillText(line, sampleWidth / 2, firstLineY + index * lineHeight)
  })

  const image = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight)
  const targets: TextTarget[] = []
  const gap = visibleWidth < 760 ? 5 : canvasWidth < 1200 ? 8 : 9

  for (let y = 0; y < sampleHeight; y += gap) {
    for (let x = 0; x < sampleWidth; x += gap) {
      const alpha = image.data[(y * sampleWidth + x) * 4 + 3]
      if (alpha > 80) {
        targets.push({
          x: box.x + x,
          y: box.y + y,
        })
      }
    }
  }

  if (targets.length === 0) return createFallbackTargets(imageRect)

  const maxTargets = visibleWidth < 760 ? 760 : canvasWidth < 1200 ? 860 : 980
  return shuffled(targets).slice(0, maxTargets)
}

function getSpawnPoint(width: number, height: number) {
  const side = Math.floor(Math.random() * 4)
  const margin = 100

  if (side === 0) {
    return { x: Math.random() * width, y: -margin }
  }

  if (side === 1) {
    return { x: width + margin, y: Math.random() * height }
  }

  if (side === 2) {
    return { x: Math.random() * width, y: height + margin }
  }

  return { x: -margin, y: Math.random() * height }
}

function measurePortals(root: HTMLElement, imageRect: ImageRect) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-workbench-portal]"))

  return elements.map((element) => {
    const left = imageRect.x + readNormalized(element, "x", 0.5) * imageRect.width
    const top = imageRect.y + readNormalized(element, "y", 0.5) * imageRect.height
    const width = readNormalized(element, "w", 0.1) * imageRect.width
    const height = readNormalized(element, "h", 0.1) * imageRect.height

    element.style.left = `${left}px`
    element.style.top = `${top}px`
    element.style.width = `${width}px`
    element.style.height = `${height}px`

    return {
      element,
      height,
      id: element.dataset.workbenchPortal ?? "portal",
      radius: Math.max(30, Math.min(width, height) * 0.46),
      width,
      x: left + width / 2,
      y: top + height / 2,
    }
  })
}

function createParticles(
  targets: TextTarget[],
  portals: WorkbenchPortal[],
  width: number,
  height: number,
  startWithIntro: boolean,
) {
  const fallbackPortal = {
    element: document.body,
    height: 100,
    id: "fallback",
    radius: 80,
    width: 100,
    x: width / 2,
    y: height * 0.64,
  }
  const portalList = portals.length > 0 ? portals : [fallbackPortal]

  return targets.map((target, index) => {
    const spawn = getSpawnPoint(width, height)
    const orbitAngle = Math.random() * Math.PI * 2
    const titleAnchor = index % 5 !== 0
    const portalIndex = titleAnchor
      ? index % portalList.length
      : Math.floor(index / 5) % portalList.length
    const portal = portalList[portalIndex]
    const orbitRadius = portal.radius * (0.46 + Math.random() * 0.92)
    const portalX = portal.x + Math.cos(orbitAngle) * orbitRadius
    const portalY = portal.y + Math.sin(orbitAngle) * orbitRadius

    return {
      activePull: Math.random(),
      activeRadius: portal.radius * (0.32 + Math.random() * 0.36),
      color: particleColors[index % particleColors.length],
      orbitAngle,
      orbitRadius,
      portalIndex,
      seed: Math.random() * 1000,
      size: 1.55 + Math.random() * 2.05,
      speed: 0.00045 + Math.random() * 0.00042,
      startX: spawn.x,
      startY: spawn.y,
      textAnchor: titleAnchor,
      textX: target.x,
      textY: target.y,
      vx: 0,
      vy: 0,
      x: startWithIntro ? spawn.x : titleAnchor ? target.x : portalX,
      y: startWithIntro ? spawn.y : titleAnchor ? target.y : portalY,
    }
  })
}

function createWorkbench(root: HTMLElement): WorkbenchController | undefined {
  const canvasElement = root.querySelector<HTMLCanvasElement>("[data-workbench-canvas]")
  const stage = root.querySelector<HTMLElement>("[data-workbench-stage]")
  const viewport = root.querySelector<HTMLElement>("[data-workbench-viewport]")
  if (!canvasElement || !stage || !viewport) return undefined
  const stageElement = stage
  const viewportElement = viewport

  const drawingContext = canvasElement.getContext("2d")
  if (!drawingContext) return undefined

  const canvas: HTMLCanvasElement = canvasElement
  const context: CanvasRenderingContext2D = drawingContext

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const message = root.dataset.workbenchMessage ?? "Jaisel's Workbench"
  const cleanupFns: (() => void)[] = []
  const pointer = { active: false, x: 0, y: 0 }

  let animationFrame = 0
  let activePortal: string | undefined
  let canvasHeight = 1
  let canvasWidth = 1
  let centeringScene = false
  let introComplete = reducedMotion || safeGetSession(sessionKey) === "true"
  let introStart = performance.now()
  let particles: Particle[] = []
  let portals: WorkbenchPortal[] = []
  let resizeFrame = 0
  let userScrolledScene = false

  function centerScene(imageRect: ImageRect) {
    if (userScrolledScene || viewportElement.scrollWidth <= viewportElement.clientWidth + 2) return

    const titleCenter = imageRect.x + (titleBox.x + titleBox.width / 2) * imageRect.width
    const targetLeft = clamp(
      titleCenter - viewportElement.clientWidth / 2,
      0,
      viewportElement.scrollWidth - viewportElement.clientWidth,
    )
    centeringScene = true
    viewportElement.scrollLeft = targetLeft
    requestAnimationFrame(() => {
      centeringScene = false
    })
  }

  function queueResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(resize)
  }

  function resize() {
    resizeFrame = 0
    const bounds = stageElement.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)

    canvasWidth = Math.max(320, bounds.width)
    canvasHeight = Math.max(420, bounds.height)
    canvas.width = Math.floor(canvasWidth * ratio)
    canvas.height = Math.floor(canvasHeight * ratio)
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    const imageRect = getImageRect(stageElement)
    portals = measurePortals(root, imageRect)
    const targets = createTextTargets(canvasWidth, viewportElement.clientWidth, imageRect, message)
    particles = createParticles(targets, portals, canvasWidth, canvasHeight, !introComplete)
    introStart = performance.now()
    centerScene(imageRect)
  }

  function addListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ) {
    element.addEventListener(type, listener)
    cleanupFns.push(() => element.removeEventListener(type, listener))
  }

  function scrollPortalIntoView(element: HTMLElement) {
    if (viewportElement.scrollWidth <= viewportElement.clientWidth + 2) return

    const portalCenter = element.offsetLeft + element.offsetWidth / 2
    const targetLeft = clamp(
      portalCenter - viewportElement.clientWidth / 2,
      0,
      viewportElement.scrollWidth - viewportElement.clientWidth,
    )
    viewportElement.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      left: targetLeft,
    })
  }

  function setActivePortal(id: string | undefined) {
    activePortal = id
    for (const portal of root.querySelectorAll<HTMLElement>("[data-workbench-portal]")) {
      if (id && portal.dataset.workbenchPortal === id) {
        portal.dataset.workbenchActive = "true"
      } else {
        delete portal.dataset.workbenchActive
      }
    }

    if (id) {
      root.dataset.workbenchActive = id
    } else {
      delete root.dataset.workbenchActive
    }
  }

  function setupPortalListeners() {
    for (const portal of root.querySelectorAll<HTMLElement>("[data-workbench-portal]")) {
      const id = portal.dataset.workbenchPortal ?? "portal"
      addListener(portal, "mouseenter", () => setActivePortal(id))
      addListener(portal, "focus", () => {
        setActivePortal(id)
        scrollPortalIntoView(portal)
      })
      addListener(portal, "pointerdown", () => {
        setActivePortal(id)
        scrollPortalIntoView(portal)
      })
      addListener(portal, "mouseleave", () => {
        if (activePortal === id && document.activeElement !== portal) setActivePortal(undefined)
      })
      addListener(portal, "blur", () => {
        if (activePortal === id) setActivePortal(undefined)
      })
    }
  }

  function getPortalForParticle(particle: Particle) {
    if (activePortal) {
      const portal = portals.find((item) => item.id === activePortal)
      if (portal) return portal
    }

    return portals[particle.portalIndex % portals.length]
  }

  function getTitleTarget(particle: Particle, time: number) {
    if (reducedMotion) return { x: particle.textX, y: particle.textY }

    return {
      x: particle.textX + Math.sin(time * 0.0014 + particle.seed) * 1.1,
      y: particle.textY + Math.cos(time * 0.0011 + particle.seed) * 1.1,
    }
  }

  function getParticleTarget(particle: Particle, time: number) {
    const shouldStayTitle = activePortal
      ? particle.textAnchor && particle.activePull > 0.34
      : particle.textAnchor

    if (shouldStayTitle) return getTitleTarget(particle, time)

    const portal = getPortalForParticle(particle)
    if (!portal) return getTitleTarget(particle, time)

    const animatedAngle = reducedMotion
      ? particle.orbitAngle
      : particle.orbitAngle + time * particle.speed
    const radius = activePortal
      ? particle.activeRadius
      : particle.orbitRadius + Math.sin(time * 0.0011 + particle.seed) * 4

    return {
      x: portal.x + Math.cos(animatedAngle) * radius,
      y: portal.y + Math.sin(animatedAngle) * radius,
    }
  }

  function drawPortalFields(time: number) {
    context.save()
    context.globalCompositeOperation = "lighter"

    for (const portal of portals) {
      const isActive = activePortal === portal.id
      const alpha = isActive ? 0.5 : 0.13
      const pulse = reducedMotion ? 0 : Math.sin(time * 0.003 + portal.x) * 0.05
      const glowWidth = portal.width * (0.66 + pulse)
      const glowHeight = portal.height * (0.58 + pulse)
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, portal.radius * 1.55)

      gradient.addColorStop(0, `rgba(242, 255, 69, ${alpha})`)
      gradient.addColorStop(0.58, `rgba(242, 255, 69, ${alpha * 0.24})`)
      gradient.addColorStop(1, "rgba(242, 255, 69, 0)")

      context.save()
      context.translate(portal.x, portal.y)
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(0, 0, glowWidth / 2, glowHeight / 2, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }

    context.restore()
  }

  function updateIntroParticle(particle: Particle, elapsed: number) {
    if (elapsed < introFormMs) {
      const amount = easeOutCubic(clamp(elapsed / introFormMs, 0, 1))
      particle.x = lerp(particle.startX, particle.textX, amount)
      particle.y = lerp(particle.startY, particle.textY, amount)
      return
    }

    if (elapsed < introFormMs + introHoldMs) {
      const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.012 + particle.seed) * 0.7
      particle.x = particle.textX + drift
      particle.y = particle.textY + Math.cos(elapsed * 0.01 + particle.seed) * 0.7
      return
    }

    const amount = easeInOutCubic(
      clamp((elapsed - introFormMs - introHoldMs) / introDisperseMs, 0, 1),
    )
    const target = getParticleTarget(particle, elapsed)
    particle.x = lerp(particle.textX, target.x, amount)
    particle.y = lerp(particle.textY, target.y, amount)
  }

  function updateSettledParticle(particle: Particle, time: number) {
    const target = getParticleTarget(particle, time)

    if (reducedMotion) {
      particle.x = target.x
      particle.y = target.y
      particle.vx = 0
      particle.vy = 0
      return
    }

    particle.vx += (target.x - particle.x) * 0.025
    particle.vy += (target.y - particle.y) * 0.025

    if (pointer.active) {
      const dx = particle.x - pointer.x
      const dy = particle.y - pointer.y
      const distanceSquared = dx * dx + dy * dy
      const influence = 150

      if (distanceSquared > 1 && distanceSquared < influence * influence) {
        const distance = Math.sqrt(distanceSquared)
        const force = (1 - distance / influence) * 1.1
        particle.vx += (dx / distance) * force
        particle.vy += (dy / distance) * force
        particle.vx += (-dy / distance) * force * 0.2
        particle.vy += (dx / distance) * force * 0.2
      }
    }

    particle.vx *= 0.86
    particle.vy *= 0.86
    particle.x += particle.vx
    particle.y += particle.vy
  }

  function drawParticles() {
    context.save()
    context.globalCompositeOperation = "lighter"

    for (const particle of particles) {
      context.beginPath()
      context.fillStyle = "rgba(242, 255, 69, 0.15)"
      context.arc(particle.x, particle.y, particle.size * 2.4, 0, Math.PI * 2)
      context.fill()

      context.beginPath()
      context.fillStyle = particle.color
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      context.fill()

      context.beginPath()
      context.fillStyle = "rgba(255, 255, 255, 0.72)"
      context.arc(
        particle.x - particle.size * 0.25,
        particle.y - particle.size * 0.25,
        particle.size * 0.34,
        0,
        Math.PI * 2,
      )
      context.fill()
    }

    context.restore()
  }

  function tick(time: number) {
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    drawPortalFields(time)

    const elapsed = time - introStart
    if (!introComplete && elapsed >= introTotalMs) {
      introComplete = true
      safeSetSession(sessionKey, "true")
    }

    for (const particle of particles) {
      if (introComplete) {
        updateSettledParticle(particle, time)
      } else {
        updateIntroParticle(particle, elapsed)
      }
    }

    drawParticles()
    animationFrame = requestAnimationFrame(tick)
  }

  function onPointerMove(event: PointerEvent) {
    const bounds = stageElement.getBoundingClientRect()
    pointer.active = true
    pointer.x = event.clientX - bounds.left
    pointer.y = event.clientY - bounds.top
  }

  function onPointerLeave() {
    pointer.active = false
  }

  const resizeObserver = new ResizeObserver(queueResize)
  resizeObserver.observe(stageElement)
  cleanupFns.push(() => resizeObserver.disconnect())

  window.addEventListener("resize", queueResize)
  cleanupFns.push(() => window.removeEventListener("resize", queueResize))

  const onSceneScroll = () => {
    if (!centeringScene) userScrolledScene = true
  }
  viewportElement.addEventListener("scroll", onSceneScroll)
  cleanupFns.push(() => viewportElement.removeEventListener("scroll", onSceneScroll))

  stageElement.addEventListener("pointermove", onPointerMove)
  cleanupFns.push(() => stageElement.removeEventListener("pointermove", onPointerMove))

  stageElement.addEventListener("pointerleave", onPointerLeave)
  cleanupFns.push(() => stageElement.removeEventListener("pointerleave", onPointerLeave))

  setupPortalListeners()
  resize()
  animationFrame = requestAnimationFrame(tick)

  return {
    root,
    destroy() {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      cleanupFns.forEach((cleanup) => cleanup())
    },
  }
}

function setupWorkbench() {
  const root = document.querySelector<HTMLElement>("[data-workbench-home]")

  if (!root) {
    activeController?.destroy()
    activeController = undefined
    return
  }

  if (activeController?.root === root) return

  activeController?.destroy()
  const controller = createWorkbench(root)
  if (!controller) return

  activeController = controller
  window.addCleanup(() => {
    if (activeController === controller) {
      activeController = undefined
    }
    controller.destroy()
  })
}

document.addEventListener("nav", setupWorkbench)
setupWorkbench()
