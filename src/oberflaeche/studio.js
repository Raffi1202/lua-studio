'use strict'
// Oberfläche «Modelle» (Etappe B): Modelle der Funke, Kästchen anordnen, Grenzwerte und Einstellungen, Übertragen.
// Nutzt T, sprache, $ und api aus app.js.

const DARSTELLUNGEN = ['zahl', 'ring', 'balken_w', 'balken_s', 'kurve', 'status']
const MINDEST = { zahl: [90, 50], ring: [110, 110], balken_w: [140, 40], balken_s: [50, 110], kurve: [180, 90], status: [120, 40] }
const RASTER = 4
const ABSTAND = 5      // Standardabstand zwischen Kästchen (wie die eingebauten Belegungen)
const FANG = 8         // Einrasten, wenn näher als so viele Pixel
const MAX_PLAETZE = 16
const SVG = 'http://www.w3.org/2000/svg'

const st = { luas: {}, quellen: [], modelle: [], m: null, projekt: null, ansicht: 0, gewaehlt: -1, gewaehltDeko: -1, funkeDatei: null,
  symbole: null, gruppen: {}, vorbereitete: [], presets: [] }
const PX = [24, 32, 48, 64]
const MAX_DEKO = 24

// ---------- Hilfen ----------
function t(k) { return T[k] || k }
function el(tag, attr = {}, kinder = []) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attr)) {
    if (k === 'text') e.textContent = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v)
  }
  for (const c of [].concat(kinder)) if (c) e.appendChild(c)
  return e
}
function name(n) { return n && typeof n === 'object' ? (n[sprache] || n.de || n.en || '') : (n || '') }
function rgbHex(f, ersatz) { if (!Array.isArray(f)) return ersatz; return '#' + f.map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('') }
function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) }
function bytes(s) { return new TextEncoder().encode(s).length }
function hex4(n) { return Number(n).toString(16).toUpperCase().padStart(4, '0') }
let speicherUhr = null, pruefUhr = null

// ---------- Format 2: Symbole (Lua-Studio-Format 2.md, Abschnitte 2–5) ----------
function displayBreite(b) { return b >= 784 ? 800 : b >= 630 ? 640 : 480 }
function kante(px, B) { return Math.round(px * B / 800) }
// Stufe für den Platzkopf (wie symbole.js kopfPx): grösste Kante ≤ Titelhöhe, sonst die kleinste
function kopfPx(th, B) { let px = 12; for (const s of [12, 16, 24, 32, 48, 64]) if (kante(s, B) <= th) px = s; return px }
// Schalter «Alle Symbole aus» (ab 0.10.6, je Modell): projekt.symboleAus
function symboleAn() { return !(st.projekt && st.projekt.symboleAus) }
// Fenstergrössen, in denen das Lua auf der Funke zuletzt lief (Info-Datei «fenster»)
// Info-Datei «fenster» nur mit gültigen Einträgen (eine kaputte Info darf das Öffnen nicht abbrechen)
function fensterListe(info) { const f = info && info.fenster; return Array.isArray(f) ? f.filter((x) => x && Number.isInteger(x.breite) && Number.isInteger(x.hoehe)) : [] }
function aufFunke(a) { if (!st.m || st.m.vorbereitet) return false; return fensterListe(st.m.info).some((x) => x.breite === a.breite && x.hoehe === a.hoehe) }
// Ansicht vorwählen, in der das Lua auf der Funke zuletzt lief, sonst die erste
function ansichtVorwaehlen() { const i = st.projekt.ansichten.findIndex((a) => aufFunke(a)); st.ansicht = i >= 0 ? i : 0 }
function kann2() { const f = st.m && st.m.info && st.m.info.formate; return Array.isArray(f) && f.includes(2) }
function katalog(n) { return ((st.symbole && st.symbole.katalog) || []).find((k) => k.name === n) }
// Kennung wie Format v1 §2.1 (byteweise)
function kennungAus(n) {
  let k = ''
  for (const b of new TextEncoder().encode(String(n || ''))) { const c = String.fromCharCode(b); k += /[A-Za-z0-9]/.test(c) ? c : '_' }
  return k.slice(0, 32) || 'modell'
}
function gruppeVon(fenster) {
  for (const [k, g] of Object.entries(st.gruppen)) if ((Array.isArray(fenster) ? fenster : []).filter((x) => x).some((f) => g.fenster.some((x) => x.breite === f.breite && x.hoehe === f.hoehe))) return k
  return null
}
// Symbol als <svg> in der Vorschau (Farbe über currentColor)
function svgSymbol(n, x, y, k, farbe) {
  const q = st.symbole && st.symbole.svg[n]
  if (!q) return null
  const e = document.importNode(new DOMParser().parseFromString(q, 'image/svg+xml').documentElement, true)
  e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', k); e.setAttribute('height', k)
  e.setAttribute('color', farbe); e.style.color = farbe
  return e
}
// Maske für die Funke: SVG schwarz auf weiss in Kante × Kante rechnen, Grauwerte als base64 (schwarz = deckend)
const maskenCache = new Map()
async function symbolGrau(n, k) {
  const schluessel = `${n}_${k}`
  if (maskenCache.has(schluessel)) return maskenCache.get(schluessel)
  const q = st.symbole.svg[n].replace(/currentColor/g, '#000').replace('<svg ', `<svg width="${k}" height="${k}" `)
  const bild = new Image()
  bild.src = 'data:image/svg+xml;base64,' + btoa(q)
  await bild.decode()
  const c = document.createElement('canvas'); c.width = k; c.height = k
  const g = c.getContext('2d')
  g.fillStyle = '#fff'; g.fillRect(0, 0, k, k); g.drawImage(bild, 0, 0, k, k)
  const d = g.getImageData(0, 0, k, k).data
  let roh = ''
  for (let i = 0; i < k * k; i++) roh += String.fromCharCode(Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]))
  const b64 = btoa(roh)
  maskenCache.set(schluessel, b64)
  return b64
}

// Sichtbare Namen der Luas (Umbenennung 21.11.2026); unbekannte zeigen ihren Schlüssel
const LUA_NAME = { electric: 'Electric', glider: 'Glider', heli: 'Heli', helirf: 'Heli', gas_ecu: 'Gas Engine ECU', gas_carb: 'Gas Engine Carb', jet: 'Jet' }
function luaName(k) { return LUA_NAME[k] || k }
// Eigenschaften-Felder: feste Kennung aus dem Textschlüssel der Beschriftung (unabhängig von der Sprache), für Bedienhilfen
// und Automatisierung: id «eig-<schlüssel>», name gleich, aria-label = Beschriftung
function feldKennung(beschriftung, eingabe) {
  if (!eingabe || !eingabe.setAttribute) return
  const k = Object.keys(T).find((x) => T[x] === beschriftung) || String(beschriftung).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (!eingabe.id) eingabe.id = `eig-${k}`
  if (!eingabe.getAttribute('name')) eingabe.setAttribute('name', `eig-${k}`)
  eingabe.setAttribute('aria-label', beschriftung)
}
// Mindestgrösse einer Darstellung bei 800 px Breite, auch für Darstellungen des Luas («darstellungenExtra»)
// Darstellungen des Luas, die das Lua auf der Funke kennt (Version aus der Info-Datei; vorbereitete Modelle: Version der Beschreibung)
function extraErlaubt() {
  const b = beschreibung() || {}
  const vorb = !!(st.m && st.m.info && st.m.info.vorbereitet)
  const v = st.m && st.m.info && !vorb ? st.m.info.luaVersion : null
  if (!b.darstellungenExtra) return []
  if (!vorb && !v) return []
  const ab = ({ gas_ecu: '1.11.0', gas_carb: '0.11.0' })[b.lua] || b.luaVersion   // wie EXTRA_AB in src/studio/studio.js
  if (v && ab) {
    const x = String(v).split('.').map(Number), y = String(ab).split('.').map(Number)
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) { if ((x[i] || 0) < (y[i] || 0)) return []; break }
  }
  return Object.keys(b.darstellungenExtra).filter((d) => !d.startsWith('_'))
}
function mindestVon(d) {
  if (MINDEST[d]) return MINDEST[d]
  const x = ((beschreibung() || {}).darstellungenExtra || {})[d]
  return x && x.min ? [x.min.b, x.min.h] : MINDEST.zahl
}
function darstellungName(d) {
  const x = ((beschreibung() || {}).darstellungenExtra || {})[d]
  return x ? name(x.name) : t('d_' + d)
}
// «Vorbereitet L» ist der interne Ablagename vorbereiteter Modelle; angezeigt wird er übersetzt mit dem Namen der Displaygruppe
function funkeAnzeige(f) {
  const m = /^Vorbereitet ([LMS])$/.exec(String(f || ''))
  return m ? `${t('vorbereitetKurz')} · ${(st.gruppen[m[1]] || {}).name || m[1]}` : (f || '')
}
// Einheiten aus den Beschreibungen sind deutsch; in der englischen Oberfläche wie das Lua auf Englisch
const EINHEIT_EN = { 'U/min': 'rpm' }
function einheitAnzeige(e) { return sprache === 'en' && EINHEIT_EN[e] ? EINHEIT_EN[e] : e }
function beschreibung() { return st.m ? st.luas[st.m.lua] : null }
function ansichtAktuell() { return st.projekt ? st.projekt.ansichten[st.ansicht] : null }

// Werte, die ein Kästchen zeigen kann: Lua-Werte, eigene Sensoren (aus der Info-Datei), Kanäle
function werteListe() {
  const b = beschreibung()
  const liste = []
  for (const w of (b && b.werte) || []) liste.push({ k: `lua:${w.s}`, text: name(w.name), def: w })
  const sensoren = (st.m && st.m.info && st.m.info.sensoren) || []
  const zahl = {}
  for (const s of sensoren) { const k = `${s.appId}:${s.sub}`; zahl[k] = (zahl[k] || 0) + 1 }
  for (const s of sensoren) {
    const doppelt = zahl[`${s.appId}:${s.sub}`] > 1
    const k = `sensor:${hex4(s.appId)}:${s.sub}${doppelt ? ':' + s.phys : ''}`
    liste.push({ k, text: `${s.name} (${hex4(s.appId)}${doppelt ? ', ID ' + s.phys : ''})`, sensor: s })
  }
  for (let n = 1; n <= 16; n++) liste.push({ k: `kanal:${n}`, text: `${t('kanal')} ${n}` })
  return liste
}
function wertInfo(k) { return werteListe().find((w) => w.k === k) }
function erlaubteDarstellungen(k) {
  const w = wertInfo(k)
  // Darstellungen des Luas nur, wenn das Lua auf der Funke sie kennt
  if (w && w.def && Array.isArray(w.def.darstellungen)) { const ex = extraErlaubt(); return w.def.darstellungen.filter((d) => DARSTELLUNGEN.includes(d) || ex.includes(d)) }
  return DARSTELLUNGEN.filter((d) => d !== 'status')
}

// ---------- Speichern und Prüfen ----------
function geaendert() {
  clearTimeout(speicherUhr)
  speicherUhr = setTimeout(() => api.studio('speichern', { funkeName: funkeName(), lua: st.m.lua, kennung: st.m.kennung, projekt: st.projekt }), 400)
  clearTimeout(pruefUhr)
  pruefUhr = setTimeout(pruefen, 250)
}
function funkeName() { return (st.m && st.m.info && st.m.info.funke) || 'ohne Funke' }
function meta() {
  const i = (st.m && st.m.info) || {}
  const immerAlarm = (beschreibung().werte || []).filter((w) => w && w.immerAlarm).map((w) => `lua:${w.s}`)
  const extra = extraErlaubt()
  const werk = Object.fromEntries((beschreibung().einstellungen || []).filter((e) => e && e.s).map((e) => [e.s, e.werk]))
  return { funke: i.funke, modell: i.modell, luaVersion: i.luaVersion, modellPfad: i.modellPfad, formate: i.formate, immerAlarm, extra, werk }
}
async function pruefen() {
  if (!st.projekt) return
  const r = await api.studio('pruefen', { projekt: st.projekt, meta: meta() })
  const z = $('zaehlung')
  if (!r.ok) { z.textContent = r.fehler; return }
  z.textContent = `${t('angaben')}: ${r.zaehlung.elemente} / ${r.grenze.elemente} · ${Math.round(r.zaehlung.byte / 102.4) / 10} KB · Format ${r.format}`
  z.style.color = r.fehler.length ? 'var(--fehler)' : ''
  z.title = r.fehler.join('\n')
  st.letztePruefung = r
  waechterZeigen(r)
  return r
}

// Grössenwächter: Ampel je Zeile, Rot sperrt das Übertragen
function waechterZeigen(r) {
  const w = $('waechter')
  w.textContent = ''
  w.appendChild(el('strong', { text: t('waechter') }))
  for (const z of r.waechter.zeilen) w.appendChild(el('span', { class: 'w' }, [el('span', { class: 'ampel ' + z.ampel }), el('span', { text: `${t('w_' + z.k)} ${z.anzeige}` })]))
  for (const x of r.wegfall) w.appendChild(el('span', { class: 'hinweis', text: t('wegfall_' + x) }))
  if (r.verworfen.length) w.appendChild(el('span', { class: 'hinweis', text: `${t('verworfen')}: ${[...new Set(r.verworfen)].join(', ')}` }))
  if (r.fehler.length) w.appendChild(el('span', { class: 'hinweis rot', text: `${t('gesperrt')}: ${r.fehler.join(' · ')}` }))
}

// ---------- Quellen und Modelle ----------
async function quellenSuchen() {
  const z = await api.studio('ziele')
  const sel = $('quelle')
  sel.textContent = ''
  st.quellen = []
  if (z.funke) st.quellen.push({ art: 'funke', text: `${t('quelleFunke')} (${z.funkeName || ''})` })
  for (const w of z.laufwerke) st.quellen.push({ art: 'laufwerk', wurzel: w, text: `${t('quelleLaufwerk')} ${w}` })
  st.quellen.push({ art: 'ordner', text: t('quelleOrdner') })
  st.quellen.push({ art: 'vorbereitet', text: t('quelleVorbereitet') })
  st.quellen.forEach((q, i) => sel.appendChild(el('option', { value: i, text: q.text })))
  $('quelleMeldung').textContent = z.funke ? '' : t('quelleHinweis')
  st.vorbereitete = await api.studio('vorbereitete')
  startSeiteZeigen()
}

async function modelleLaden() {
  const q = st.quellen[Number($('quelle').value)]
  if (!q) return
  if (q.art === 'ordner' && !q.pfad) {
    const p = await api.studio('ordnerWaehlen')
    if (!p) return
    q.pfad = p
    q.text = `${t('quelleOrdner')}: ${p}`
    $('quelle').options[$('quelle').selectedIndex].textContent = q.text
  }
  st.quelle = q
  st.vorbereitete = await api.studio('vorbereitete')
  startSeiteZeigen()
  $('vorbereitenBlock').hidden = q.art !== 'vorbereitet'
  if (q.art === 'vorbereitet') { $('quelleMeldung').textContent = ''; st.modelle = st.vorbereitete; modellListeZeigen(); return }
  $('quelleMeldung').textContent = t('lade')
  const r = await api.studio('modelle', q)
  if (!r.ok) { $('quelleMeldung').textContent = `${t('fehler')}: ${fehlerText(r.fehler)}`; return }
  // Keine Info-Datei gefunden: klar sagen, was zu tun ist (Befund 0.8.1, X20 Pro)
  $('quelleMeldung').textContent = r.modelle.length || q.art !== 'funke' ? '' : t('keineInfoDateien')
  st.modelle = r.modelle
  modellListeZeigen()
}

function modellListeZeigen() {
  const ul = $('modellListe')
  ul.textContent = ''
  $('keineModelle').hidden = st.modelle.length > 0
  for (const m of st.modelle) {
    const titel = (m.info && m.info.modell) || m.kennung
    const vb = !m.vorbereitet && passendeVorbereitete(m).some((v) => v.kennung.toLowerCase() === m.kennung.toLowerCase())
    const li = el('li', { onclick: () => modellOeffnen(m) }, [
      m.vorbereitet ? el('span', { class: 'weg', text: '×', title: t('vorbereitetLoeschen'), onclick: (ev) => { ev.stopPropagation(); vorbereitetLoeschen(m) } }) : null,
      el('span', { text: titel }),
      el('span', { class: 'marke-klein', text: ` · ${luaName(m.lua)}${m.vorbereitet ? ' · ' + (st.gruppen[gruppeVon(m.info.fenster)] || {}).name : ''}${m.studioDatei || m.alteStudioDatei ? ' · ' + t('mitStudio') : ''}${m.funkeDatei ? ' · ' + t('mitFunkeAenderung') : ''}${m.bekannt ? '' : ' · ' + t('luaUnbekannt')}${m.altLua ? ' · ⚠ ' + t('altesLua').replace('{alt}', m.altLua) : ''}${m.doppelt ? ' · ⚠ ' + t('doppelt') : ''}${vb ? ' · ' + t('vorbereitungDa') : ''}` }),
    ])
    if (st.m && st.m.kennung === m.kennung && st.m.lua === m.lua) li.classList.add('aktiv')
    ul.appendChild(li)
  }
}

// Vorbereitete Modelle desselben Luas und derselben Displaygruppe (Konzept Abschnitt 5: Zuordnen)
function passendeVorbereitete(m) {
  const g = gruppeVon(m.info && m.info.fenster)
  return st.vorbereitete.filter((v) => v.lua === m.lua && g && gruppeVon(v.info.fenster) === g)
}
async function vorbereitetLoeschen(m) {
  if (!confirm(t('vorbereitetLoeschenFrage'))) return
  await api.studio('vorbereitetLoeschen', { gruppe: gruppeVon(m.info.fenster), lua: m.lua, kennung: m.kennung })
  if (st.m === m) { st.m = null; st.projekt = null; $('editor').hidden = true }
  modelleLaden()
}

async function modellOeffnen(m) {
  if (!m.bekannt) { $('quelleMeldung').textContent = t('luaUnbekanntLang'); return }
  st.m = m
  const r = await api.studio('projekt', { funkeName: funkeName(), lua: m.lua, kennung: m.kennung, info: m.info })
  if (!r.ok) { $('quelleMeldung').textContent = fehlerText(r.fehler); return }
  st.projekt = r.projekt
  // Ansicht vorwählen, die das Lua auf der Funke zeigt (M6, 21.11.: der User gestaltete die kompakte, die Funke zeigte Vollbild)
  st.projekt = r.projekt
  ansichtVorwaehlen()
  st.gewaehlt = -1
  st.gewaehltDeko = -1
  st.ansichtenStand = JSON.stringify(r.projekt.ansichten)
  st.presets = await api.studio('presets', m.lua)
  $('editor').hidden = false
  $('modellName').textContent = (m.info && m.info.modell) || m.kennung
  $('modellUnter').textContent = `${luaName(m.lua)} ${(m.info && m.info.luaVersion) || ''} · ${funkeAnzeige(m.info && m.info.funke)}`
  const b = beschreibung()
  $('luaHinweis').textContent = b && b.hinweis ? name(b.hinweis) : ''
  modellListeZeigen()
  allesZeigen()
  pruefen()
  if (r.neu) geaendert()
  // Konzept Abschnitt 5: Modell der Funke ohne eigene Gestaltung, Vorbereitung mit derselben Kennung vorhanden -> gleich anbieten
  if (r.neu && !m.vorbereitet) {
    const v = passendeVorbereitete(m).find((x) => x.kennung.toLowerCase() === m.kennung.toLowerCase())
    if (v && confirm(`${t('vorbereitetAngebot')}\n${v.info.modell} (${v.kennung})`)) await vonVorbereitetKopieren(true, v.kennung)
  }
}

function allesZeigen() {
  if ($('symboleAus')) $('symboleAus').checked = !!(st.projekt && st.projekt.symboleAus)
  vergessen()
  abstandAnzeigen()
  presetsZeigen()
  ansichtenZeigen()
  flaecheZeigen()
  eigenschaftenZeigen()
  grenzenZeigen()
  uebertragenZeigen()
}

// ---------- Anordnung ----------
function ansichtenZeigen() {
  const sel = $('ansicht')
  sel.textContent = ''
  st.projekt.ansichten.forEach((a, i) => sel.appendChild(el('option', { value: i, text: `${aufFunke(a) ? '● ' : ''}${a.breite} × ${a.hoehe}${a.breite === 784 && a.hoehe === 316 ? ' (' + t('kompakt') + ')' : a.hoehe >= 450 ? ' (' + t('vollbild') + ')' : ''}${aufFunke(a) ? ' – ' + t('aufFunke') : ''}` })))
  sel.value = String(st.ansicht)
}

function massstab() {
  const a = ansichtAktuell()
  const breite = $('flaecheRahmen').clientWidth || 800
  return Math.min(1.25, breite / a.breite)
}

function flaecheZeigen() {
  const a = ansichtAktuell()
  const f = $('flaeche')
  f.textContent = ''
  if (!a) return
  const s = massstab()
  f.style.width = a.breite * s + 'px'
  f.style.height = a.hoehe * s + 'px'
  const probleme = anordnungPruefen(a)
  // Vorschau wie im Lua: Hintergrund, Kopfzeile und feste Felder echt gezeichnet (statt schraffiert)
  const stil = st.m && window.LUA_VORSCHAU && LUA_VORSCHAU.stil(st.m.lua)
  f.style.background = stil ? stil.hintergrund : ''
  if (stil) {
    const g = document.createElementNS(SVG, 'svg')
    g.setAttribute('viewBox', `0 0 ${a.breite} ${a.hoehe}`)
    g.setAttribute('class', 'lua-grund')
    stil.flaeche(g, a, luaKontext(stil, a))
    f.appendChild(g)
  }
  for (const r of reserviert(a)) {
    const z = el('div', { class: 'reserviert' + (stil ? ' lua' : ''), text: name(r.name), title: name(r.was || r.name) || undefined })
    z.style.left = r.x * s + 'px'; z.style.top = r.y * s + 'px'; z.style.width = r.b * s + 'px'; z.style.height = r.h * s + 'px'
    f.appendChild(z)
  }
  if (kann2()) (a.deko || []).forEach((d, i) => f.appendChild(dekoElement(d, i, a, s)))
  a.plaetze.forEach((p, i) => {
    const k = el('div', { class: 'kasten' + (i === st.gewaehlt ? ' gewaehlt' : '') + (probleme.has(i) ? ' fehler' : ''), title: probleme.get(i) || '' })
    k.style.left = p.x * s + 'px'; k.style.top = p.y * s + 'px'; k.style.width = p.b * s + 'px'; k.style.height = p.h * s + 'px'
    if (stil) { k.classList.add('lua'); k.appendChild(luaPlatz(stil, p, a)) } else {
      k.style.background = rgbHex(p.hintergrund, '#1d2026')
      k.appendChild(vorschau(p))
    }
    const griff = el('div', { class: 'griff' })
    k.appendChild(griff)
    k.addEventListener('pointerdown', (ev) => ziehenStart(ev, i, ev.target === griff))
    f.appendChild(k)
  })
  $('platzWeg').disabled = st.gewaehlt < 0 && st.gewaehltDeko < 0
  $('dekoWerkzeuge').hidden = !kann2()
  for (const id of ['dekoSymbol', 'dekoText', 'dekoLinie', 'dekoRahmen']) $(id).disabled = (a.deko || []).length >= MAX_DEKO
  $('format2Hinweis').textContent = kann2() ? `${(a.deko || []).length} / ${MAX_DEKO} ${t('schmuckElemente')}` : t('symboleNurFormat2')
  $('zentrieren').disabled = st.gewaehlt < 0
  $('platzNeu').disabled = a.plaetze.length >= MAX_PLAETZE
  const fehler = [...new Set(probleme.values())]
  $('anordnungMeldung').textContent = `${a.plaetze.length} / ${MAX_PLAETZE} ${t('plaetze')}` + (fehler.length ? ` · ${fehler.join(' · ')}` : '')
  $('anordnungMeldung').style.color = fehler.length ? 'var(--fehler)' : ''
}

// Prüfungen des Studios (Format v1, 6.3 und 7): Rand, Mindestgrösse, Überlappung, Kurven
function reserviert(a) {
  const b = beschreibung()
  return ((b && b.reserviert) || []).filter((r) => r.breite === a.breite && r.hoehe === a.hoehe)
}
function ueberlappt(p, q) { return p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h }

function anordnungPruefen(a) {
  const m = new Map()
  const res = reserviert(a)
  const f = a.breite / 800
  let kurven = 0
  a.plaetze.forEach((p, i) => {
    const d = p.darstellung || 'zahl'
    const [mb, mh] = mindestVon(d)
    if (p.x < 0 || p.y < 0 || p.x + p.b > a.breite || p.y + p.h > a.hoehe) m.set(i, t('pRand'))
    else if (p.b < Math.round(mb * f) || p.h < Math.round(mh * f)) m.set(i, `${t('pKlein')} (${Math.round(mb * f)} × ${Math.round(mh * f)})`)
    if (d === 'kurve' && ++kurven > 2) m.set(i, t('pKurven'))
    // Darstellungen des Luas (zylinder, tank) höchstens einmal je Ansicht
    if (!MINDEST[d] && a.plaetze.filter((q) => q.darstellung === d).length > 1) m.set(i, `${darstellungName(d)}: ${t('pEinmal')}`)
    if (res.some((r) => ueberlappt(p, r))) m.set(i, t('pReserviert'))
    a.plaetze.forEach((q, j) => {
      if (j <= i) return
      if (p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h) { m.set(i, t('pUeberlappung')); m.set(j, t('pUeberlappung')) }
    })
  })
  return m
}

// ---------- Vorschau wie im Lua (lua-vorschau.js) ----------
function luaKontext(stil, a) {
  const T = (stil.texte && (stil.texte[sprache] || stil.texte.en)) || {}
  return { ansicht: a, T, regeln: stil.regeln, reserviert: reserviert(a), modell: String((st.m && st.m.info && st.m.info.modell) || 'DEMO').toUpperCase(),
    symbol: (svg, q, farbe, th, pad) => symbolUndEinheit(svg, q.p, farbe, q.einheit, q.zeit || q.darstellung === 'status', q.titel, th, pad) }
}
// Einheit doppelt? Steht sie schon als eigenes Wort im Titel (z. B. «Akku %», «Strom (A)»), dann nicht am Wert.
// Gleiche Regel wie Electric 0.7.4 (imTitel) und Heli 1.14.3 (einheitImTitel): davor Anfang, Leerzeichen, «(» oder «[»,
// danach Ende, Leerzeichen, «)», «]» oder «%». «A» in «Akku» zählt also nicht.
function einheitImTitel(einheit, titel) {
  if (!einheit || typeof titel !== 'string') return false
  for (let i = titel.indexOf(einheit); i >= 0; i = titel.indexOf(einheit, i + 1)) {
    const v = titel[i - 1], n = titel[i + einheit.length]
    if ((v === undefined || /[\s([]/.test(v)) && (n === undefined || /[\s)\]%]/.test(n))) return true
  }
  return false
}
// Symbol oben links (Format 2 §5, wie ansicht.lua ab Electric 0.7.3); Rückgabe Einzug des Titels und ob die Einheit am Wert steht.
// «fett» (grosse Einheit im Kopf) gibt es ab 0.10.4 nicht mehr: gilt wie «am Wert».
// Ab 0.10.6 («Symbole gleich gross wie der Text»): mit th (Titelhöhe) und pad das Symbol in der grössten Stufe ≤ th
// (sonst 12), auf der Titelzeile zentriert; der Titel behält seine normale Grösse.
function symbolUndEinheit(svg, p, farbe, einheit, zeitOderStatus, titel, th, pad) {
  if (!kann2()) return { ein: 0, amWert: true }
  const B = displayBreite(ansichtAktuell().breite)
  const r = Math.round(4 * B / 800)
  let x = r, da = false
  if (p.symbol && katalog(p.symbol) && symboleAn()) {
    const kopf = th !== undefined
    const k = kante(kopf ? kopfPx(th, B) : (p.symbolPx || 24), B)
    const x0 = kopf ? pad : r, y0 = kopf ? Math.round(pad + th / 2 - k / 2) : r
    const e = svgSymbol(p.symbol, x0, y0, k, farbe)
    if (e) { svg.appendChild(e); x = x0 + k + r; da = true }
  }
  return { ein: da ? x : 0, amWert: !(p.einheitZeigen === false || zeitOderStatus || einheitImTitel(einheit, titel)) }
}
// Angaben eines Platzes für die Vorschau (Beispielwert 62 % des Bereichs)
function platzInfo(p, stil) {
  const w = wertInfo(p.w)
  const def = (w && w.def) || {}
  const lo = p.min !== undefined ? p.min : (def.min !== undefined ? def.min : 0)
  let hi = p.max !== undefined ? p.max : (def.max !== undefined ? def.max : 100)
  if (hi <= lo) hi = lo + 1
  const wert = lo + (hi - lo) * 0.62
  const einheit = (st.projekt.werte[p.w] && st.projekt.werte[p.w].einheit) || einheitAnzeige(def.einheit) || (w && w.sensor && w.sensor.einheit) || (p.w && p.w.startsWith('kanal') ? '%' : '')
  const stellen = (st.projekt.werte[p.w] && st.projekt.werte[p.w].stellen) ?? def.stellen ?? 0
  let zahlText = wert.toFixed(stellen)
  if (stil && stil.zahlKomma && sprache === 'de' && stellen > 0) zahlText = zahlText.replace('.', ',')
  const mmss = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}` }
  let farbeWert = p.farbe ? rgbHex(p.farbe) : null
  for (const z of p.stufen || []) if (wert >= z.ab) farbeWert = rgbHex(z.farbe)
  const T = (stil && stil.texte && (stil.texte[sprache] || stil.texte.en)) || {}
  let statusText = def.zustaende && def.zustaende[1] ? name({ de: def.zustaende[1].de, en: def.zustaende[1].en }) : t('status')
  let statusFarbe = def.zustaende && def.zustaende[1] && def.zustaende[1].farbe ? rgbHex(def.zustaende[1].farbe) : null
  if ((p.w === 'lua:motor' || p.w === 'lua:scharf') && T.scharf) { statusText = T.scharf; statusFarbe = null }
  return { p, w: p.w, leer: !p.w || p.w === 'leer', darstellung: p.darstellung || 'zahl', titel: p.titel || (def.titelLaufend ? name(def.titelLaufend) : (w ? w.text : '—')),
    einheit, zeit: !!def.zeit, zahlText, zeitText: mmss(wert), anteil: Math.max(0, Math.min(1, (wert - lo) / (hi - lo))),
    farbeWert, hintergrund: p.hintergrund ? rgbHex(p.hintergrund) : null, zusatz: p.zusatz, statusText, statusFarbe }
}
function luaPlatz(stil, p, a) {
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', `0 0 ${p.b} ${p.h}`)
  stil.platz(svg, p.b, p.h, platzInfo(p, stil), luaKontext(stil, a))
  return svg
}

// Vorschau eines Kästchens (Annäherung; die genaue Darstellung zeigt die Funke)
function vorschau(p) {
  const w = wertInfo(p.w)
  const def = (w && w.def) || {}
  const min = p.min !== undefined ? p.min : (def.min !== undefined ? def.min : 0)
  const max = p.max !== undefined ? p.max : (def.max !== undefined ? def.max : 100)
  const wert = min + (max - min) * 0.62
  const einheit = (st.projekt.werte[p.w] && st.projekt.werte[p.w].einheit) || einheitAnzeige(def.einheit) || (w && w.sensor && w.sensor.einheit) || (p.w && p.w.startsWith('kanal') ? '%' : '')
  const stellen = (st.projekt.werte[p.w] && st.projekt.werte[p.w].stellen) ?? def.stellen ?? 0
  const titel = p.titel || (def.titelLaufend ? name(def.titelLaufend) : (w ? w.text : '—'))
  const farbe = rgbHex(p.farbe, '#30c060')
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', `0 0 ${p.b} ${p.h}`)
  svg.setAttribute('preserveAspectRatio', 'none')
  const txt = (x, y, s, inhalt, anker = 'middle', fill = '#e8eaee') => {
    const e = document.createElementNS(SVG, 'text')
    e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('font-size', s); e.setAttribute('text-anchor', anker); e.setAttribute('fill', fill)
    e.setAttribute('font-family', 'sans-serif')
    e.textContent = inhalt
    svg.appendChild(e)
  }
  const rect = (x, y, b, h, fill) => { const e = document.createElementNS(SVG, 'rect'); e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', Math.max(0, b)); e.setAttribute('height', Math.max(0, h)); e.setAttribute('fill', fill); svg.appendChild(e) }
  const mmss = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}` }
  const d = p.darstellung || 'zahl'
  const einheitNeben = kann2() && (p.einheitZeigen === false || einheitImTitel(einheit, titel)) ? '' : einheit
  const zahl = def.zeit ? mmss(wert) : `${wert.toFixed(stellen)}${einheitNeben ? ' ' + einheitNeben : ''}`
  const klein = Math.max(10, Math.min(16, p.h * 0.18))
  // Format 2 §5: Symbol oben links, Titel rückt ein
  let einzug = 6
  if (kann2()) {
    const B = displayBreite(ansichtAktuell().breite)
    const r = Math.round(4 * B / 800)
    let x = r
    if (p.symbol && katalog(p.symbol) && symboleAn()) {
      const k = kante(kopfPx(klein, B), B)   // 0.10.6: Symbol so hoch wie der Titeltext, auf der Titelzeile
      const e = svgSymbol(p.symbol, r, Math.round(2 + klein / 2 - k / 2), k, farbe)
      if (e) { svg.appendChild(e); x = r + k + r }
    }
    if (x > r) einzug = x
  }
  txt(einzug, klein + 2, klein, titel, 'start', '#9aa1ad')
  const anteil = (wert - min) / (max - min || 1)
  if (d === 'zahl' || d === 'status') {
    const inhalt = d === 'status' ? (def.zustaende && def.zustaende[1] ? name({ de: def.zustaende[1].de, en: def.zustaende[1].en }) : t('status')) : zahl
    txt(p.b / 2, p.h * 0.65, Math.min(p.h * 0.42, p.b / Math.max(4, inhalt.length) * 1.6), inhalt, 'middle', d === 'status' && def.zustaende && def.zustaende[1] ? rgbHex(def.zustaende[1].farbe, farbe) : farbe)
  } else if (d === 'ring') {
    const r = Math.min(p.b, p.h - klein) * 0.38, cx = p.b / 2, cy = klein + (p.h - klein) / 2
    const bogen = (a0, a1, f, breite) => {
      const pt = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
      const e = document.createElementNS(SVG, 'path')
      e.setAttribute('d', `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`)
      e.setAttribute('stroke', f); e.setAttribute('stroke-width', breite); e.setAttribute('fill', 'none')
      svg.appendChild(e)
    }
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25
    bogen(a0, a1, '#343944', r * 0.22)
    bogen(a0, a0 + (a1 - a0) * anteil, farbe, r * 0.22)
    txt(cx, cy + r * 0.15, r * 0.42, zahl)
  } else if (d === 'balken_w') {
    const y = klein + 6, h = p.h - y - 6
    rect(6, y, p.b - 12, h, '#343944'); rect(6, y, (p.b - 12) * anteil, h, farbe)
    txt(p.b / 2, y + h * 0.7, Math.min(h * 0.7, 22), zahl)
  } else if (d === 'balken_s') {
    const x = p.b * 0.3, b = p.b * 0.4, y = klein + 6, h = p.h - y - 22
    rect(x, y, b, h, '#343944'); rect(x, y + h * (1 - anteil), b, h * anteil, farbe)
    txt(p.b / 2, p.h - 6, 14, zahl)
  } else if (d === 'kurve') {
    const e = document.createElementNS(SVG, 'polyline')
    const pts = []
    for (let i = 0; i <= 30; i++) pts.push(`${6 + (p.b - 12) * i / 30},${p.h - 8 - (p.h - klein - 16) * (0.5 + 0.35 * Math.sin(i / 4))}`)
    e.setAttribute('points', pts.join(' ')); e.setAttribute('stroke', farbe); e.setAttribute('fill', 'none'); e.setAttribute('stroke-width', 2)
    svg.appendChild(e)
    txt(p.b - 6, klein + 2, klein, zahl, 'end')
  }
  return svg
}

// Ziehen und Grösse ändern, mit Raster
function ziehenStart(ev, i, groesse) {
  ev.preventDefault()
  st.gewaehlt = i
  st.gewaehltDeko = -1
  const a = ansichtAktuell()
  const p = a.plaetze[i]
  const s = massstab()
  const start = { x: ev.clientX, y: ev.clientY, px: p.x, py: p.y, pb: p.b, ph: p.h }
  const raster = (v) => Math.round(v / RASTER) * RASTER
  const andere = a.plaetze.filter((_, j) => j !== i).concat(reserviert(a))
  // Fangstellen: Rand, Kanten der Nachbarn, Nachbarkante plus Standardabstand
  const fangX = [0, a.breite], fangY = [0, a.hoehe]
  for (const q of andere) {
    fangX.push(q.x, q.x + q.b, q.x + q.b + ABSTAND, q.x - ABSTAND)
    fangY.push(q.y, q.y + q.h, q.y + q.h + ABSTAND, q.y - ABSTAND)
  }
  const fangen = (werte, kandidaten) => {
    // werte: [Kante, Versatz zur Position]; liefert die beste Position und die Hilfslinie
    let best = null
    for (const [kante, versatz] of werte) for (const k of kandidaten) {
      const d = Math.abs(k - kante)
      if (d <= FANG && (!best || d < best.d)) best = { d, pos: k - versatz, linie: k }
    }
    return best
  }
  const bewegen = (e) => {
    const dx = (e.clientX - start.x) / s, dy = (e.clientY - start.y) / s
    const linien = []
    if (groesse) {
      let r = start.px + start.pb + dx, u = start.py + start.ph + dy
      const fx = fangen([[r, 0]], fangX), fy = fangen([[u, 0]], fangY)
      r = fx ? fx.pos : raster(r); u = fy ? fy.pos : raster(u)
      if (fx) linien.push(['v', fx.linie]); if (fy) linien.push(['h', fy.linie])
      p.b = Math.max(RASTER * 5, Math.min(a.breite - p.x, Math.round(r - p.x)))
      p.h = Math.max(RASTER * 5, Math.min(a.hoehe - p.y, Math.round(u - p.y)))
    } else {
      let x = start.px + dx, y = start.py + dy
      const fx = fangen([[x, 0], [x + p.b, p.b]], fangX), fy = fangen([[y, 0], [y + p.h, p.h]], fangY)
      x = fx ? fx.pos : raster(x); y = fy ? fy.pos : raster(y)
      if (fx) linien.push(['v', fx.linie]); if (fy) linien.push(['h', fy.linie])
      p.x = Math.max(0, Math.min(a.breite - p.b, Math.round(x)))
      p.y = Math.max(0, Math.min(a.hoehe - p.h, Math.round(y)))
    }
    flaecheZeigen()
    hilfslinien(linien)
  }
  const los = () => { window.removeEventListener('pointermove', bewegen); window.removeEventListener('pointerup', los); flaecheZeigen(); eigenschaftenZeigen(); geaendert() }
  window.addEventListener('pointermove', bewegen)
  window.addEventListener('pointerup', los)
  flaecheZeigen()
  eigenschaftenZeigen()
}

function hilfslinien(linien) {
  const s = massstab()
  for (const [art, wert] of linien) {
    const l = el('div', { class: 'hilfslinie ' + art })
    if (art === 'v') { l.style.left = wert * s + 'px' } else { l.style.top = wert * s + 'px' }
    $('flaeche').appendChild(l)
  }
}

// ---------- Ausrichten ----------
let vorher = null
function merken() { vorher = { m: st.m, ansicht: st.ansicht, plaetze: JSON.stringify(ansichtAktuell().plaetze) }; $('rueckgaengig').disabled = false }
function vergessen() { vorher = null; const k = document.getElementById('rueckgaengig'); if (k) k.disabled = true }
function rueckgaengig() {
  if (!vorher || vorher.m !== st.m || vorher.ansicht !== st.ansicht) { vergessen(); return }
  ansichtAktuell().plaetze = JSON.parse(vorher.plaetze); vergessen()
  st.gewaehlt = -1; flaecheZeigen(); eigenschaftenZeigen(); geaendert()
}

// Automatisch anordnen (0.4.0): Zerlegung in Zeilen und Spalten, gleiche Abstände G, Fläche füllen; Rechnung im Hauptprozess
// (src/studio/anordnen.js). Standardabstand: 8 px im Vollbild, sonst 5 px. Schmuck bleibt, wo er ist.
const VOLLBILD = [[800, 480], [640, 360], [480, 320]]
function abstandStandard(a) { return a && VOLLBILD.some(([b, h]) => b === a.breite && h === a.hoehe) ? 8 : 5 }
function abstandAnzeigen() {
  const o = $('abstandG').querySelector('option[value=auto]')
  if (o) o.textContent = t('abstandAuto').replace('{g}', st.projekt ? abstandStandard(ansichtAktuell()) : '5/8')
}
async function anordnenStart() {
  const a = ansichtAktuell()
  const meldung = (text, fehler) => { $('anordnungMeldung').textContent = text; $('anordnungMeldung').style.color = fehler ? 'var(--fehler)' : '' }
  const art = $('anordnenArt').value
  const G = $('abstandG').value === 'auto' ? abstandStandard(a) : Number($('abstandG').value)
  const f = a.breite / 800
  const mindest = Object.fromEntries(Object.entries({ ...MINDEST, ...Object.fromEntries(Object.keys((beschreibung() || {}).darstellungenExtra || {}).filter((d) => !d.startsWith('_')).map((d) => [d, mindestVon(d)])) }).map(([k, [b, h]]) => [k, [Math.round(b * f), Math.round(h * f)]]))
  const ansicht = { breite: a.breite, hoehe: a.hoehe, plaetze: a.plaetze.map((p) => ({ x: p.x, y: p.y, b: p.b, h: p.h, darstellung: p.darstellung || 'zahl' })) }
  const r = await api.studio('anordnen', { ansicht, reserviert: reserviert(a).map((x) => ({ x: x.x, y: x.y, b: x.b, h: x.h })), G, art, mindest })
  if (!r.ok) {
    const m = r.mindest || [0, 0]
    if (r.index !== undefined) { st.gewaehlt = r.index; st.gewaehltDeko = -1; flaecheZeigen(); eigenschaftenZeigen() }
    meldung(t('anordnen_' + r.grund).replace('{n}', (r.index || 0) + 1).replace('{m}', (r.index2 || 0) + 1).replace('{mb}', m[0]).replace('{mh}', m[1]), true)
    return
  }
  merken()
  r.plaetze.forEach((q, i) => Object.assign(a.plaetze[i], { x: q.x, y: q.y, b: q.b, h: q.h }))
  flaecheZeigen(); eigenschaftenZeigen(); geaendert()
  const name = $('anordnenArt').selectedOptions[0].textContent
  const g = r.abstand !== undefined ? r.abstand : G
  meldung((art === 'verteilen' ? t('anordnenOkVerteilen').replace('{g}', g) : t('anordnenOk').replace('{art}', name).replace('{g}', g)) +
    (r.hinweise.includes('abstandKleiner') ? ' ' + t('anordnenAbstandKleiner').replace('{g}', g).replace('{G}', G) : '') +
    (r.hinweise.includes('festeSpalte') ? ' ' + t('anordnenFesteSpalte') : ''))
}

// Gewähltes Kästchen waagrecht in den freien Bereich seiner Zeile setzen (zwischen den Nachbarn bzw. dem Rand)
function zentrieren() {
  const a = ansichtAktuell()
  const p = a.plaetze[st.gewaehlt]
  if (!p) return
  merken()
  const nachbarn = a.plaetze.concat(reserviert(a)).filter((q) => q !== p && q.y < p.y + p.h && q.y + q.h > p.y)
  const links = Math.max(0, ...nachbarn.filter((q) => q.x + q.b <= p.x + p.b / 2).map((q) => q.x + q.b))
  const rechts = Math.min(a.breite, ...nachbarn.filter((q) => q.x >= p.x + p.b / 2).map((q) => q.x))
  p.x = Math.round(links + (rechts - links - p.b) / 2)
  flaecheZeigen(); eigenschaftenZeigen(); geaendert()
}

function platzNeu() {
  const a = ansichtAktuell()
  if (a.plaetze.length >= MAX_PLAETZE) return
  const f = a.breite / 800
  const b = Math.round(160 * f / RASTER) * RASTER, h = Math.round(80 * f / RASTER) * RASTER
  // freie Stelle suchen
  let platz = null
  suche: for (let y = 0; y + h <= a.hoehe; y += RASTER * 2) {
    for (let x = 0; x + b <= a.breite; x += RASTER * 2) {
      const k = { x, y, b, h }
      if (!a.plaetze.some((q) => ueberlappt(k, q)) && !reserviert(a).some((r) => ueberlappt(k, r))) { platz = { x, y }; break suche }
    }
  }
  if (!platz) { $('anordnungMeldung').textContent = t('keinPlatz'); $('anordnungMeldung').style.color = 'var(--fehler)'; return }
  const erster = werteListe()[0]
  a.plaetze.push({ x: platz.x, y: platz.y, b, h, w: erster ? erster.k : 'leer', darstellung: 'zahl' })
  st.gewaehlt = a.plaetze.length - 1
  flaecheZeigen(); eigenschaftenZeigen(); geaendert()
}

function platzWeg() {
  const a = ansichtAktuell()
  if (st.gewaehltDeko >= 0) { a.deko.splice(st.gewaehltDeko, 1); if (!a.deko.length) delete a.deko; st.gewaehltDeko = -1; flaecheZeigen(); eigenschaftenZeigen(); geaendert(); return }
  if (st.gewaehlt < 0) return
  a.plaetze.splice(st.gewaehlt, 1)
  st.gewaehlt = -1
  flaecheZeigen(); eigenschaftenZeigen(); geaendert()
}

// Eigenschaften des gewählten Kästchens
function eigenschaftenZeigen() {
  const box = $('eigenschaften')
  box.textContent = ''
  const a = ansichtAktuell()
  if (a && st.gewaehltDeko >= 0 && a.deko && a.deko[st.gewaehltDeko]) { dekoEigenschaften(box, a, a.deko[st.gewaehltDeko]); return }
  const p = a && a.plaetze[st.gewaehlt]
  if (!p) { box.appendChild(el('p', { class: 'leise klein', text: t('platzWaehlen') })); return }
  const neu = () => { flaecheZeigen(); geaendert() }
  const feld = (beschriftung, eingabe) => { feldKennung(beschriftung, eingabe); box.appendChild(el('label', { text: beschriftung, for: eingabe.id || undefined })); box.appendChild(eingabe) }

  const wSel = el('select', { onchange: (e) => { p.w = e.target.value; if (!erlaubteDarstellungen(p.w).includes(p.darstellung || 'zahl')) p.darstellung = erlaubteDarstellungen(p.w)[0]; eigenschaftenZeigen(); neu() } })
  for (const w of werteListe()) wSel.appendChild(el('option', { value: w.k, text: w.text, selected: w.k === p.w }))
  feld(t('wert'), wSel)

  const dSel = el('select', { onchange: (e) => { p.darstellung = e.target.value; neu() } })
  for (const d of erlaubteDarstellungen(p.w)) dSel.appendChild(el('option', { value: d, text: darstellungName(d), selected: d === (p.darstellung || 'zahl') }))
  feld(t('darstellung'), dSel)

  const titel = el('input', { type: 'text', value: p.titel || '', placeholder: (wertInfo(p.w) || {}).text || '', oninput: (e) => {
    let v = e.target.value
    while (bytes(v) > 24) v = v.slice(0, -1)
    if (v !== e.target.value) e.target.value = v
    if (v) p.titel = v; else delete p.titel
    neu()
  } })
  feld(t('titel'), titel)

  // Format 2: Symbol, Grösse, Einheit
  if (kann2()) {
    const sSel = el('select', { onchange: (e) => {
      if (e.target.value) { p.symbol = e.target.value; const k = katalog(p.symbol); if ((p.symbolPx || 24) < k.minPx) p.symbolPx = k.minPx } else { delete p.symbol; delete p.symbolPx }
      eigenschaftenZeigen(); neu()
    } })
    sSel.appendChild(el('option', { value: '', text: t('keinSymbol') }))
    for (const k of st.symbole.katalog) sSel.appendChild(el('option', { value: k.name, text: name({ de: k.de, en: k.en }), selected: k.name === p.symbol }))
    feld(t('symbol'), sSel)
    if (p.symbol && katalog(p.symbol)) {
      const pSel = el('select', { onchange: (e) => { const v = Number(e.target.value); if (v === 24) delete p.symbolPx; else p.symbolPx = v; neu() } })
      for (const x of PX.filter((x) => x >= katalog(p.symbol).minPx)) pSel.appendChild(el('option', { value: x, text: `${x} px`, selected: x === (p.symbolPx || 24) }))
      feld(t('symbolGroesse'), pSel)
    }
    const eSel = el('select', { onchange: (e) => { if (e.target.value === 'true') delete p.einheitZeigen; else p.einheitZeigen = false; neu() } })
    const jetzt = p.einheitZeigen === false ? 'false' : 'true'   // altes «fett» gilt wie «am Wert»
    for (const [v, k] of [['true', 'einheitNeben'], ['false', 'einheitKeine']]) eSel.appendChild(el('option', { value: v, text: t(k), selected: v === jetzt }))
    feld(t('einheit'), eSel)
  }

  const zahlFeld = (k, ph) => el('input', { type: 'number', value: p[k] ?? '', placeholder: ph, oninput: (e) => { if (e.target.value === '') delete p[k]; else p[k] = Number(e.target.value); neu() } })
  const def = (wertInfo(p.w) || {}).def || {}
  box.appendChild(el('label', { text: t('bereich') }))
  box.appendChild(el('div', { class: 'paar' }, [zahlFeld('min', String(def.min ?? 0)), zahlFeld('max', String(def.max ?? 100))]))

  const farbe = (k, ersatz) => el('input', { type: 'color', value: rgbHex(p[k], ersatz), onchange: (e) => { p[k] = hexRgb(e.target.value); neu() } })
  const zurueck = (k) => el('button', { class: 'neben klein', text: '↺', title: t('standardFarbe'), onclick: () => { delete p[k]; eigenschaftenZeigen(); neu() } })
  box.appendChild(el('label', { text: t('farben') }))
  box.appendChild(el('div', { class: 'paar' }, [farbe('farbe', '#30c060'), zurueck('farbe'), farbe('farbeWarn', '#ffa000'), zurueck('farbeWarn'), farbe('farbeAlarm', '#e62828'), zurueck('farbeAlarm')]))
  box.appendChild(el('div', { class: 'paar' }, [el('span', { class: 'leise klein', text: `${t('normal')} · ${t('warnung')} · ${t('alarm')}` })]))
  box.appendChild(el('label', { text: t('hintergrund') }))
  box.appendChild(el('div', { class: 'paar' }, [farbe('hintergrund', '#1d2026'), zurueck('hintergrund')]))

  const zSel = el('select', { onchange: (e) => { if (e.target.value === 'keine') delete p.zusatz; else p.zusatz = e.target.value; neu() } })
  for (const z of ['keine', 'min', 'max', 'mittel']) zSel.appendChild(el('option', { value: z, text: t('z_' + z), selected: z === (p.zusatz || 'keine') }))
  feld(t('zusatz'), zSel)

  if ((p.darstellung || 'zahl') === 'kurve') feld(t('kurveS'), el('input', { type: 'number', min: 30, max: 600, value: p.kurveS || 120, oninput: (e) => { p.kurveS = Math.max(30, Math.min(600, Math.round(Number(e.target.value) || 120))); geaendert() } }))

  // Farbstufen (höchstens 3, aufsteigend)
  box.appendChild(el('label', { text: t('stufen') }))
  const stufen = p.stufen || []
  stufen.forEach((s, n) => {
    box.appendChild(el('div', { class: 'paar' }, [
      el('input', { type: 'number', value: s.ab, oninput: (e) => { if (e.target.value === '') return; s.ab = Number(e.target.value); stufen.sort((x, y) => x.ab - y.ab); neu() } }),
      el('input', { type: 'color', value: rgbHex(s.farbe, '#ffff00'), onchange: (e) => { s.farbe = hexRgb(e.target.value); neu() } }),
      el('button', { class: 'neben klein', text: '×', onclick: () => { stufen.splice(n, 1); if (!stufen.length) delete p.stufen; eigenschaftenZeigen(); neu() } }),
    ]))
  })
  if (stufen.length < 3) box.appendChild(el('button', { class: 'neben klein', text: t('stufeNeu'), onclick: () => { p.stufen = stufen; stufen.push({ ab: Math.round((p.max ?? def.max ?? 100) * 0.5), farbe: [255, 255, 0] }); eigenschaftenZeigen(); neu() } }))

  box.appendChild(el('p', { class: 'leise klein', text: `x ${p.x} · y ${p.y} · ${p.b} × ${p.h} px` }))
}

// ---------- Grenzwerte, Wert-Anpassung, Einstellungen ----------
function benutzteWerte() {
  const s = new Set()
  for (const a of st.projekt.ansichten) for (const p of a.plaetze) if (p.w && p.w !== 'leer') s.add(p.w)
  for (const w of (beschreibung().werte || [])) if (w.grenzeRichtung) s.add(`lua:${w.s}`)
  for (const k of Object.keys(st.projekt.grenzen)) s.add(k)
  return [...s]
}

// Warnband über der Grenzen-Tabelle: welche Alarme bei Motor aus schweigen; Hinweis, wenn das Lua es (noch) nicht kennt
function motorAusBand(mitMotor, zeilen, alleHaken) {
  const band = $('motorAusBand')
  const frei = zeilen.filter((z) => !z.gesperrt)
  if (alleHaken) {
    const an = frei.filter((z) => z.an).length
    alleHaken.checked = frei.length > 0 && an === frei.length
    alleHaken.indeterminate = an > 0 && an < frei.length
    alleHaken.disabled = !frei.length
  }
  const stumm = zeilen.filter((z) => z.stumm)
  if (!mitMotor || !stumm.length) { band.hidden = true; band.textContent = ''; return }
  const info = st.m && st.m.info
  const b = beschreibung()
  const kenntNicht = !b.beiMotorAus || (info && !info.vorbereitet && info.beiMotorAus !== true)
  band.textContent = ''
  band.appendChild(el('strong', { text: '⚠ ' + t('motorAusBand') }))
  band.appendChild(el('span', { text: ' ' + stumm.map((z) => z.text).join(', ') }))
  if (kenntNicht) band.appendChild(el('div', { class: 'klein', text: t('motorAusLuaKenntNicht') }))
  band.hidden = false
}

function grenzenZeigen() {
  const b = beschreibung()
  const tab = $('tabGrenzen')
  tab.textContent = ''
  // «auch bei Motor aus» (Format 2 §3.5): Spalte nur, wenn das Lua es kennt oder das Projekt schon ein false hat
  const immer = new Set((b.werte || []).filter((w) => w && w.immerAlarm).map((w) => `lua:${w.s}`))
  const mitMotor = !!b.beiMotorAus || Object.entries(st.projekt.grenzen).some(([k, g]) => g && g.beiMotorAus === false && !immer.has(k))
  const kopf = el('tr', {}, ['wert', 'richtung', 'warnung', 'alarm', 'ansage', 'vibration', 'aus'].map((k) => el('th', { text: t('g_' + k) })))
  const motorZeilen = []
  let alleHaken = null
  if (mitMotor) {
    alleHaken = el('input', { type: 'checkbox', title: t('motorAusAlle'), onchange: (e) => {
      for (const z of motorZeilen) if (!z.gesperrt && z.an !== e.target.checked) z.setze('beiMotorAus', e.target.checked ? undefined : false)
      grenzenZeigen()
    } })
    kopf.appendChild(el('th', { title: t('motorAusErklaerung') }, [el('span', { text: t('g_beiMotorAus') }), el('label', { class: 'alle' }, [alleHaken, el('span', { text: t('alle') })])]))
  }
  tab.appendChild(kopf)
  for (const k of benutzteWerte()) {
    const w = wertInfo(k)
    if (w && w.def && !w.def.grenzeRichtung && !st.projekt.grenzen[k]) continue
    if (w && w.def && Array.isArray(w.def.darstellungen) && w.def.darstellungen.length === 1 && w.def.darstellungen[0] === 'status') continue
    const g = st.projekt.grenzen[k] || {}
    const werk = ((b.standard && b.standard.grenzen) || {})[k] || {}
    const fehlt = !st.projekt.grenzen[k]
    const setze = (f, v) => {
      // Neuer Eintrag beginnt mit den Werkgrenzen, sonst würde z. B. nur «Ansage aus» alle Alarme dieses Werts abschalten
      const neu = { ...(st.projekt.grenzen[k] || werk) }
      if (v === undefined || v === '') { if (f === 'warnung' || f === 'alarm') neu[f] = false; else delete neu[f] } else neu[f] = v
      // Eintrag genau gleich den Werkgrenzen: weglassen (fehlt = Werkgrenzen, hält die Datei klein)
      const gleich = (x, y) => Object.keys(x).length === Object.keys(y).length && Object.keys(x).every((f) => x[f] === y[f])
      if (Object.keys(neu).filter((x) => x !== 'richtung').length === 0 && !(w && w.def && w.def.grenzeRichtung) && !neu.richtung) delete st.projekt.grenzen[k]
      else if (Object.keys(werk).length && gleich(neu, werk)) delete st.projekt.grenzen[k]
      else st.projekt.grenzen[k] = neu
      geaendert()
    }
    const standardRichtung = (w && w.def && w.def.grenzeRichtung) || ''
    const rSel = el('select', { onchange: (e) => setze('richtung', e.target.value || undefined) })
    rSel.appendChild(el('option', { value: '', text: standardRichtung ? `${t('r_' + standardRichtung)} (${t('standard')})` : '—' }))
    // Lua-Werte mit Standardrichtung: nur diese Richtung (Format 6.5, sonst setzt die Funke die Werkgrenze ein)
    for (const r of standardRichtung ? [] : ['unter', 'ueber']) rSel.appendChild(el('option', { value: r, text: t('r_' + r), selected: g.richtung === r }))
    // Regel 21.11.2026 (Format v1 §6.5): Eintrag ohne Zahl-Stufe und ohne «aus» schaltet nie ab, die Funke nimmt die Werkgrenze
    const werkStufe = ['warnung', 'alarm'].some((f) => typeof werk[f] === 'number')
    const beideLeer = !fehlt && !g.aus && !['warnung', 'alarm'].some((f) => typeof g[f] === 'number')
    const nimmtWerk = fehlt || (beideLeer && werkStufe)
    const zahl = (f) => el('input', { type: 'number', step: 'any', value: g.aus || g[f] === false ? '' : (g[f] ?? ''), disabled: !!g.aus, placeholder: nimmtWerk && werk[f] !== undefined && werk[f] !== false ? `${t('werk')} ${werk[f]}` : t('aus'), title: beideLeer && werkStufe ? t('beideLeerWerk') : undefined, oninput: (e) => setze(f, e.target.value === '' ? undefined : Number(e.target.value)) })
    // Ohne eingestellte Stufe gibt es keinen Alarm: Haken sperren, sonst entstünde ein Eintrag ohne Stufen (= beide Stufen aus, v1 §6.5)
    const quelle = nimmtWerk ? werk : g
    const keinAlarm = !!g.aus || !['warnung', 'alarm'].some((f) => typeof quelle[f] === 'number')
    // ohne Alarm gesperrt; ein schon gesetztes false bleibt zum Zurücksetzen bedienbar
    const hakenGesperrt = (f) => keinAlarm && g[f] !== false
    const haken = (f) => el('input', { type: 'checkbox', checked: g[f] !== false, disabled: hakenGesperrt(f), title: hakenGesperrt(f) ? t('keinAlarmEingestellt') : undefined, onchange: (e) => setze(f, e.target.checked ? undefined : false) })
    const ausHaken = el('input', { type: 'checkbox', checked: !!g.aus, title: t('alarmAus'), onchange: (e) => { setze('aus', e.target.checked ? true : undefined); grenzenZeigen() } })
    const wertHinweis = w && w.def && w.def.hinweis ? name(w.def.hinweis) : null
    const zellen = [el('td', { text: (w ? w.text : k) + (wertHinweis ? ' ⓘ' : ''), title: wertHinweis || undefined }), el('td', {}, [rSel]), el('td', {}, [zahl('warnung')]), el('td', {}, [zahl('alarm')]), el('td', {}, [haken('ansage')]), el('td', {}, [haken('vibration')]), el('td', {}, [ausHaken])]
    let stumm = false
    if (mitMotor) {
      // Abschaltgründe (immerAlarm) kommen immer, dort gibt es keinen Haken
      if (w && w.def && w.def.immerAlarm) zellen.push(el('td', { class: 'leise', text: '—', title: t('motorAusImmer') }))
      else {
        stumm = g.beiMotorAus === false && !keinAlarm
        // Haken nur, wo ein Alarm eingestellt ist; ein schon gesetztes false bleibt zum Zurücksetzen bedienbar
        const gesperrt = keinAlarm && g.beiMotorAus !== false
        motorZeilen.push({ setze, gesperrt, an: g.beiMotorAus !== false, text: w ? w.text : k, stumm })
        zellen.push(el('td', { class: stumm ? 'motor-aus-stumm' : undefined }, [el('input', { type: 'checkbox', checked: g.beiMotorAus !== false, disabled: gesperrt, title: gesperrt ? t('keinAlarmEingestellt') : stumm ? t('motorAusZeile') : t('motorAusErklaerung'), onchange: (e) => { setze('beiMotorAus', e.target.checked ? undefined : false); grenzenZeigen() } })]))
      }
    }
    tab.appendChild(el('tr', { class: stumm ? 'motor-aus-stumm' : undefined }, zellen))
  }
  motorAusBand(mitMotor, motorZeilen, alleHaken)

  // Wert-Anpassung (6.4) für benutzte Sensoren und Lua-Werte
  const tw = $('tabWerte')
  tw.textContent = ''
  tw.appendChild(el('tr', {}, ['wert', 'faktor', 'versatz', 'einheit', 'stellen'].map((k) => el('th', { text: t('a_' + k) }))))
  for (const k of benutzteWerte().filter((x) => !x.startsWith('kanal'))) {
    const w = wertInfo(k)
    const a = st.projekt.werte[k] || {}
    const setze = (f, v) => {
      const neu = { ...(st.projekt.werte[k] || {}) }
      if (v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v))) delete neu[f]; else neu[f] = v
      if (Object.keys(neu).length) st.projekt.werte[k] = neu; else delete st.projekt.werte[k]
      flaecheZeigen(); geaendert()
    }
    const zahl = (f, ph, opt = {}) => el('input', { type: 'number', step: 'any', value: a[f] ?? '', placeholder: ph, ...opt, oninput: (e) => {
      let v = e.target.value === '' ? undefined : Number(e.target.value)
      if (f === 'faktor' && v !== undefined && (Math.abs(v) < 0.0001 || Math.abs(v) > 10000)) { e.target.style.color = 'var(--fehler)'; return }
      e.target.style.color = ''
      if (f === 'stellen' && v !== undefined) v = Math.max(0, Math.min(3, Math.round(v)))
      setze(f, v)
    } })
    const einheit = el('input', { type: 'text', value: a.einheit || '', placeholder: einheitAnzeige(w && w.def && w.def.einheit) || (w && w.sensor && w.sensor.einheit) || '', oninput: (e) => {
      let v = e.target.value; while (bytes(v) > 8) v = v.slice(0, -1); if (v !== e.target.value) e.target.value = v; setze('einheit', v || undefined)
    } })
    tw.appendChild(el('tr', {}, [el('td', { text: w ? w.text : k }), el('td', {}, [zahl('faktor', '1')]), el('td', {}, [zahl('versatz', '0')]), el('td', {}, [einheit]), el('td', {}, [zahl('stellen', String((w && w.def && w.def.stellen) ?? 0), { min: 0, max: 3 })])]))
  }

  // Einstellungen des Luas
  const te = $('tabEinstellungen')
  te.textContent = ''
  for (const e of b.einstellungen || []) {
    const v = st.projekt.einstellungen[e.s] ?? e.werk
    let eingabe
    const setze = (x) => { st.projekt.einstellungen[e.s] = x; geaendert() }
    if (e.art === 'b') eingabe = el('input', { type: 'checkbox', checked: !!v, onchange: (x) => setze(x.target.checked) })
    else if (e.art === 'w') {
      eingabe = el('select', { onchange: (x) => setze(Number(x.target.value)) })
      for (const o of e.auswahl || []) eingabe.appendChild(el('option', { value: o.wert, text: o.name ? name(o.name) : name({ de: o.de, en: o.en }), selected: o.wert === v }))
    } else if (e.art === 't') eingabe = el('input', { type: 'text', value: v ?? '', maxlength: e.max || 12, oninput: (x) => setze(x.target.value) })
    else eingabe = el('input', { type: 'number', value: v, min: e.min, max: e.max, oninput: (x) => { const n = Number(x.target.value); if (Number.isFinite(n) && n >= e.min && n <= e.max) { x.target.style.color = ''; setze(Number.isInteger(n) ? n : n) } else x.target.style.color = 'var(--fehler)' } })
    te.appendChild(el('tr', {}, [el('td', { text: name(e.name) }), el('td', {}, [eingabe]), el('td', { class: 'leise', text: e.einheit || '' })]))
  }
  vorlagenZeigen()
}

async function vorlagenZeigen() {
  const sel = $('vorlage')
  sel.textContent = ''
  sel.appendChild(el('option', { value: '', text: t('vorlageStandard') }))
  for (const n of await api.studio('vorlagen', st.m.lua)) sel.appendChild(el('option', { value: n, text: n }))
  const vm = $('vonModell')
  vm.textContent = ''
  for (const p of await api.studio('projekte', funkeName())) {
    if (p.lua !== st.m.lua || p.kennung === st.m.kennung) continue
    vm.appendChild(el('option', { value: p.kennung, text: p.kennung }))
  }
  $('vonModellKopieren').disabled = !vm.options.length
  // Zuordnen: Vorbereitung (ohne Funke) für dieses Modell übernehmen, passende Kennung zuerst
  const vv = $('vonVorbereitet')
  vv.textContent = ''
  const liste = st.m.vorbereitet ? [] : passendeVorbereitete(st.m)
  liste.sort((x, y) => (y.kennung.toLowerCase() === st.m.kennung.toLowerCase()) - (x.kennung.toLowerCase() === st.m.kennung.toLowerCase()))
  for (const v of liste) vv.appendChild(el('option', { value: v.kennung, text: `${v.info.modell} (${v.kennung})` }))
  $('vorbereitungZeile').hidden = !liste.length
}

async function vonVorbereitetKopieren(schonGefragt, kennung) {
  const k = kennung || $('vonVorbereitet').value
  const v = st.vorbereitete.find((x) => x.kennung === k && x.lua === st.m.lua)
  if (!v || (schonGefragt !== true && !confirm(t('vorbereitetFrage')))) return
  const p = await api.studio('projektLesen', { funkeName: v.info.funke, lua: v.lua, kennung: v.kennung })
  if (!p) return
  const { vorbereitetInfo, ...rest } = p
  st.projekt = JSON.parse(JSON.stringify(rest))
  // eigene Sensoren und Grössen des Modells bleiben die der Funke; Ansichten mit fremden Grössen fallen weg
  const fenster = (st.m.info && st.m.info.fenster) || []
  if (fenster.length) st.projekt.ansichten = st.projekt.ansichten.filter((a) => fenster.some((f) => f.breite === a.breite && f.hoehe === a.hoehe))
  st.gewaehlt = -1; st.gewaehltDeko = -1; ansichtVorwaehlen()
  allesZeigen(); geaendert()
}

// ---------- Presets (Format 2 §8) ----------
function presetsZeigen() {
  const sel = $('presetWahl')
  sel.textContent = ''
  for (const p of st.presets) sel.appendChild(el('option', { value: 'p:' + p.s, text: name(p.name) }))
  presetHinweis()
}
function presetHinweis() {
  const p = st.presets.find((x) => 'p:' + x.s === $('presetWahl').value)
  const teile = []
  if (p && p.hinweis) teile.push(name(p.hinweis))
  if (p && p.verworfen && p.verworfen.length) teile.push(`${t('presetVerworfen')}: ${p.verworfen.join(', ')}`)
  $('presetWahl').title = teile.join(' · ')
  $('presetInfo').textContent = teile.join(' · ')
}
async function presetAnwenden() {
  const v = $('presetWahl').value
  if (!v || !confirm(t('presetFrage'))) return
  const fenster = (st.m.info && st.m.info.fenster) || []
  const r = await api.studio('presetAnwenden', { lua: st.m.lua, s: v.slice(2), projekt: st.projekt, fenster })
  if (!r.ok) return
  st.projekt = r.projekt
  st.gewaehlt = -1; st.gewaehltDeko = -1; ansichtVorwaehlen()
  allesZeigen(); geaendert()
}

// ---------- Schmuck (Format 2 §3.4) ----------
function dekoGrenzen(d, a) {
  const B = displayBreite(a.breite)
  if (d.art === 'symbol') { const k = kante(d.px, B); return { x: d.x, y: d.y, b: k, h: k } }
  if (d.art === 'linie') return { x: Math.min(d.x, d.x + d.b), y: Math.min(d.y, d.y + d.h), b: Math.abs(d.b) + 1, h: Math.abs(d.h) + 1 }
  return { x: d.x, y: d.y, b: d.b, h: d.h }
}
function dekoFehler(d, a) {
  const g = dekoGrenzen(d, a)
  if (d.x < 0 || d.y < 0 || d.x >= a.breite || d.y >= a.hoehe || g.x < 0 || g.y < 0 || g.x + g.b > a.breite || g.y + g.h > a.hoehe) return t('pRand')
  if (d.art === 'linie' && d.b === 0 && d.h === 0) return t('dekoLinieLeer')
  if (d.art === 'symbol' && (!katalog(d.name) || d.px < katalog(d.name).minPx)) return t('dekoSymbolFehlt')
  if (d.art === 'text' && !d.text) return t('dekoTextLeer')
  return ''
}
function dekoElement(d, i, a, s) {
  const g = dekoGrenzen(d, a)
  const farbe = rgbHex(d.farbe, '#c8ccd4')
  const fehler = dekoFehler(d, a)
  const e = el('div', { class: `deko ${d.art}${i === st.gewaehltDeko ? ' gewaehlt' : ''}${fehler ? ' fehler' : ''}`, title: fehler || t('deko_' + d.art) })
  e.style.left = g.x * s + 'px'; e.style.top = g.y * s + 'px'; e.style.width = g.b * s + 'px'; e.style.height = g.h * s + 'px'; e.style.color = farbe
  if (d.art === 'symbol') {
    const q = document.createElementNS(SVG, 'svg'); q.setAttribute('viewBox', `0 0 ${g.b} ${g.h}`)
    const sy = symboleAn() ? svgSymbol(d.name, 0, 0, g.b, farbe) : null; if (sy) q.appendChild(sy)
    e.appendChild(q)
  } else if (d.art === 'text') {
    e.textContent = d.text || ''
    e.style.fontSize = Math.max(8, d.h * 0.75 * s) + 'px'
  } else if (d.art === 'linie') {
    const q = document.createElementNS(SVG, 'svg'); q.setAttribute('viewBox', `0 0 ${g.b} ${g.h}`); q.setAttribute('preserveAspectRatio', 'none')
    const l = document.createElementNS(SVG, 'line')
    l.setAttribute('x1', d.x - g.x + 0.5); l.setAttribute('y1', d.y - g.y + 0.5); l.setAttribute('x2', d.x + d.b - g.x + 0.5); l.setAttribute('y2', d.y + d.h - g.y + 0.5)
    l.setAttribute('stroke', farbe); l.setAttribute('stroke-width', 1); l.setAttribute('vector-effect', 'non-scaling-stroke')
    q.appendChild(l); e.appendChild(q)
  }
  e.addEventListener('pointerdown', (ev) => dekoZiehen(ev, i))
  return e
}
function dekoZiehen(ev, i) {
  ev.preventDefault()
  st.gewaehltDeko = i; st.gewaehlt = -1
  const a = ansichtAktuell()
  const d = a.deko[i]
  const s = massstab()
  const start = { x: ev.clientX, y: ev.clientY, dx: d.x, dy: d.y }
  const bewegen = (e) => {
    const g = dekoGrenzen(d, a)
    const versatzX = d.x - g.x, versatzY = d.y - g.y
    const nx = Math.round((start.dx + (e.clientX - start.x) / s) / RASTER) * RASTER
    const ny = Math.round((start.dy + (e.clientY - start.y) / s) / RASTER) * RASTER
    d.x = Math.max(versatzX, Math.min(a.breite - g.b + versatzX, nx))
    d.y = Math.max(versatzY, Math.min(a.hoehe - g.h + versatzY, ny))
    flaecheZeigen()
  }
  const los = () => { window.removeEventListener('pointermove', bewegen); window.removeEventListener('pointerup', los); flaecheZeigen(); eigenschaftenZeigen(); geaendert() }
  window.addEventListener('pointermove', bewegen)
  window.addEventListener('pointerup', los)
  flaecheZeigen(); eigenschaftenZeigen()
}
function dekoNeu(art) {
  const a = ansichtAktuell()
  a.deko = a.deko || []
  if (a.deko.length >= MAX_DEKO) return
  const f = a.breite / 800
  const x = Math.round(10 * f), y = Math.round(10 * f)
  const d = art === 'symbol' ? { art, x, y, name: 'stern', px: 32 }
    : art === 'text' ? { art, x, y, b: Math.round(160 * f), h: Math.round(24 * f), text: 'Text' }
      : art === 'linie' ? { art, x, y, b: Math.round(120 * f), h: 0 }
        : { art, x, y, b: Math.round(200 * f), h: Math.round(100 * f) }
  a.deko.push(d)
  st.gewaehltDeko = a.deko.length - 1; st.gewaehlt = -1
  flaecheZeigen(); eigenschaftenZeigen(); geaendert()
}
function dekoEigenschaften(box, a, d) {
  const neu = () => { flaecheZeigen(); geaendert() }
  const feld = (beschriftung, eingabe) => { feldKennung(beschriftung, eingabe); box.appendChild(el('label', { text: beschriftung, for: eingabe.id || undefined })); box.appendChild(eingabe) }
  box.appendChild(el('p', { class: 'klein', text: t('deko_' + d.art) }))
  const ganz = (k, min) => el('input', { type: 'number', step: 1, value: d[k], oninput: (e) => {
    const v = Math.round(Number(e.target.value))
    if (e.target.value === '' || !Number.isFinite(v) || (min !== undefined && v < min)) { e.target.style.color = 'var(--fehler)'; return }
    e.target.style.color = ''; d[k] = v; neu()
  } })
  if (d.art === 'symbol') {
    const sSel = el('select', { onchange: (e) => { d.name = e.target.value; const k = katalog(d.name); if (d.px < k.minPx) d.px = k.minPx; eigenschaftenZeigen(); neu() } })
    for (const k of st.symbole.katalog) sSel.appendChild(el('option', { value: k.name, text: name({ de: k.de, en: k.en }), selected: k.name === d.name }))
    feld(t('symbol'), sSel)
    const pSel = el('select', { onchange: (e) => { d.px = Number(e.target.value); neu() } })
    for (const x of PX.filter((x) => x >= ((katalog(d.name) || {}).minPx || 24))) pSel.appendChild(el('option', { value: x, text: `${x} px`, selected: x === d.px }))
    feld(t('symbolGroesse'), pSel)
  }
  if (d.art === 'text') {
    feld(t('text'), el('input', { type: 'text', value: d.text || '', oninput: (e) => {
      let v = e.target.value
      while (bytes(v) > 24) v = v.slice(0, -1)
      if (v !== e.target.value) e.target.value = v
      d.text = v; neu()
    } }))
  }
  box.appendChild(el('label', { text: 'x · y' }))
  box.appendChild(el('div', { class: 'paar' }, [ganz('x', 0), ganz('y', 0)]))
  if (d.art !== 'symbol') {
    box.appendChild(el('label', { text: d.art === 'linie' ? t('dekoRichtung') : t('dekoGroesse') }))
    box.appendChild(el('div', { class: 'paar' }, [ganz('b', d.art === 'linie' ? undefined : 1), ganz('h', d.art === 'linie' ? undefined : 1)]))
  }
  box.appendChild(el('label', { text: t('farbe') }))
  box.appendChild(el('div', { class: 'paar' }, [
    el('input', { type: 'color', value: rgbHex(d.farbe, '#c8ccd4'), onchange: (e) => { d.farbe = hexRgb(e.target.value); neu() } }),
    el('button', { class: 'neben klein', text: '↺', title: t('standardFarbe'), onclick: () => { delete d.farbe; eigenschaftenZeigen(); neu() } }),
  ]))
  const f = dekoFehler(d, a)
  if (f) { const m = el('p', { class: 'klein', text: f }); m.style.color = 'var(--fehler)'; box.appendChild(m) }
}

async function vorlageLaden() {
  const n = $('vorlage').value
  if (!confirm(t('vorlageFrage'))) return
  if (!n) {
    const vi = st.projekt.vorbereitetInfo
    st.projekt = (await api.studio('projekt', { funkeName: '__neu__', lua: st.m.lua, kennung: '__neu__', info: st.m.info })).projekt
    if (vi) st.projekt.vorbereitetInfo = vi
  }
  else {
    const r = await api.studio('vorlageLaden', { lua: st.m.lua, name: n })
    if (!r.ok) return
    st.projekt = { ...st.projekt, ...r.daten }
    st.projekt.ansichten = (st.projekt.ansichten || []).slice(0, 2)
  }
  st.gewaehlt = -1; st.gewaehltDeko = -1; ansichtVorwaehlen()
  allesZeigen(); geaendert()
}

async function vorlageSpeichern() {
  const n = $('vorlageName').value.trim()
  if (!n) { $('vorlageName').focus(); return }
  $('vorlageName').value = ''
  await api.studio('vorlageSpeichern', { lua: st.m.lua, name: n, projekt: st.projekt })
  vorlagenZeigen()
}

async function vonModellKopieren() {
  const k = $('vonModell').value
  if (!k || !confirm(t('kopierenFrage'))) return
  const p = await api.studio('projektLesen', { funkeName: funkeName(), lua: st.m.lua, kennung: k })
  if (!p) return
  const { vorbereitetInfo: _fremd, ...rest } = JSON.parse(JSON.stringify(p))
  st.projekt = { ...rest, vorbereitetInfo: st.projekt.vorbereitetInfo }
  if (!st.projekt.vorbereitetInfo) delete st.projekt.vorbereitetInfo
  st.gewaehlt = -1; st.gewaehltDeko = -1; ansichtVorwaehlen()
  allesZeigen(); geaendert()
}

// ---------- Übertragen ----------
// Ziel beim Übertragen: die Quelle; bei vorbereiteten Modellen ein SD-Laufwerk oder ein Ordner (Export)
function zielSpec() { return st.m && st.m.vorbereitet ? st.exportSpec : st.quelle }
async function exportZieleZeigen() {
  const z = await api.studio('ziele')
  const sel = $('exportZiel')
  const alt = st.exportSpec
  sel.textContent = ''
  st.exportZiele = z.laufwerke.map((w) => ({ art: 'laufwerk', wurzel: w, text: `${t('quelleLaufwerk')} ${w}` }))
  if (alt && alt.art === 'ordner') st.exportZiele.push(alt)
  st.exportZiele.push({ art: 'ordnerWaehlen', text: t('ordnerWaehlen') })
  // Platzhalter zuerst: sonst ist «Ordner wählen …» schon gewählt und ein Klick darauf löst nichts aus (Befund 0.8.1)
  // nur ohne erkanntes Laufwerk; sonst ist wie bisher das erste Laufwerk vorgewählt
  const ohneLaufwerk = !z.laufwerke.length
  if (ohneLaufwerk) sel.appendChild(el('option', { value: '', text: t('zielWaehlen'), selected: !alt }))
  st.exportZiele.forEach((q, i) => sel.appendChild(el('option', { value: i, text: q.text, selected: alt && q.text === alt.text })))
  st.exportSpec = sel.value === '' ? null : st.exportZiele[Number(sel.value)]
  if (st.exportSpec && st.exportSpec.art === 'ordnerWaehlen') st.exportSpec = null
}
$('exportZiel').addEventListener('change', async (e) => {
  if (e.target.value === '') { st.exportSpec = null; uebertragenZeigen(); return }
  const q = st.exportZiele[Number(e.target.value)]
  if (q.art === 'ordnerWaehlen') {
    const p = await api.studio('ordnerWaehlen')
    st.exportSpec = p ? { art: 'ordner', pfad: p, text: `${t('quelleOrdner')}: ${p}` } : null
    await exportZieleZeigen()
  } else st.exportSpec = q
  uebertragenZeigen()
})

// Notlösung: Studio-Datei als Datei speichern (Speichern-Dialog), danach von Hand auf die SD-Karte kopieren
// Wie NEUE_WAHL in src/studio/studio.js: ab diesen Versionen findet das Lua sein Studio-Layout überall (Menü «Studio layout»)
const NEUE_WAHL = { electric: '0.7.0', heli: '1.14.0', jet: '0.5.0', glider: '0.6.0', gas_ecu: '1.12.0', gas_carb: '0.12.0' }
function versionKleinerUI(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0)
  return false
}
// Kennung aus dem Modellnamen wie im Lua (Format v1 §2.1): jedes Byte ausser A–Z, a–z, 0–9 wird «_», höchstens 32 Byte
function kennungVon(name) {
  const k = Array.from(new TextEncoder().encode(String(name || '')), (b) => (/[A-Za-z0-9]/.test(String.fromCharCode(b)) && b < 128 ? String.fromCharCode(b) : '_')).join('').slice(0, 32)
  return k || 'modell'
}
// Vorbereitete Modelle mit Darstellungen des Luas (z. B. Zylinder/Tank): Version auf der Funke unbekannt, darum warnen
function extraWarnungOk() {
  if (!st.m || !st.m.vorbereitet) return true
  const b = beschreibung() || {}
  const ex = Object.keys(b.darstellungenExtra || {}).filter((d) => !d.startsWith('_'))
  const benutzt = [...new Set(st.projekt.ansichten.flatMap((a) => a.plaetze.map((p) => p.darstellung)).filter((d) => ex.includes(d)))]
  if (!benutzt.length) return true
  return confirm(t('extraWarnung').replace('{was}', benutzt.map(darstellungName).join(', ')).replace('{lua}', luaName(st.m.lua)).replace('{version}', b.luaVersion || t('neueVersion')))
}
// pfad: nur über die Steuerschnittstelle (ohne Dialog); beim Klick kommt hier das Ereignis an
async function exportDatei(pfad) {
  if (!st.m || !st.projekt) return
  if (typeof pfad !== 'string') pfad = undefined
  if (!extraWarnungOk()) return
  const r = await api.studio('exportDatei', { lua: st.m.lua, kennung: st.m.kennung, projekt: st.projekt, meta: meta(), pfad })
  if (r.abgebrochen) return
  $('schritte').textContent = ''
  if (!r.ok) { $('schritte').appendChild(el('li', { class: 'fehler', text: `${t('fehler')}: ${fehlerText(String(r.fehler).startsWith('pruefen|') ? r.fehler : 'u_' + r.fehler)}` })); return }
  const bb = beschreibung() || {}
  const neueWahl = NEUE_WAHL[st.m.lua] && bb.luaVersion && !versionKleinerUI(bb.luaVersion, NEUE_WAHL[st.m.lua])
  $('schritte').appendChild(el('li', { class: 'gut', text: neueWahl ? t('exportDateiGespeichert').replace('{pfad}', r.pfad) : t('exportDateiOk').replace('{pfad}', r.pfad).replace('{datei}', `${st.m.kennung}.${st.m.lua}.lua`) }))
  // Hinweise, damit die Datei auf der Funke wirkt (Issue #1): Name aus dem Modellnamen, Fenstergrössen, Modell wechseln
  const groessen = st.projekt.ansichten.filter((a) => a.plaetze.length).map((a) => `${a.breite} × ${a.hoehe}`).join(', ')
  // Luas ab der Version mit «Studio-Layout sicher finden» (R1–R4): Ort und Name sind nicht mehr zwingend, kurzer Hinweis
  if (neueWahl) {
    $('schritte').appendChild(el('li', { class: 'warn', text: t('exportDateiNeu') }))
    return
  }
  const modell = st.m.info && st.m.info.modell
  if (modell) $('schritte').appendChild(el('li', { class: 'warn', text: t('exportDateiName').replace('{modell}', modell).replace('{kennung}', kennungVon(modell)) }))
  if (groessen) $('schritte').appendChild(el('li', { class: 'warn', text: t('exportDateiGroessen').replace('{groessen}', groessen) }))
  if (r.symbole) $('schritte').appendChild(el('li', { class: 'warn', text: t('exportDateiSymbole') }))
}
$('exportDateiKnopf').addEventListener('click', exportDatei)

async function uebertragenZeigen() {
  const vorbereitet = st.m && st.m.vorbereitet
  $('exportZeile').hidden = !vorbereitet
  if (vorbereitet && !st.exportZiele) await exportZieleZeigen()
  const q = zielSpec()
  $('zielText').textContent = vorbereitet ? t('exportHinweis') : q ? `${t('ziel')}: ${q.text}` : ''
  $('uebertragenKnopf').disabled = !q
  $('uebertragenKnopf').textContent = t(vorbereitet ? 'exportKnopf' : 'uebertragenKnopf')
  $('schnelltestKnopf').hidden = vorbereitet || !q || q.art !== 'funke'
  $('schnelltestKnopf').nextElementSibling.hidden = $('schnelltestKnopf').hidden
  $('funkeUebernehmenZeile').hidden = true
  symboleAnkuendigen(q)
  $('funkeHinweis').textContent = ''
  st.funkeHinweisText = ''
  if (!q || !st.m || vorbereitet) return
  const r = await api.studio('funkeDatei', { spec: q, lua: st.m.lua, kennung: st.m.kennung })
  if (r.ok && (r.daten || r.kaputt)) {
    $('funkeUebernehmenZeile').hidden = !!r.kaputt
    const teile = []
    if (r.daten) {
      for (const [k, v] of Object.entries(r.daten.einstellungen || {})) teile.push(`${k} = ${v}`)
      for (const [k, g] of Object.entries(r.daten.grenzen || {})) teile.push(`${(wertInfo(k) || {}).text || k}: ${Object.entries(g).map(([a, b]) => `${a} ${b}`).join(', ')}`)
    }
    st.funkeHinweisText = r.kaputt ? t('funkeKaputt') : `${t('funkeAenderungen')}: ${teile.join(' · ')}`
    funkeHinweisZeigen()
  }
  if (st.m && st.m.doppelt) $('funkeHinweis').textContent = t('doppeltLang')
}

// Vor dem Übertragen ankündigen, welche nicht mehr benutzten Symbole auf der Funke gelöscht würden (Sendertest 21.11.2026).
// Gelöscht wird nur mit Haken, und nur Dateien, die hier angezeigt wurden.
async function symboleAnkuendigen(q) {
  const zeile = $('symboleLoeschenZeile')
  zeile.hidden = true
  $('symboleListe').hidden = true
  $('symboleListe').open = false
  $('symboleLoeschen').checked = false
  st.symboleAngekuendigt = []
  const modell = st.m
  if (!q || !st.m || q.art === 'ordner') return
  const r = await api.studio('symboleUnbenutzt', { spec: q, lua: st.m.lua, kennung: st.m.kennung, projekt: st.projekt, meta: meta() })
  if (!r || !r.ok || !Array.isArray(r.namen) || !r.namen.length || zielSpec() !== q) return
  if (st.m !== modell) return
  st.symboleAngekuendigt = r.namen
  $('symboleLoeschenText').textContent = t('symboleLoeschen').replace('{n}', r.namen.length)
  // alle Namen sichtbar (aufklappbar), gelöscht werden nur diese
  $('symboleNamen').textContent = r.namen.join(', ')
  $('symboleListe').hidden = false
  zeile.hidden = false
}

function funkeHinweisZeigen() {
  if (!st.funkeHinweisText) return
  const ohne = !$('funkeUebernehmenZeile').hidden && !$('funkeUebernehmen').checked
  $('funkeHinweis').textContent = st.funkeHinweisText + (ohne ? ` — ${t('funkeGiltWeiter')}` : '')
}
$('funkeUebernehmen').addEventListener('change', funkeHinweisZeigen)

api.beiSchritt(({ t: s, ok }) => {
  if (s === 'modellGeladen') st.modellNeuGeladen = true
  const li = el('li', { class: ok ? 'gut' : 'fehler', text: fehlerText(s.startsWith('pruefen|') ? s : 'u_' + s) })
  $('schritte').appendChild(li)
})

// Fehler, die die Funke still durch den Standard ersetzen würde (Format 6.3 und 6.5)
function wertePruefen() {
  const f = []
  for (const [k, g] of Object.entries(st.projekt.grenzen)) {
    const w = wertInfo(k)
    const std = w && w.def && w.def.grenzeRichtung
    if (std && g.richtung && g.richtung !== std) f.push(`${(w || {}).text || k}: ${t('fRichtungLua')}`)
    const richtung = g.richtung || std
    const hatStufe = typeof g.warnung === 'number' || typeof g.alarm === 'number'
    if (hatStufe && !g.aus && !richtung) f.push(`${(w || {}).text || k}: ${t('fRichtung')}`)
    if (typeof g.warnung === 'number' && typeof g.alarm === 'number' && richtung && !g.aus) {
      if ((richtung === 'unter' && !(g.alarm < g.warnung)) || (richtung === 'ueber' && !(g.alarm > g.warnung))) f.push(`${(w || {}).text || k}: ${t('fReihenfolge')}`)
    }
  }
  for (const [k, a] of Object.entries(st.projekt.werte)) if (typeof a.versatz === 'number' && Math.abs(a.versatz) > 100000) f.push(`${k}: ${t('fVersatz')}`)
  st.projekt.ansichten.forEach((a) => a.plaetze.forEach((p, i) => {
    const titel = `${a.breite}×${a.hoehe} #${i + 1}`
    if (typeof p.min === 'number' && typeof p.max === 'number' && !(p.max > p.min)) f.push(`${titel}: ${t('fBereich')}`)
    const s = p.stufen || []
    if (s.some((x) => typeof x.ab !== 'number' || !Number.isFinite(x.ab)) || s.some((x, n) => n > 0 && !(x.ab > s[n - 1].ab))) f.push(`${titel}: ${t('fStufen')}`)
  }))
  return f
}

async function uebertragenStart() {
  const ziel = zielSpec()
  if (!ziel || !st.projekt) return
  if (st.m.doppelt) { alert(t('doppeltLang')); return }
  if (!extraWarnungOk()) return
  const pr = await pruefen()
  if (!pr || !pr.ok) return
  if (pr.fehler.length) { alert(pr.fehler.join('\n')); return }
  // Nur Ansichten geändert, die die Funke gerade nicht zeigt? Dann sähe der User keine Änderung
  if (!st.m.vorbereitet && st.ansichtenStand) {
    const alt = JSON.parse(st.ansichtenStand)
    const geaendert = st.projekt.ansichten.filter((a) => JSON.stringify(a) !== JSON.stringify(alt.find((x) => x.breite === a.breite && x.hoehe === a.hoehe)))
    const fenster = fensterListe(st.m.info)
    st.geaendertGroessen = geaendert.map((a) => ({ breite: a.breite, hoehe: a.hoehe }))
    if (geaendert.length && fenster.length && !geaendert.some(aufFunke) &&
      !confirm(`${t('nichtSichtbarFrage')}\n${t('geaendert')}: ${geaendert.map((a) => `${a.breite} × ${a.hoehe}`).join(', ')}\n${t('aufFunke')}: ${fenster.map((f) => `${f.breite} × ${f.hoehe}`).join(', ')}`)) return
  }
  if (pr.wegfall.length && !confirm(pr.wegfall.map((x) => t('wegfall_' + x)).join('\n') + '\n\n' + t('trotzdemFrage'))) return
  const wf = wertePruefen()
  if (wf.length) { alert(`${t('fTitel')}\n\n${wf.join('\n')}`); return }
  const probleme = st.projekt.ansichten.map(anordnungPruefen).reduce((n, m) => n + m.size, 0)
  if (probleme && !confirm(t('anordnungFehlerFrage'))) return
  $('schritte').textContent = ''
  $('schnelltestListe').textContent = ''
  $('uebertragenKnopf').disabled = true
  // Info-Datei vor dem Übertragen merken (Schnelltest erkennt so eine noch nicht neu geschriebene)
  st.infoVorher = await api.studio('infoText', { spec: ziel, lua: st.m.lua, kennung: st.m.kennung })
  st.uebertragenSeit = Date.now()
  st.uebertragenFuer = st.m
  st.modellNeuGeladen = false
  // Masken der benutzten Symbole in der Kantenlänge dieses Displays (Format 2 §2 und §4)
  const symbole = {}
  try {
    const B = displayBreite(st.projekt.ansichten[0].breite)
    for (const x of pr.symbole) {
      symbole[`${x.name}_${x.px}.png`] = await symbolGrau(x.name, kante(x.px, B))
      for (const k of [12, 16]) symbole[`${x.name}_${k}.png`] = await symbolGrau(x.name, kante(k, B))   // kleine Masken (0.10.6)
    }
  } catch (e) { $('uebertragenKnopf').disabled = false; $('schritte').appendChild(el('li', { class: 'fehler', text: `${t('fehler')}: ${t('symbolRechnen')}` })); return }
  // Symbole löschen nur mit Haken und nur die angekündigten
  const symboleLoeschen = !$('symboleLoeschenZeile').hidden && $('symboleLoeschen').checked ? st.symboleAngekuendigt || [] : []
  const r = await api.studio('uebertragen', { spec: ziel, funkeName: funkeName(), lua: st.m.lua, kennung: st.m.kennung, projekt: st.projekt, meta: meta(), funkeUebernehmen: !$('funkeUebernehmenZeile').hidden && $('funkeUebernehmen').checked, symbole, symboleLoeschen })
  $('uebertragenKnopf').disabled = false
  if (!r.ok) $('schritte').appendChild(el('li', { class: 'fehler', text: `${t('fehler')}: ${fehlerText(r.fehler.startsWith('pruefen|') ? r.fehler : r.fehler.includes('|') ? r.fehler : 'u_' + r.fehler)}` }))
  else {
    if (r.projekt) st.projekt = { ...st.projekt, einstellungen: r.projekt.einstellungen, werte: r.projekt.werte, grenzen: r.projekt.grenzen, ansichten: r.projekt.ansichten }
    $('schritte').appendChild(el('li', { class: 'gut', text: t('uebertragenFertig') }))
    st.ansichtenStand = JSON.stringify(st.projekt.ansichten)
    if (!st.m.vorbereitet) modelleLaden().then(() => uebertragenZeigen())
    // Bei verbundener Funke nach dem Neuladen des Modells automatisch prüfen (das Lua schreibt seine Info-Datei neu)
    // nur wenn die Funke das Modell neu geladen hat; sonst liest das Lua die neue Datei erst nach einem Modellwechsel
    if (ziel.art === 'funke' && st.modellNeuGeladen) setTimeout(() => schnelltest(pr.format, 4), 6000)
    else if (ziel.art === 'funke') $('schnelltestListe').appendChild(el('li', { class: 'warn', text: t('schnelltestNachWechsel') }))
  }
}

// ---------- Funken-Schnelltest ----------
// wiederholen: so oft erneut lesen, solange das Lua die neue Datei noch nicht gelesen hat (Widget-Seite nicht sichtbar o. ä.)
async function schnelltest(format, wiederholen = 0) {
  const ziel = zielSpec()
  if (!ziel || !st.m || st.m.vorbereitet) return
  const m0 = st.m
  const ul = $('schnelltestListe')
  ul.textContent = ''
  ul.appendChild(el('li', { text: t('lade') }))
  // Vergleichsstand nur vom Übertragen dieses Modells; sonst Log der letzten 30 s
  const diesesModell = st.uebertragenFuer === st.m
  const r = await api.studio('schnelltest', { spec: ziel, lua: st.m.lua, kennung: st.m.kennung, format: format || (st.letztePruefung && st.letztePruefung.format),
    vorher: diesesModell ? st.infoVorher : null, seit: diesesModell ? st.uebertragenSeit : Date.now() - 30000,
    // geänderte Ansichten des letzten Übertragens; sonst alle gestalteten
    groessen: diesesModell && st.geaendertGroessen && st.geaendertGroessen.length ? st.geaendertGroessen
      : st.projekt.ansichten.filter((a) => a.plaetze && a.plaetze.length).map((a) => ({ breite: a.breite, hoehe: a.hoehe })) })
  ul.textContent = ''
  if (!r.ok && !r.punkte) { ul.appendChild(el('li', { class: 'fehler', text: fehlerText(r.fehler) })); return }
  for (const x of r.punkte) ul.appendChild(el('li', { class: x.stufe === 'gut' ? 'gut' : x.stufe === 'fehler' ? 'fehler' : 'warn', text: `${t('st_' + x.k)}${x.wert ? ': ' + x.wert : ''}` }))
  if (r.punkte.some((x) => x.k === 'infoAlt')) {
    if (wiederholen > 0) {
      ul.appendChild(el('li', { class: 'warn', text: t('st_wartetWidget').replace('{n}', wiederholen) }))
      setTimeout(() => { if (st.m === m0) schnelltest(format, wiederholen - 1) }, 8000)
    } else ul.appendChild(el('li', { class: 'warn', text: t('st_widgetZeigen') }))
  }
  ul.appendChild(el('li', { class: !r.ok ? 'fehler' : r.unsicher ? 'warn' : 'gut', text: t(!r.ok ? 'schnelltestFehler' : r.unsicher ? 'schnelltestUnsicher' : 'schnelltestOk') }))
}

// ---------- Reiter und Start ----------
function reiterWechseln(r) {
  document.querySelectorAll('[data-reiter]').forEach((b) => b.classList.toggle('aktiv', b.dataset.reiter === r))
  $('bereichLive').hidden = r !== 'live'
  $('bereichStudio').hidden = r !== 'studio'
  if (r === 'studio') { quellenSuchen(); if (st.projekt) flaecheZeigen() }
}

// Startseite (0.4.0): zwei Einstiege, solange kein Modell offen ist (CSS blendet sie aus, sobald der Editor sichtbar ist)
function startSeiteZeigen() {
  const funke = st.quellen.some((q) => q.art === 'funke')
  $('startFunkeText').textContent = t(funke ? 'startFunkeVerbunden' : 'startFunkeGetrennt')
  $('startFunke').textContent = t(funke ? 'startFunkeLaden' : 'startFunkeVerbinden')
  // Liste der vorbereiteten Modelle (anklickbar, höchstens 8)
  const box = $('startVorbereitete'); box.textContent = ''
  const v = st.vorbereitete || []
  if (v.length) {
    box.appendChild(el('span', { text: t('startVorbereitete').replace('{liste}', '') }))
    v.slice(0, 8).forEach((m, i) => {
      if (i) box.appendChild(document.createTextNode(' · '))
      box.appendChild(el('a', { href: '#', text: (m.info && m.info.modell) || m.kennung, onclick: (ev) => { ev.preventDefault(); vorbereitetOeffnen(m) } }))
    })
    if (v.length > 8) box.appendChild(document.createTextNode(` · +${v.length - 8}`))
  }
}
async function vorbereitetOeffnen(m) {
  await quellenSuchen()
  $('quelle').value = String(st.quellen.findIndex((q) => q.art === 'vorbereitet'))
  await modelleLaden()
  const x = st.modelle.find((y) => y.kennung === m.kennung && y.lua === m.lua && y.info.funke === m.info.funke)
  if (x) modellOeffnen(x)
}
async function startFunke() {
  if (!st.quellen.some((q) => q.art === 'funke')) { reiterWechseln('live'); $('ziel').focus(); return }
  $('quelle').value = String(st.quellen.findIndex((q) => q.art === 'funke'))
  await modelleLaden()
}
// «+ Vorbereiten» (oben und Startseite): Reiter Modelle, Quelle «Vorbereitet», Formular öffnen
async function vorbereitenStart() {
  if ($('bereichStudio').hidden) reiterWechseln('studio')
  await quellenSuchen()
  $('quelle').value = String(st.quellen.findIndex((q) => q.art === 'vorbereitet'))
  await modelleLaden()
  vorbereitenFormZeigen()
  // Formular links kurz hervorheben, damit man sieht, wo es aufgeht
  const f = $('vorbereitenBlock'); f.classList.remove('hervor'); void f.offsetWidth; f.classList.add('hervor')
}

function unterWechseln(u) {
  if (u === 'uebertragen') $('schritte').textContent = ''
  document.querySelectorAll('[data-unter]').forEach((b) => b.classList.toggle('aktiv', b.dataset.unter === u))
  $('unterAnordnung').hidden = u !== 'anordnung'
  $('unterGrenzen').hidden = u !== 'grenzen'
  $('unterUebertragen').hidden = u !== 'uebertragen'
  if (!st.projekt) return
  if (u === 'grenzen') grenzenZeigen()
  if (u === 'uebertragen') uebertragenZeigen()
  if (u === 'anordnung') flaecheZeigen()
}

document.querySelectorAll('[data-reiter]').forEach((b) => b.addEventListener('click', () => reiterWechseln(b.dataset.reiter)))
document.querySelectorAll('[data-unter]').forEach((b) => b.addEventListener('click', () => unterWechseln(b.dataset.unter)))
$('quelleSuchen').addEventListener('click', quellenSuchen)
$('startFunke').addEventListener('click', startFunke)
$('startVorbereiten').addEventListener('click', vorbereitenStart)
$('vorbereitenOben').addEventListener('click', vorbereitenStart)
$('modelleLaden').addEventListener('click', modelleLaden)
$('ansicht').addEventListener('change', (e) => { st.ansicht = Number(e.target.value); st.gewaehlt = -1; st.gewaehltDeko = -1; vergessen(); flaecheZeigen(); eigenschaftenZeigen(); abstandAnzeigen() })
$('platzNeu').addEventListener('click', platzNeu)
$('platzWeg').addEventListener('click', platzWeg)
$('anordnenKnopf').addEventListener('click', anordnenStart)
$('zentrieren').addEventListener('click', zentrieren)
$('rueckgaengig').addEventListener('click', rueckgaengig)
$('vorlageLaden').addEventListener('click', vorlageLaden)
$('vorlageSpeichern').addEventListener('click', vorlageSpeichern)
$('vonModellKopieren').addEventListener('click', vonModellKopieren)
$('vonVorbereitetKopieren').addEventListener('click', vonVorbereitetKopieren)
$('presetAnwenden').addEventListener('click', presetAnwenden)
$('symboleAus').addEventListener('change', (e) => { if (!st.projekt) return; if (e.target.checked) st.projekt.symboleAus = true; else delete st.projekt.symboleAus; allesZeigen(); geaendert() })
$('presetWahl').addEventListener('change', presetHinweis)
for (const art of ['symbol', 'text', 'linie', 'rahmen']) $('deko' + art[0].toUpperCase() + art.slice(1)).addEventListener('click', () => dekoNeu(art))

// Ohne Funke vorbereiten: Formular
function vorbereitenFormZeigen() {
  $('vorbereitenForm').hidden = false
  const g = $('vGruppe'); g.textContent = ''
  for (const [k, x] of Object.entries(st.gruppen)) g.appendChild(el('option', { value: k, text: x.name }))
  const l = $('vLua'); l.textContent = ''
  for (const [k, b] of Object.entries(st.luas)) l.appendChild(el('option', { value: k, text: `${luaName(k)} ${b.luaVersion || ''}` }))
  $('vName').value = ''; $('vKennung').textContent = ''; $('vMeldung').textContent = ''
  $('vName').focus()
}
$('vorbereitenAuf').addEventListener('click', vorbereitenFormZeigen)
$('vAbbrechen').addEventListener('click', () => { $('vorbereitenForm').hidden = true })
$('vName').addEventListener('input', () => { $('vKennung').textContent = $('vName').value.trim() ? kennungAus($('vName').value.trim()) : '' })
$('vAnlegen').addEventListener('click', async () => {
  const r = await api.studio('vorbereitetNeu', { gruppe: $('vGruppe').value, lua: $('vLua').value, modellname: $('vName').value })
  if (!r.ok) { $('vMeldung').textContent = fehlerText(r.fehler); return }
  $('vorbereitenForm').hidden = true
  await modelleLaden()
  const m = st.modelle.find((x) => x.kennung === r.modell.kennung && x.lua === r.modell.lua && x.info.funke === r.modell.info.funke)
  if (m) modellOeffnen(m)
})
$('uebertragenKnopf').addEventListener('click', uebertragenStart)
$('schnelltestKnopf').addEventListener('click', () => schnelltest())
window.addEventListener('resize', () => { if (st.projekt && !$('bereichStudio').hidden) flaecheZeigen() })
document.addEventListener('keydown', (ev) => {
  if ($('bereichStudio').hidden || (st.gewaehlt < 0 && st.gewaehltDeko < 0) || ['INPUT', 'SELECT'].includes(ev.target.tagName)) return
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); platzWeg() }
})
window.addEventListener('spracheGewechselt', () => { abstandAnzeigen(); if (st.projekt) allesZeigen(); if (!$('bereichStudio').hidden) quellenSuchen(); modellListeZeigen() })
api.studio('beschreibungen').then((b) => { st.luas = b })
api.studio('symbole').then((s) => { st.symbole = s })
api.studio('gruppen').then((g) => { st.gruppen = g })
