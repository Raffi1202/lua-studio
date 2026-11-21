'use strict'
// Oberfläche «Funke live»: Bild der Funke zeigen, Maus und Tastatur an die Funke weitergeben.

const $ = (id) => document.getElementById(id)
const api = window.studio

// Fehler der Oberfläche mit Stack ins Fehlerprotokoll (Hilfe -> Fehlerprotokoll); zuerst, damit auch Startfehler drin sind
function protokollFehler(text, stack, wo) {
  try { api.protokoll('melden', { art: 'fehler', text: String(text), stack: String(stack || ''), wo }).catch(() => {}) } catch { /* egal */ }
}
window.addEventListener('error', (e) => protokollFehler(e.message, e.error && e.error.stack, `${(e.filename || '').split('/').pop()}:${e.lineno || ''}:${e.colno || ''}`))
window.addEventListener('unhandledrejection', (e) => { const r = e.reason; protokollFehler((r && r.message) || r, r && r.stack, 'unhandledrejection') })
const LOG_MAX = 2000
const LANG_MS = { taste: 600, tippen: 1000 }

let T = {}
let sprache = 'de'
let zustand = 'getrennt'
let statusWert = ''
let statusSchluessel = 'getrennt'
let info = null
let bildGroesse = null
let entwickler = false

// ---------- Sprache ----------
function speicherLesen(k) { try { return localStorage.getItem(k) } catch { return null } }
function speicherSchreiben(k, v) { try { localStorage.setItem(k, v) } catch { /* egal */ } }

async function spracheSetzen(neu) {
  sprache = neu === 'en' ? 'en' : 'de'
  T = await api.texte(sprache)
  document.documentElement.lang = sprache
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T[el.dataset.t] || el.dataset.t })
  document.querySelectorAll('[data-tp]').forEach((el) => { el.placeholder = T[el.dataset.tp] || '' })
  document.querySelectorAll('[data-sprache]').forEach((b) => b.classList.toggle('aktiv', b.dataset.sprache === sprache))
  const hilfe = $('hilfe'); hilfe.textContent = ''
  for (const z of T.hilfe || []) { const li = document.createElement('li'); li.textContent = z; hilfe.appendChild(li) }
  speicherSchreiben('sprache', sprache)
  api.protokoll('melden', { art: 'info', text: `Sprache der App ${sprache}` }).catch(() => {})
  zielListeFuellen(letzteAnschluesse)
  statusZeigen()
  window.dispatchEvent(new Event('spracheGewechselt'))
}

// ---------- Verbindung ----------
let letzteAnschluesse = []
async function anschluesseSuchen() {
  letzteAnschluesse = await api.anschluesse()
  zielListeFuellen(letzteAnschluesse)
}

function zielListeFuellen(liste) {
  const sel = $('ziel')
  const vorher = sel.value
  sel.textContent = ''
  const ethos = liste.filter((a) => a.ethos)
  if (!ethos.length) {
    const o = document.createElement('option'); o.value = ''; o.textContent = T.keineFunke || ''; o.disabled = true
    sel.appendChild(o)
  }
  for (const a of liste) {
    const o = document.createElement('option')
    o.value = 'seriell:' + a.pfad
    o.textContent = (a.ethos ? '● ' : '') + a.name + (a.name !== a.pfad ? ` (${a.pfad})` : '')
    sel.appendChild(o)
  }
  // Simulator nur für Entwickler (Programm aus dem Quelltext oder LUA_STUDIO_ENTWICKLER=1)
  if (entwickler) {
    const sim = document.createElement('option'); sim.value = 'simulator'; sim.textContent = T.simulatorTest || 'Simulator'
    sel.appendChild(sim)
  }
  const gemerkt = vorher || speicherLesen('ziel')
  if (gemerkt && [...sel.options].some((o) => o.value === gemerkt && !o.disabled)) sel.value = gemerkt
  else if (ethos.length) sel.value = 'seriell:' + ethos[0].pfad
  else sel.value = ''
  zielGeaendert()
}

function zielGeaendert() {
  $('simPort').hidden = $('ziel').value !== 'simulator'
  knoepfeSetzen()
}

function knoepfeSetzen() {
  const aktiv = zustand === 'verbunden' || zustand === 'verbinde' || zustand === 'freigabe'
  const b = $('verbinden')
  b.textContent = aktiv ? T.trennen : T.verbinden
  b.classList.toggle('haupt', !aktiv)
  b.disabled = !aktiv && !$('ziel').value
  $('ziel').disabled = aktiv
  $('simPort').disabled = aktiv
  $('foto').disabled = !bildGroesse
}

async function verbindenKnopf() {
  if (zustand === 'verbunden' || zustand === 'verbinde' || zustand === 'freigabe') { await api.trennen(); return }
  const wert = $('ziel').value
  if (!wert) return
  speicherSchreiben('ziel', wert)
  const ziel = wert === 'simulator'
    ? { art: 'simulator', port: Number($('simPort').value) || 8981 }
    : { art: 'seriell', pfad: wert.slice('seriell:'.length) }
  if (ziel.art === 'simulator') speicherSchreiben('simPort', String(ziel.port))
  // Sofort als «verbinde» zeigen, damit ein Doppelklick nicht zweimal verbindet
  zustand = 'verbinde'; statusSchluessel = 'verbinde'; statusWert = ''; statusZeigen()
  api.verbinden(ziel)
}

// Fehler kommen als «code|detail» (oder freier Text); bekannte Codes übersetzen
function fehlerText(wert) {
  if (/^s-?\d+$/.test(wert)) return T['s_' + wert.slice(1)] || wert
  const i = wert.indexOf('|')
  const code = i < 0 ? wert : wert.slice(0, i)
  const detail = i < 0 ? '' : wert.slice(i + 1)
  const text = T['f_' + code]
  if (!text) return wert
  return detail ? `${text} (${fehlerText(detail)})` : text
}

function statusZeigen() {
  $('punkt').className = 'punkt ' + zustand
  $('statusText').textContent = (T[statusSchluessel] || statusSchluessel) + (statusWert ? `: ${fehlerText(statusWert)}` : '')
  $('info').textContent = info && zustand === 'verbunden' ? `${info.board} · Ethos ${info.firmware} · ${info.art === 'simulator' ? 'Simulator' : 'Serial'}` : ''
  if (zustand !== 'verbunden') $('takt').textContent = ''
  knoepfeSetzen()
}

api.beiStatus((s) => {
  zustand = s.zustand
  statusSchluessel = s.text
  statusWert = s.wert || ''
  if (s.info) info = s.info
  statusZeigen()
})
api.beiTakt((t) => { if (zustand === 'verbunden') $('takt').textContent = `${t.bilderProSekunde} ${T.bilderProSekunde}` })

// ---------- Bild ----------
const leinwand = $('bild')
const ctx = leinwand.getContext('2d')

api.beiBild(({ breite, hoehe, rgba }) => {
  if (leinwand.width !== breite || leinwand.height !== hoehe) { leinwand.width = breite; leinwand.height = hoehe }
  const daten = new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), breite, hoehe)
  ctx.putImageData(daten, 0, 0)
  if (!bildGroesse) { leinwand.hidden = false; $('leer').hidden = true }
  bildGroesse = { breite, hoehe }
  groesseAnpassen()
  knoepfeSetzen()
})

function groesseAnpassen() {
  if (!bildGroesse) return
  const z = $('zoom').value
  let f
  if (z === 'fit') {
    const b = $('buehne')
    f = Math.min((b.clientWidth - 32) / bildGroesse.breite, (b.clientHeight - 24) / bildGroesse.hoehe)
    f = Math.max(0.25, Math.min(f, 3))
  } else f = Number(z)
  leinwand.style.width = Math.round(bildGroesse.breite * f) + 'px'
  leinwand.style.height = Math.round(bildGroesse.hoehe * f) + 'px'
}
window.addEventListener('resize', groesseAnpassen)

// ---------- Eingaben ----------
async function senden(e) {
  if (zustand !== 'verbunden') return
  const r = await api.eingabe(e)
  $('eingabeMeldung').textContent = r.status ? `${T.eingabeAbgelehnt}: ${fehlerText('s' + r.status)}` : ''
}

function punktAufFunke(ev) {
  const r = leinwand.getBoundingClientRect()
  const x = Math.floor(((ev.clientX - r.left) / r.width) * leinwand.width)
  const y = Math.floor(((ev.clientY - r.top) / r.height) * leinwand.height)
  return { x: Math.max(0, Math.min(leinwand.width - 1, x)), y: Math.max(0, Math.min(leinwand.height - 1, y)) }
}

let druck = null
leinwand.addEventListener('contextmenu', (ev) => ev.preventDefault())
leinwand.addEventListener('pointerdown', (ev) => {
  leinwand.focus()
  leinwand.setPointerCapture(ev.pointerId)
  druck = { start: punktAufFunke(ev), zeit: performance.now(), rechts: ev.button === 2 }
})
leinwand.addEventListener('pointerup', (ev) => {
  if (!druck) return
  const ende = punktAufFunke(ev)
  const d = druck; druck = null
  const weg = Math.hypot(ende.x - d.start.x, ende.y - d.start.y)
  if (weg > 8 && !d.rechts) {
    senden({ art: 'wischen', x1: d.start.x, y1: d.start.y, x2: ende.x, y2: ende.y })
  } else {
    const dauer = Math.round(performance.now() - d.zeit)
    const ms = d.rechts ? LANG_MS.tippen : Math.max(20, Math.min(dauer, 3000))
    senden({ art: 'tippen', x: d.start.x, y: d.start.y, ms })
  }
})
leinwand.addEventListener('pointercancel', () => { druck = null })

// Mausrad = Drehrad. Mausrad (Zeilen-Modus oder grobe Rasten ab 50): eine Raste = ein Schritt.
// Trackpad (feine Werte): sammeln, damit nicht hunderte Schritte entstehen.
let radRest = 0
leinwand.addEventListener('wheel', (ev) => {
  ev.preventDefault()
  if (ev.deltaMode === 1 || (Number.isInteger(ev.deltaY) && Math.abs(ev.deltaY) >= 50)) {
    radRest = 0
    senden({ art: 'drehen', schritte: Math.sign(ev.deltaY) })
    return
  }
  radRest += ev.deltaY
  const schritte = Math.trunc(radRest / 60)
  if (schritte) { radRest -= schritte * 60; senden({ art: 'drehen', schritte }) }
}, { passive: false })

const TASTENKUERZEL = { Enter: 'ENTER', Escape: 'RTN', Backspace: 'RTN', Tab: 'PAGE', F1: 'SYS', F2: 'MDL', F3: 'DISP' }
document.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT')) return
  if (zustand !== 'verbunden' || $('bereichLive').hidden) return
  if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { ev.preventDefault(); senden({ art: 'drehen', schritte: -1 }); return }
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { ev.preventDefault(); senden({ art: 'drehen', schritte: 1 }); return }
  const taste = TASTENKUERZEL[ev.key]
  if (taste && !ev.repeat) {
    ev.preventDefault()
    senden({ art: 'taste', name: taste, ms: ev.shiftKey ? LANG_MS.taste : 20 })
  }
})

document.querySelectorAll('[data-taste]').forEach((b) => b.addEventListener('click', () => {
  const lang = $('lang').checked
  senden({ art: 'taste', name: b.dataset.taste, ms: lang ? LANG_MS.taste : 20 })
  if (lang) $('lang').checked = false
}))
document.querySelectorAll('[data-drehen]').forEach((b) => b.addEventListener('click', () => senden({ art: 'drehen', schritte: Number(b.dataset.drehen) })))
$('textForm').addEventListener('submit', (ev) => {
  ev.preventDefault()
  const t = $('textFeld').value
  if (t) { senden({ art: 'text', text: t }); $('textFeld').value = '' }
})

// ---------- Foto ----------
$('foto').addEventListener('click', async () => {
  const png = leinwand.toDataURL('image/png').split(',')[1]
  const jetzt = new Date()
  const zwei = (n) => String(n).padStart(2, '0')
  const stempel = `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())} ${zwei(jetzt.getHours())}${zwei(jetzt.getMinutes())}${zwei(jetzt.getSeconds())}`
  const name = `${(info && info.board) || 'Funke'} - Bildschirm ${stempel}.png`
  const r = await api.fotoSpeichern({ pngBase64: png, vorschlag: name })
  $('fotoMeldung').textContent = r.ok ? `${T.fotoGespeichert}: ${r.pfad}` : ''
})

// ---------- Log ----------
const logEl = $('log')
api.beiLog((zeile) => {
  const unten = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 4
  const s = document.createElement('div')
  s.textContent = zeile
  if (/error|attempt to|fehler/i.test(zeile)) s.className = 'fehlerzeile'
  logEl.appendChild(s)
  while (logEl.childElementCount > LOG_MAX) logEl.firstChild.remove()
  if (unten) logEl.scrollTop = logEl.scrollHeight
})
$('logLeeren').addEventListener('click', () => { logEl.textContent = '' })

// ---------- Start ----------
$('verbinden').addEventListener('click', verbindenKnopf)
$('suchen').addEventListener('click', anschluesseSuchen)
$('ziel').addEventListener('change', zielGeaendert)
$('zoom').addEventListener('change', () => { speicherSchreiben('zoom', $('zoom').value); groesseAnpassen() })
document.querySelectorAll('[data-sprache]').forEach((b) => b.addEventListener('click', () => spracheSetzen(b.dataset.sprache)))

;(async () => {
  const gemerkterPort = speicherLesen('simPort'); if (gemerkterPort) $('simPort').value = gemerkterPort
  const z = speicherLesen('zoom'); if (z) $('zoom').value = z
  entwickler = await api.entwickler()
  await spracheSetzen(speicherLesen('sprache') || await api.systemSprache())
  await anschluesseSuchen()
})()
