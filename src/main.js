import { gsap } from 'gsap'

const idea = Object.assign(Object.create(null), { result: 'working software', intent: 'something useful' })
const customKeys = new Set()
const keyInput = document.querySelector('#new-key')
const valueInput = document.querySelector('#new-value')
const editableRow = document.querySelector('#editable-property')
let draftKey
let draftTimer
const property = document.querySelector('#property')
const breakpoint = document.querySelector('#breakpoint')
const run = document.querySelector('#run')
const step = document.querySelector('#step')
const inspection = document.querySelector('#inspection')
const returnLine = document.querySelector('#return-line')
const status = document.querySelector('#run-status')
const guidance = document.querySelector('#guidance')
let hasBreakpoint = false
let execution
let solved = false
let activeTransfer
let letterEffect
let pendingDrop
let firstResult = true
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const desktop = window.matchMedia('(min-width: 1051px) and (hover: hover) and (pointer: fine)')
const returnNumber = () => 7
function syncLineNumbers() {
  document.querySelectorAll('.source .code-line').forEach((row, index) => {
    const number = row.querySelector('.line-number, .breakpoint > span')
    number.textContent = String(index + 1)
  })
  const label = `${hasBreakpoint ? 'Remove' : 'Set'} breakpoint on line ${returnNumber()}`
  breakpoint.setAttribute('aria-label', label)
  breakpoint.title = label
}

// A real suspended computation. Nothing reads the selected property until the
// iterator resumes, so changing it while paused changes the actual result.
function* build() {
  yield idea
  return idea[property.value]
}

function inspect() {
  const key = property.value
  document.querySelector('#lookup-key').textContent = `idea.${key}`
  const value = idea[key]
  document.querySelector('#lookup-value').textContent = value === undefined ? 'undefined' : JSON.stringify(value)
  document.querySelector('.lookup').classList.toggle('missing', value === undefined)
}

function stopTransfer() {
  if (!activeTransfer) return
  const { timeline, ghost, source, target } = activeTransfer
  activeTransfer = undefined
  timeline.kill()
  ghost.remove()
  gsap.set(source, { clearProps: 'opacity' })
  target.style.removeProperty('opacity')
  target.classList.remove('receiving-value')
}

function clearLetters() {
  if (!letterEffect) return
  letterEffect.timeline?.kill()
  letterEffect.extras.forEach(({ source }) => source.style.removeProperty('opacity'))
  letterEffect.layer.remove()
  letterEffect.target.style.removeProperty('opacity')
  letterEffect.target.classList.remove('receiving-value')
  letterEffect = undefined
}

function cancelPendingDrop() {
  pendingDrop?.kill()
  pendingDrop = undefined
}

function letterPositions(target) {
  const node = target.firstChild
  const style = getComputedStyle(target)
  const positions = []
  const range = document.createRange()
  // Measure the actual wrapped text, so returning letters land on their glyphs.
  for (let offset = 0; offset < node.length;) {
    const character = String.fromCodePoint(node.textContent.codePointAt(offset))
    range.setStart(node, offset)
    range.setEnd(node, offset + character.length)
    const rect = range.getBoundingClientRect()
    if (!/\s/.test(character)) positions.push({
      character,
      x: rect.left + scrollX,
      y: rect.top + scrollY - (parseFloat(style.lineHeight) - rect.height) / 2,
    })
    offset += character.length
  }
  return { positions, style }
}

function makeLetter(layer, position, style) {
  const letter = document.createElement('span')
  letter.className = 'fallen-letter'
  letter.textContent = position.character
  Object.assign(letter.style, {
    fontFamily: style.fontFamily, fontSize: style.fontSize,
    fontWeight: style.fontWeight, lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing, color: style.color,
  })
  layer.append(letter)
  gsap.set(letter, { x: position.x, y: position.y })
  return letter
}

function fallingFrames(origin, floor, left, right) {
  // Fixed-step gravity, impact restitution and friction; no eased fall curve.
  const frames = []
  const dt = 1 / 120
  const gravity = gsap.utils.random(1100, 1450)
  const restitution = gsap.utils.random(.27, .38)
  let x = origin.x, y = origin.y, rotation = 0
  let vx = gsap.utils.random(-165, 165), vy = gsap.utils.random(-45, 35)
  let spin = gsap.utils.random(-220, 220)
  let grounded = false
  for (let frame = 0; frame <= 300; frame++) {
    frames.push({ x, y, rotation, scale: 1 - .3 * Math.min(frame * dt / .8, 1) })
    x += vx * dt
    rotation += spin * dt
    if (!grounded) {
      vy += gravity * dt
      y += vy * dt
      if (y >= floor) {
        y = floor
        vy = -vy * restitution
        vx *= .58
        spin *= .48
        if (Math.abs(vy) < 45) grounded = true
      }
    } else {
      vx *= .94
      spin *= .94
    }
    if (x < left || x > right) {
      x = Math.max(left, Math.min(right, x))
      vx *= -.45
      spin *= .7
    }
  }
  return frames
}

function dropLetters(target) {
  clearLetters()
  target.classList.add('receiving-value')
  const { positions, style } = letterPositions(target)
  const layer = document.createElement('div')
  layer.className = 'letter-debris'
  layer.style.height = `${document.documentElement.scrollHeight}px`
  layer.setAttribute('aria-hidden', 'true')
  document.body.append(layer)
  const letters = positions.map(position => makeLetter(layer, position, style))
  const extras = [...document.querySelectorAll('.loose-heading-letter')].map(source => {
    const measured = letterPositions(source)
    const origin = measured.positions[0]
    const letter = makeLetter(layer, origin, measured.style)
    source.style.opacity = '0'
    return { source, letter, origin }
  })
  target.style.opacity = '0'
  const main = document.querySelector('main').getBoundingClientRect()
  const intro = document.querySelector('.intro').getBoundingClientRect()
  const fontSize = parseFloat(style.fontSize)
  const floor = main.bottom + scrollY - fontSize - 60
  const timeline = gsap.timeline()
  letterEffect = { target, layer, letters, extras, timeline }
  const falling = [...letters.map((letter, index) => ({ letter, origin: positions[index] })), ...extras]
  falling.forEach(({ letter, origin }, index) => {
    const landingY = Math.max(origin.y + 100, floor - gsap.utils.random(0, 12))
    const frames = fallingFrames(origin, landingY, intro.left + scrollX, intro.right + scrollX - fontSize)
    const state = { frame: 0 }
    timeline.to(state, {
      frame: frames.length - 1, duration: 2.5, ease: 'none',
      onUpdate: () => {
        const index = Math.floor(state.frame)
        const a = frames[index], b = frames[Math.min(index + 1, frames.length - 1)]
        const t = state.frame - index
        gsap.set(letter, {
          x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
          rotation: a.rotation + (b.rotation - a.rotation) * t,
          scale: a.scale + (b.scale - a.scale) * t,
        })
      },
    }, .15 + gsap.utils.random(0, .18) + (index >= letters.length ? .12 : 0))
  })
}

function collectLetters(target) {
  const effect = letterEffect
  effect.timeline.kill()
  target.classList.add('receiving-value')
  target.style.opacity = '0'
  const { positions, style } = letterPositions(target)
  const origins = effect.letters.map(letter => ({
    x: Number(gsap.getProperty(letter, 'x')),
    y: Number(gsap.getProperty(letter, 'y')),
    rotation: Number(gsap.getProperty(letter, 'rotation')),
  }))
  const letters = positions.map((position, index) => {
    const letter = effect.letters[index] || makeLetter(effect.layer, position, style)
    letter.textContent = position.character
    letter.style.color = style.color
    letter.style.fontSize = style.fontSize
    const origin = origins[index % origins.length]
    gsap.set(letter, { ...origin, scale: Number(gsap.getProperty(effect.letters[index % effect.letters.length], 'scaleX')) })
    return letter
  })
  effect.letters.slice(positions.length).forEach(letter => letter.remove())
  effect.letters = letters
  const timeline = gsap.timeline({ onComplete: clearLetters })
  effect.timeline = timeline
  letters.forEach((letter, index) => {
    timeline.to(letter, {
      x: positions[index].x, y: positions[index].y,
      rotation: 0, scale: 1, duration: .85, ease: 'power3.inOut',
    }, index * .014)
  })
  effect.extras.forEach(({ source, letter }, index) => {
    const destination = letterPositions(source).positions[0]
    timeline.to(letter, {
      x: destination.x, y: destination.y, rotation: 0, scale: 1,
      duration: .9, ease: 'power3.inOut',
    }, index * .035)
  })
}

function transferValue(target, key) {
  const source = (!inspection.hidden ? inspection : document.querySelector('.source'))
    .querySelector(`[data-value="${key}"]`)
  if (!source) return
  const start = source.getBoundingClientRect()
  const end = target.getBoundingClientRect()
  const targetStyle = getComputedStyle(target)
  const sourceStyle = getComputedStyle(source)
  const initialScale = parseFloat(sourceStyle.fontSize) / parseFloat(targetStyle.fontSize)
  const ghost = document.createElement('span')
  ghost.className = 'travelling-value'
  ghost.setAttribute('aria-hidden', 'true')
  ghost.textContent = target.textContent
  Object.assign(ghost.style, {
    width: `${end.width}px`,
    fontFamily: targetStyle.fontFamily,
    fontSize: targetStyle.fontSize,
    fontWeight: targetStyle.fontWeight,
    lineHeight: targetStyle.lineHeight,
    letterSpacing: targetStyle.letterSpacing,
    color: targetStyle.color,
  })
  document.body.append(ghost)
  target.classList.add('receiving-value')
  target.style.opacity = '0'

  const x0 = start.left + parseFloat(sourceStyle.fontSize) * .6
  const y0 = start.top
  const x1 = end.left
  const y1 = end.top
  const lift = Math.min(85, Math.hypot(x1 - x0, y1 - y0) * .16)
  const state = { progress: 0 }
  const draw = () => {
    const t = state.progress, u = 1 - t
    // A cubic path lifts the value out of the object and settles it in the headline.
    const x = u*u*u*x0 + 3*u*u*t*(x0 - lift) + 3*u*t*t*(x1 + lift) + t*t*t*x1
    const y = u*u*u*y0 + 3*u*u*t*(y0 - lift) + 3*u*t*t*(y1 - lift) + t*t*t*y1
    const scale = initialScale + (1 - initialScale) * t
    ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }
  draw()
  const timeline = gsap.timeline({ onComplete: () => {
    stopTransfer()
    // On a narrow screen the editor can be below the headline.
    if (end.bottom < 0 || end.top > innerHeight) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } })
  activeTransfer = { timeline, ghost, source, target }
  timeline.to(source, { opacity: .35, duration: .12, ease: 'power1.out' }, 0)
    .to(state, { progress: 1, duration: .92, ease: 'power2.inOut', onUpdate: draw }, .08)
    .to(source, { opacity: 1, duration: .16, ease: 'power1.out' }, .84)
}

function showResult(result) {
  const initial = firstResult
  firstResult = false
  cancelPendingDrop()
  const value = String(result)
  const missing = result === undefined
  const custom = customKeys.has(property.value)
  solved = !missing
  const greeting = document.querySelector('.greeting-value')
  const changed = greeting.textContent !== value + '.'
  stopTransfer()
  greeting.textContent = value + '.'
  greeting.classList.toggle('broken', !solved)
  greeting.classList.toggle('undefined', missing)
  if (missing) greeting.setAttribute('title', 'Missing property: idea.output is undefined.')
  else greeting.removeAttribute('title')
  if (desktop.matches && !reducedMotion.matches) {
    if (missing && (changed || !letterEffect)) {
      if (initial) {
        pendingDrop = gsap.delayedCall(4.8, () => {
          pendingDrop = undefined
          if (desktop.matches && !reducedMotion.matches && property.value === 'output') dropLetters(greeting)
        })
      } else dropLetters(greeting)
    }
    else if (!missing && letterEffect) collectLetters(greeting)
    else if (changed) transferValue(greeting, property.value)
  } else if (changed && result !== undefined && !reducedMotion.matches) {
    transferValue(greeting, property.value)
  }
  document.querySelector('#invitation').textContent = custom ? 'Plot twist: you’re the developer now.' : solved ? 'An idea, connected to its result.' : 'Can you connect the idea to its result?'
  status.textContent = missing ? 'Unexpected output' : custom ? 'Feature shipped' : property.value === 'result' ? 'Bug fixed' : 'Output connected'
  status.classList.toggle('success', solved)
  status.classList.toggle('error', !solved)
  returnLine.classList.remove('paused')
  step.disabled = true
  run.disabled = false
  guidance.textContent = custom
    ? 'No ticket. No meeting. Just shipped. Try another property — this is your playground.'
    : solved
    ? property.value === 'intent'
      ? 'The intent is connected. The code returns its value. Try result for working software.'
      : 'The idea has a result. Now the code returns it. You made the connection.'
    : hasBreakpoint
      ? 'Compare the selected property with the local scope to find the result.'
      : 'Change the property to try a fix. Debug lets you inspect the values.'
  document.querySelector('.scope-header > span').textContent = 'Property values'
  execution = undefined
}

function execute() {
  execution = build()
  execution.next()
  if (hasBreakpoint) {
    inspection.hidden = false
    document.querySelector('.scope-header > span').textContent = `Paused before line ${returnNumber()}`
    inspect()
    returnLine.classList.add('paused')
    status.textContent = `Paused on line ${returnNumber()}`
    status.classList.remove('success')
    status.classList.remove('error')
    step.disabled = false
    run.disabled = true
    guidance.textContent = 'Compare the lookup with the object. Changing the property updates the result immediately.'
  } else {
    inspection.hidden = true
    showResult(execution.next().value)
  }
}

breakpoint.addEventListener('click', () => {
  hasBreakpoint = !hasBreakpoint
  breakpoint.setAttribute('aria-pressed', String(hasBreakpoint))
  syncLineNumbers()
  if (execution) return
  guidance.textContent = hasBreakpoint
    ? 'Breakpoint set. Debug to inspect the property before it is read.'
    : 'Change the property to try a fix. Debug lets you inspect the values.'
})
run.addEventListener('click', () => {
  hasBreakpoint = true
  breakpoint.setAttribute('aria-pressed', 'true')
  syncLineNumbers()
  execute()
})
step.addEventListener('click', () => {
  if (execution) showResult(execution.next().value)
})
property.addEventListener('change', () => {
  clearTimeout(draftTimer)
  execution?.return()
  execution = build()
  execution.next()
  if (!inspection.hidden) inspect()
  showResult(execution.next().value)
})
document.querySelector('#restart').addEventListener('click', () => {
  stopTransfer()
  for (const key of customKeys) delete idea[key]
  customKeys.clear()
  document.querySelectorAll('[data-custom]').forEach(element => element.remove())
  clearTimeout(draftTimer)
  draftKey = undefined
  keyInput.value = ''
  valueInput.value = ''
  keyInput.style.removeProperty('width')
  valueInput.style.removeProperty('width')
  valueInput.removeAttribute('data-value')
  setDraftError('')
  execution?.return()
  execution = undefined
  hasBreakpoint = false
  property.value = 'output'
  breakpoint.setAttribute('aria-pressed', 'false')
  breakpoint.setAttribute('aria-label', 'Set breakpoint on line 7')
  breakpoint.title = 'Set breakpoint on line 7'
  syncLineNumbers()
  execute()
})
function setDraftError(message) {
  editableRow.classList.toggle('invalid', Boolean(message))
  keyInput.setAttribute('aria-invalid', String(Boolean(message)))
  valueInput.setAttribute('aria-invalid', String(Boolean(message)))
  editableRow.title = message
  document.querySelector('#property-error').textContent = message
}
function updateDraft() {
  clearTimeout(draftTimer)
  const key = keyInput.value.trim()
  const value = valueInput.value.trim()
  keyInput.style.width = `${Math.max(8, keyInput.value.length)}ch`
  valueInput.style.width = `${Math.max(15, valueInput.value.length)}ch`
  const duplicate = key !== draftKey && Object.hasOwn(idea, key)
  const invalid = key && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
  setDraftError(duplicate ? 'This property already exists. Choose another key.' : invalid ? 'Use a valid JavaScript property name.' : '')
  if (draftKey && (key !== draftKey || !value || duplicate || invalid)) {
    delete idea[draftKey]
    customKeys.delete(draftKey)
    document.querySelectorAll('[data-custom]').forEach(element => element.remove())
    if (property.value === draftKey) {
      property.value = 'output'
      property.dispatchEvent(new Event('change'))
    }
    draftKey = undefined
    valueInput.removeAttribute('data-value')
  }
  if (!key || !value || duplicate || invalid) return
  draftKey = key
  idea[key] = value
  customKeys.add(key)
  valueInput.dataset.value = key
  let option = property.querySelector('[data-custom]')
  if (!option) {
    option = new Option(key, key)
    option.dataset.custom = ''
    property.append(option)
  }
  option.value = key
  option.textContent = key
  let scopeRow = document.querySelector('.scope [data-custom]')
  if (!scopeRow) {
    scopeRow = document.createElement('div')
    scopeRow.dataset.custom = ''
    scopeRow.append(document.createElement('dt'), document.createElement('dd'))
    document.querySelector('.lookup').before(scopeRow)
  }
  scopeRow.firstElementChild.textContent = `idea.${key}`
  scopeRow.lastElementChild.textContent = JSON.stringify(value)
  scopeRow.lastElementChild.dataset.value = key
  // Let the person finish a word before carrying it into the headline.
  draftTimer = setTimeout(() => {
    property.value = key
    property.dispatchEvent(new Event('change'))
  }, 450)
}
keyInput.addEventListener('input', updateDraft)
valueInput.addEventListener('input', updateDraft)
const onMotionChange = () => { if (reducedMotion.matches) { cancelPendingDrop(); stopTransfer(); clearLetters() } }
const onViewportChange = () => { cancelPendingDrop(); stopTransfer(); clearLetters() }
const onScroll = () => stopTransfer()
reducedMotion.addEventListener('change', onMotionChange)
window.addEventListener('resize', onViewportChange)
window.addEventListener('scroll', onScroll, { passive: true })
execute()
if (import.meta.hot) import.meta.hot.dispose(() => {
  execution?.return()
  clearTimeout(draftTimer)
  stopTransfer()
  clearLetters()
  cancelPendingDrop()
  reducedMotion.removeEventListener('change', onMotionChange)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onScroll)
})
