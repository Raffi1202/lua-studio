'use strict'
// Studio-Kern: Lua-Beschreibungen, Modelle der Funke (Info-Dateien), Ablage der Einstellungen am PC, Sicherungen
// und der Ablauf «Auf die Funke übertragen» (Format v1, Abschnitte 9 und 14).

const fs = require('fs')
const path = require('path')
const F = require('../format/format')
const Y = require('./symbole')
const W = require('./waechter')

// ---------- Beschreibungen der Luas (studio/beschreibung.json aus den Lua-Repos) ----------
function beschreibungenLaden(ordner) {
  const r = {}
  if (!fs.existsSync(ordner)) return r
  for (const n of fs.readdirSync(ordner)) {
    if (!n.endsWith('.json')) continue
    try {
      const b = JSON.parse(fs.readFileSync(path.join(ordner, n), 'utf8'))
      if (b && typeof b.lua === 'string' && Array.isArray(b.werte)) r[b.lua] = b
    } catch { /* kaputte Beschreibung überspringen */ }
  }
  return r
}

// ---------- Ablage am PC ----------
class Ablage {
  constructor(wurzel) {
    this.wurzel = wurzel
    fs.mkdirSync(wurzel, { recursive: true })
  }

  pfadProjekt(funke, lua, kennung) { return path.join(this.wurzel, 'modelle', sicher(funke), `${kennung}.${lua}.json`) }

  projektLesen(funke, lua, kennung) {
    const p = this.pfadProjekt(funke, lua, kennung)
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
  }

  projektSpeichern(funke, lua, kennung, daten) {
    const p = this.pfadProjekt(funke, lua, kennung)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(daten, null, 2))
    return p
  }

  projekte(funke) {
    const o = path.join(this.wurzel, 'modelle', sicher(funke))
    if (!fs.existsSync(o)) return []
    return fs.readdirSync(o).filter((n) => n.endsWith('.json')).map((n) => {
      const m = /^(.+)\.([a-z0-9_]+)\.json$/.exec(n)
      return m ? { kennung: m[1], lua: m[2] } : null
    }).filter(Boolean)
  }

  // Vorlagen je Lua (nur am PC, Abschnitt 8)
  vorlagen(lua) {
    const o = path.join(this.wurzel, 'vorlagen', lua)
    if (!fs.existsSync(o)) return []
    return fs.readdirSync(o).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5))
  }

  vorlageLesen(lua, name) { return JSON.parse(fs.readFileSync(path.join(this.wurzel, 'vorlagen', lua, `${sicher(name)}.json`), 'utf8')) }

  vorlageSpeichern(lua, name, daten) {
    const o = path.join(this.wurzel, 'vorlagen', lua)
    fs.mkdirSync(o, { recursive: true })
    const { einstellungen, werte, grenzen, ansichten } = daten
    fs.writeFileSync(path.join(o, `${sicher(name)}.json`), JSON.stringify({ einstellungen, werte, grenzen, ansichten }, null, 2))
  }

  // Sicherung einer Datei von der Funke, bevor sie ersetzt oder gelöscht wird
  sichern(funke, name, daten) {
    const jetzt = new Date()
    const z = (n) => String(n).padStart(2, '0')
    const stempel = `${jetzt.getFullYear()}-${z(jetzt.getMonth() + 1)}-${z(jetzt.getDate())} ${z(jetzt.getHours())}${z(jetzt.getMinutes())}${z(jetzt.getSeconds())}`
    const o = path.join(this.wurzel, 'sicherungen', sicher(funke), stempel)
    fs.mkdirSync(o, { recursive: true })
    fs.writeFileSync(path.join(o, name), daten)
    return path.join(o, name)
  }
}

// Umbenennung der Luas auf Englisch (21.11.2026): alter Schlüssel -> neuer. Gilt nur, wenn das Studio den neuen kennt
// und den alten nicht mehr (Heli zieht später nach).
const ALIAS = { elektro: 'electric', segler: 'glider', motoren_ecu: 'gas_ecu', motoren_vergaser: 'gas_carb', helirf: 'heli' }
function aliasAktiv(bekannt) {
  const b = new Set(bekannt || [])
  return Object.fromEntries(Object.entries(ALIAS).filter(([alt, neu]) => b.has(neu) && !b.has(alt)))
}

// Projekte und Vorlagen am PC einmal auf die neuen Namen umziehen; die alte Datei kommt nach «vor-umbenennung»
// (nichts wird gelöscht). Rückgabe: Liste der umgezogenen Dateien.
function ablageUmziehen(wurzel, bekannt) {
  const alias = aliasAktiv(bekannt)
  const umgezogen = []
  if (!Object.keys(alias).length) return umgezogen
  const sicherung = path.join(wurzel, 'vor-umbenennung')
  const weg = (q, rel) => { const z = path.join(sicherung, rel); fs.mkdirSync(path.dirname(z), { recursive: true }); fs.renameSync(q, z) }
  const modelle = path.join(wurzel, 'modelle')
  for (const funke of fs.existsSync(modelle) ? fs.readdirSync(modelle) : []) {
    const o = path.join(modelle, funke)
    if (!fs.statSync(o).isDirectory()) continue
    for (const n of fs.readdirSync(o)) {
      const m = /^(.+)\.([a-z0-9_]+)\.json$/.exec(n)
      if (!m || !alias[m[2]]) continue
      const ziel = path.join(o, `${m[1]}.${alias[m[2]]}.json`)
      if (!fs.existsSync(ziel)) {
        let d = null
        try { d = JSON.parse(fs.readFileSync(path.join(o, n), 'utf8')) } catch { continue }
        if (d && d.info && d.info.lua === m[2]) d.info.lua = alias[m[2]]
        fs.writeFileSync(ziel, JSON.stringify(d, null, 2))
        umgezogen.push(`${funke}/${n}`)
      }
      weg(path.join(o, n), path.join('modelle', funke, n))
    }
  }
  const vorlagen = path.join(wurzel, 'vorlagen')
  for (const [alt, neu] of Object.entries(alias)) {
    const a = path.join(vorlagen, alt)
    if (!fs.existsSync(a)) continue
    const z = path.join(vorlagen, neu)
    fs.mkdirSync(z, { recursive: true })
    for (const n of fs.readdirSync(a)) if (!fs.existsSync(path.join(z, n))) { fs.copyFileSync(path.join(a, n), path.join(z, n)); umgezogen.push(`vorlagen/${alt}/${n}`) }
    weg(a, path.join('vorlagen', alt))
  }
  return umgezogen
}

function sicher(t) { return String(t || 'unbekannt').replace(/[^A-Za-z0-9 _.-]/g, '_').slice(0, 60) }

// ---------- Modelle auf dem Ziel (Info-Dateien, Abschnitt 14) ----------
async function modelleLesen(ziel) {
  const liste = await ziel.liste()
  const modelle = []
  for (const e of liste) {
    const m = /^(.+)\.([a-z0-9_]+)\.info\.json$/.exec(e.name)
    if (!m) continue
    const roh = await ziel.lesen(e.name)
    let info = null
    try { info = JSON.parse(roh.toString('utf8')) } catch { /* kaputt */ }
    modelle.push({
      kennung: m[1], lua: m[2], info,
      studioDatei: liste.some((x) => x.name === `${m[1]}.${m[2]}.lua`),
      // Studio-Datei unter dem alten Namen (vor der Umbenennung); das neue Lua liest sie, bis eine neue geschrieben ist
      alteStudioDatei: (Object.entries(ALIAS).find(([alt, neu]) => neu === m[2] && liste.some((x) => x.name === `${m[1]}.${alt}.lua`)) || [])[0] ? `${m[1]}.${Object.entries(ALIAS).find(([alt, neu]) => neu === m[2] && liste.some((x) => x.name === `${m[1]}.${alt}.lua`))[0]}.lua` : null,
      funkeDatei: liste.some((x) => x.name === `${m[1]}.${m[2]}.funke.lua`),
    })
  }
  // Format 2.1: Die SD-Karte unterscheidet nicht zwischen Gross- und Kleinschreibung
  for (const m of modelle) m.doppelt = modelle.some((x) => x !== m && x.lua === m.lua && x.kennung.toLowerCase() === m.kennung.toLowerCase())
  return modelle
}

// Neues Projekt aus der Beschreibung (Standardbelegung) und den Fenstergrössen der Info-Datei
function neuesProjekt(beschreibung, info) {
  // Start mit der Vorlage «Original», wenn das Studio sie für dieses Lua kennt (ab 0.7.0; «Leer anfangen» gibt es nicht mehr)
  const orig = require('./original').original(beschreibung)
  const standard = (orig && orig.ansichten) || (beschreibung.standard && beschreibung.standard.ansichten) || []
  const einstellungen = {}
  for (const e of beschreibung.einstellungen || []) einstellungen[e.s] = e.werk
  let ansichten = standard.map((a) => JSON.parse(JSON.stringify(a)))
  const fenster = (info && Array.isArray(info.fenster)) ? info.fenster.filter((f) => f && typeof f === 'object') : []
  // Vorbereitet ohne Funke: nur Ansichten in den Grössen der gewählten Displaygruppe
  if (info && info.vorbereitet) ansichten = ansichten.filter((a) => fenster.some((f) => f.breite === a.breite && f.hoehe === a.hoehe))
  for (const f of fenster) {
    if (!Number.isInteger(f.breite) || !Number.isInteger(f.hoehe) || f.breite < 100 || f.breite > 1024 || f.hoehe < 100 || f.hoehe > 1024) continue
    if (!ansichten.some((a) => a.breite === f.breite && a.hoehe === f.hoehe)) ansichten.push({ breite: f.breite, hoehe: f.hoehe, plaetze: [] })
  }
  // Grössen, in denen das Lua auf der Funke läuft, zuerst behalten (sonst fiele z. B. 640 × 360 hinter zwei Standardansichten weg)
  const passt = (a) => fenster.some((f) => f && f.breite === a.breite && f.hoehe === a.hoehe)
  ansichten = ansichten.filter(passt).concat(ansichten.filter((a) => !passt(a))).slice(0, 2)
  const grenzen = JSON.parse(JSON.stringify((beschreibung.standard && beschreibung.standard.grenzen) || {}))
  return { einstellungen, werte: {}, grenzen, ansichten }
}

// Daten für die Studio-Datei (ohne Felder des Studios), mit Infos zu Studio, Funke und Modell.
// Format 2 nur, wenn das Lua es kann (meta.formate) und die Gestaltung es braucht (Format 2 §6); sonst Format 1 ohne die neuen Felder.
// Rückgabe { daten, wegfall: [Gründe], verworfen: [Gründe] }
function dateiDatenMitInfo(projekt, meta) {
  let ansichten = (projekt.ansichten || []).filter((a) => a.plaetze && a.plaetze.length > 0).slice(0, 2)
  // ab 0.11.0 keine Symbole mehr (Entscheid User 22.11.): nie Symbole schreiben, keine Symbolbilder
  ansichten = ansichten.map(ohneSymbole)
  const kann2 = Array.isArray(meta.formate) && meta.formate.includes(2)
  const braucht2 = Y.benutztFormat2(ansichten)
  const wegfall = []
  const verworfen = []
  let format = 1
  if (braucht2 && kann2) {
    format = 2
    ansichten = ansichten.map((a) => {
      const deko = []
      for (const d of a.deko || []) {
        const g = Y.dekoPruefen(d, a)
        if (g) { verworfen.push(`deko:${g}`); continue }
        if (deko.length >= Y.MAX_DEKO) { verworfen.push('deko:anzahl'); continue }
        deko.push(dekoSauber(d))
      }
      const plaetze = a.plaetze.map((p) => {
        const q = platzSauber(p, verworfen, meta.extra)
        if (q.symbol && (!Y.imKatalog(q.symbol) || Y.symbolPx(q) < Y.imKatalog(q.symbol).minPx)) { verworfen.push(`symbol:${q.symbol}`); delete q.symbol }
        if (!q.symbol) delete q.symbolPx
        else if (q.symbolPx === undefined || q.symbolPx === 24) delete q.symbolPx
        if (q.einheitZeigen === true) delete q.einheitZeigen
        return q
      })
      const r = { ...a, plaetze }
      if (deko.length) r.deko = deko; else delete r.deko
      return r
    })
  } else {
    if (braucht2) wegfall.push(kann2 ? 'format2' : 'luaKannNicht2')
    ansichten = Y.ohneFormat2(ansichten)
  }
  // Darstellungen, die das Lua nicht kennt (z. B. «zylinder» ohne darstellungenExtra), in jedem Format weglassen
  ansichten = ansichten.map((a) => ({ ...a, plaetze: (a.plaetze || []).map((p) => {
    if (p.darstellung === undefined || DARSTELLUNGEN.includes(p.darstellung) || (meta.extra || []).includes(p.darstellung)) return p
    verworfen.push('darstellung'); const q = { ...p }; delete q.darstellung; return q
  }).map((p, i, alle) => {
    // Darstellungen des Luas höchstens einmal je Ansicht: weitere fallen auf den Standard zurück
    if (DARSTELLUNGEN.includes(p.darstellung) || p.darstellung === undefined || alle.findIndex((x) => x.darstellung === p.darstellung) === i) return p
    verworfen.push('darstellung:einmal'); const q = { ...p }; delete q.darstellung; return q
  }) }))
  const daten = {
    format,
    studio: meta.studioVersion,
    funke: meta.funke,
    modell: meta.modell,
    luaVersion: meta.luaVersion,
    einstellungen: einstellungenSchreiben(projekt.einstellungen, meta.werk),
    werte: projekt.werte,
    grenzen: grenzenSchreiben(projekt.grenzen, meta.immerAlarm),
  }
  if (format === 2) {
    const sy = Y.symbolListe(ansichten)
    if (Y.grosseSymbole(sy).length > Y.MAX_SYMBOLE) verworfen.push('symbole:anzahl')
    if (sy.length) daten.symbole = sy
  }
  // Ansichten ohne Kästchen nicht schreiben: Dann zeichnet das Lua für diese Grösse seine eingebaute Belegung
  daten.ansichten = ansichten
  return { daten, wegfall, verworfen }
}
// Einstellungen zum Schreiben (ab 0.10.2): nur Werte, die vom Werkwert des Luas abweichen. Fehlt ein Eintrag, nimmt das Lua
// den Werkwert; so bleiben auch Luas mit vielen Einstellungen (Glider 0.6.0: 51) unter der Listengrenze von 48 (Format 2 §7.2).
// werk: { schlüssel: werkwert } aus beschreibung.json; ohne werk bleibt alles wie bisher.
function einstellungenSchreiben(einstellungen, werk) {
  if (!werk) return einstellungen
  const r = {}
  for (const [k, v] of Object.entries(einstellungen || {})) if (!(k in werk) || JSON.stringify(werk[k]) !== JSON.stringify(v)) r[k] = v
  return r
}
// Grenzen zum Schreiben: «auch bei Motor aus» (Format 2 §3.5) nur als false, fehlt = true (spart Platz)
// immer = Wert-Schlüssel mit immerAlarm (Abschaltgründe): dort hat das Feld keine Wirkung und wird nie geschrieben
function grenzenSchreiben(grenzen, immer = []) {
  const r = {}
  for (const [k, g] of Object.entries(grenzen || {})) {
    if (!g || typeof g !== 'object') { r[k] = g; continue }
    const q = { ...g }
    if (q.beiMotorAus !== false || (immer || []).includes(k)) delete q.beiMotorAus
    r[k] = q
  }
  return r
}
// Farbe nach v1 §6.3: Liste aus 3 ganzen Zahlen 0…255
function farbeGut(f) { return Array.isArray(f) && f.length === 3 && f.every((v) => Number.isInteger(v) && v >= 0 && v <= 255) }
const FARBFELDER = ['farbe', 'farbeWarn', 'farbeAlarm', 'hintergrund']
const DARSTELLUNGEN = ['zahl', 'ring', 'balken_w', 'balken_s', 'kurve', 'status']
// Felder eines Platzes, die das Studio sonst ungeprüft schriebe (aus Vorlagen): ungültige weg, Grund in «verworfen»
// Ab diesen Versionen findet das Lua sein Studio-Layout an allen Orten und bietet «Studio layout» im Widget-Menü (R1–R4)
const NEUE_WAHL = { electric: '0.7.0', heli: '1.14.0', jet: '0.5.0', glider: '0.6.0', gas_ecu: '1.12.0', gas_carb: '0.12.0', dlg: '0.2.0' }
// Darstellungen des Luas aus beschreibung.json «darstellungenExtra» (Schlüssel mit _ sind Hinweise, keine Darstellung)
// luaVersion: Version des Luas auf der Funke (Info-Datei). Ist sie älter als die mitgelieferte Beschreibung, die die
// Darstellungen einführt, gibt es sie nicht (ein älteres Lua kennt sie nicht).
function versionKleiner(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) }
  return false
}
// Version, mit der ein Lua seine Darstellungen eingeführt hat (die Beschreibung nennt sie nicht)
const EXTRA_AB = { gas_ecu: '1.11.0', gas_carb: '0.11.0' }
function extraDarstellungen(b, luaVersion) {
  if (!b || !b.darstellungenExtra) return []
  // ohne Version der Funke (alte Info-Datei) keine Darstellungen des Luas; vorbereitete Modelle tragen die Version der Beschreibung
  const ab = EXTRA_AB[b.lua] || b.luaVersion
  if (!luaVersion || (ab && versionKleiner(luaVersion, ab))) return []
  return Object.keys(b.darstellungenExtra).filter((d) => !d.startsWith('_'))
}
// extra: zusätzliche Darstellungen des Luas (beschreibung.json «darstellungenExtra», z. B. Gas Engine «zylinder», «tank»)
// ab 0.11.0: Symbole (Platzsymbol, Symbol-Schmuck) gibt es nicht mehr; das übrige Layout bleibt
function ohneSymbole(a) {
  return { ...a, plaetze: (a.plaetze || []).map(({ symbol: _s, symbolPx: _p, ...p }) => p), ...(a.deko ? { deko: a.deko.filter((d) => d.art !== 'symbol') } : {}) }
}
function symboleIn(projekt) { return (projekt && projekt.ansichten || []).some((a) => (a.plaetze || []).some((p) => p.symbol !== undefined) || (a.deko || []).some((d) => d.art === 'symbol')) }
function platzSauber(p, verworfen, extra = []) {
  const q = { ...p }
  delete q.symbol; delete q.symbolPx   // ab 0.11.0 keine Symbole
  for (const k of FARBFELDER) if (q[k] !== undefined && !farbeGut(q[k])) { verworfen.push(`${k}`); delete q[k] }
  if (q.darstellung !== undefined && !DARSTELLUNGEN.includes(q.darstellung) && !(extra || []).includes(q.darstellung)) { verworfen.push('darstellung'); delete q.darstellung }
  if (q.symbolPx !== undefined && !Y.PX_WAHL.includes(q.symbolPx)) { verworfen.push('symbolPx'); delete q.symbolPx }
  // 0.10.4: «fett» (grosse Einheit oben links) gibt es nicht mehr; die Luas (Electric 0.7.3 ff.) zeigen sie wie «am Wert»
  if (q.einheitZeigen === 'fett') delete q.einheitZeigen
  if (q.einheitZeigen !== undefined && ![true, false].includes(q.einheitZeigen)) { verworfen.push('einheitZeigen'); delete q.einheitZeigen }
  return q
}
function dekoSauber(d) {
  const r = { art: d.art, x: d.x, y: d.y }
  if (d.art === 'symbol') { r.name = d.name; r.px = d.px } else { r.b = d.b; r.h = d.h }
  if (d.art === 'text') r.text = d.text
  if (farbeGut(d.farbe)) r.farbe = d.farbe
  return r
}
function dateiDaten(projekt, meta) { return dateiDatenMitInfo(projekt, meta).daten }

// Studio-Datei bauen, Grössenwächter dazu (Rot sperrt)
function bauenMitWaechter(projekt, meta) {
  const info = dateiDatenMitInfo(projekt, meta)
  const gebaut = F.bauen(info.daten)
  const waechter = W.pruefen(gebaut.text, info.daten)
  const fehler = [...gebaut.fehler]
  for (const r of waechter.zeilen) if (r.ampel === 'rot' && !['datei', 'elemente', 'tabellen'].includes(r.k)) fehler.push(`Grössenwächter rot: ${r.k} ${r.anzeige}`)
  return { ...gebaut, fehler, waechter, daten: info.daten, wegfall: info.wegfall, verworfen: info.verworfen }
}

// ---------- Presets (Format 2 §8) ----------
// Vorlagen aus beschreibung.json, geprüft; fehlt «vorlagen», gilt standard.ansichten als Preset «standard»
function presets(beschreibung) {
  const r = []
  const ansichtGut = (a) => a && Number.isInteger(a.breite) && Number.isInteger(a.hoehe) && a.breite >= 100 && a.breite <= 1024 && a.hoehe >= 100 && a.hoehe <= 1024 && Array.isArray(a.plaetze)
  let verworfen = []
  const sauber = (ans) => (ans || []).filter(ansichtGut).slice(0, 8).map((a) => {
    const gut = a.plaetze.filter((p) => p && [p.x, p.y, p.b, p.h].every(Number.isInteger) && typeof p.w === 'string' &&
      p.x >= 0 && p.y >= 0 && p.x + p.b <= a.breite && p.y + p.h <= a.hoehe)
    if (gut.length !== a.plaetze.length || gut.length > 16) verworfen.push('platz')
    const plaetze = gut.slice(0, 16).map((p) => {
      const q = platzSauber(JSON.parse(JSON.stringify(p)), verworfen, extraDarstellungen(beschreibung, beschreibung && beschreibung.luaVersion))
      if (q.symbol !== undefined && (!Y.imKatalog(q.symbol) || (q.symbolPx || 24) < Y.imKatalog(q.symbol).minPx)) { verworfen.push('symbol'); delete q.symbol; delete q.symbolPx }
      return q
    })
    const dk = (a.deko || []).filter((d) => d.art !== 'symbol' && !Y.dekoPruefen(d, a))
    if (dk.length !== (a.deko || []).length || dk.length > Y.MAX_DEKO) verworfen.push('deko')
    const deko = dk.slice(0, Y.MAX_DEKO).map(dekoSauber)
    const x = { breite: a.breite, hoehe: a.hoehe, plaetze }
    if (deko.length) x.deko = deko
    return x
  })
  for (const v of (beschreibung && Array.isArray(beschreibung.vorlagen) ? beschreibung.vorlagen : [])) {
    if (!v || !Y.NAME.test(String(v.s)) || !v.name || !Array.isArray(v.ansichten)) continue
    verworfen = []
    const ansichten = sauber(v.ansichten)
    if (!ansichten.length) continue
    r.push({ s: v.s, name: v.name, hinweis: v.hinweis, ansichten, verworfen: [...new Set(verworfen)] })
  }
  // Vorlage «Original» (wie die eingebaute Anzeige des Luas) zuerst, falls das Studio sie für dieses Lua kennt
  const varianten = require('./original').originalVarianten(beschreibung)
  varianten.slice().reverse().forEach((orig) => {
    verworfen = []
    const ansichten = sauber(orig.ansichten)
    if (ansichten.length) r.unshift({ s: orig.s, name: orig.name, hinweis: orig.hinweis, ansichten, verworfen: [...new Set(verworfen)] })
  })
  if (!r.some((x) => !x.s.startsWith('original')) && beschreibung && beschreibung.standard && Array.isArray(beschreibung.standard.ansichten)) {
    verworfen = []
    const ansichten = sauber(beschreibung.standard.ansichten)
    if (ansichten.length) r.push({ s: 'standard', name: { de: 'Standard des Luas', en: 'Lua default' }, ansichten, verworfen: [...new Set(verworfen)] })
  }
  return r
}

// Preset auf ein Projekt legen: nur die Ansichten. Die Grössen bestimmt das Modell (Fenster aus der Info-Datei, sonst die
// bisherigen Ansichten): Preset-Ansichten anderer Grösse fallen weg, für Grössen ohne Preset-Ansicht gibt es eine leere.
function presetAnwenden(projekt, preset, fenster) {
  const p = JSON.parse(JSON.stringify(projekt))
  const quelle = JSON.parse(JSON.stringify(preset ? preset.ansichten : []))
  const groessen = (fenster && fenster.length ? fenster : (projekt.ansichten || [])).map((f) => ({ breite: f.breite, hoehe: f.hoehe }))
  if (!groessen.length) { p.ansichten = quelle.slice(0, 2); return p }
  p.ansichten = groessen.slice(0, 2).map((g) => quelle.find((a) => a.breite === g.breite && a.hoehe === g.hoehe) || { ...g, plaetze: [] })
  return p
}

// ---------- Ohne Funke vorbereiten (Konzept Abschnitt 5) ----------
// Displaygruppen mit den Fenstergrössen aus «Widget-Zonen gemessen»
const GRUPPEN = {
  L: { name: 'X18RS / X20S / X20PRO', fenster: [{ breite: 784, hoehe: 316 }, { breite: 800, hoehe: 480 }] },
  M: { name: 'X14', fenster: [{ breite: 630, hoehe: 258 }, { breite: 640, hoehe: 360 }] },
  S: { name: 'X18 / Twin X Lite', fenster: [{ breite: 472, hoehe: 210 }, { breite: 480, hoehe: 320 }] },
}
const VORBEREITET = 'Vorbereitet '
function gruppeVonFenster(fenster) {
  for (const [k, g] of Object.entries(GRUPPEN)) if ((fenster || []).some((f) => g.fenster.some((x) => x.breite === f.breite && x.hoehe === f.hoehe))) return k
  return null
}
// Info wie von der Funke, aber vom Studio erfunden (Format 2 §6: formate und luaVersion aus beschreibung.json)
function vorbereitetInfo(gruppe, beschreibung, modellname) {
  const g = GRUPPEN[gruppe]
  if (!g) throw new Error('gruppe')
  const name = String(modellname || '').trim()
  if (!name || Buffer.byteLength(name, 'utf8') > 64) throw new Error('modellname')
  return {
    format: 1, lua: beschreibung.lua, luaVersion: beschreibung.luaVersion, formate: Array.isArray(beschreibung.formate) ? beschreibung.formate : [1],
    modell: name, kennung: F.kennung(name), funke: VORBEREITET + gruppe, fenster: g.fenster, sensoren: [], vorbereitet: true,
  }
}

// Änderungen aus .funke.lua je Feld über das Projekt legen (Abschnitt 9)
// werkGrenzen: standard.grenzen aus der Beschreibung (fehlt ein Eintrag, beginnt er mit den Werkgrenzen, Format 6.5)
function funkeAenderungenUebernehmen(projekt, funkeDaten, werkGrenzen = {}) {
  const p = JSON.parse(JSON.stringify(projekt))
  if (funkeDaten && typeof funkeDaten === 'object') {
    Object.assign(p.einstellungen, funkeDaten.einstellungen || {})
    for (const [k, g] of Object.entries(funkeDaten.grenzen || {})) {
      if (!g || typeof g !== 'object') continue
      const neu = { ...(p.grenzen[k] || werkGrenzen[k] || {}) }
      // nur gültige Felder übernehmen (Format 6.5); false = Stufe aus bleibt stehen
      for (const f of ['warnung', 'alarm']) if (g[f] === false || (typeof g[f] === 'number' && Number.isFinite(g[f]))) neu[f] = g[f]
      for (const f of ['ansage', 'vibration', 'aus', 'beiMotorAus']) if (typeof g[f] === 'boolean') neu[f] = g[f]
      if (g.richtung === 'unter' || g.richtung === 'ueber') neu.richtung = g.richtung
      p.grenzen[k] = neu
    }
  }
  return p
}

// ---------- Symbol-Dateien (Format 2 §4) ----------
// symbolDateien: { 'akku_48.png': Buffer } von der Oberfläche. Schreibt nur, was die Datei nennt und anders ist als auf dem Ziel.
async function symboleSchreiben(ziel, daten, symbolDateien, melde) {
  const liste = Y.dateiListe(daten)   // ab 0.10.6 mit den kleinen Masken 12/16 der Platzsymbole
  if (!liste.length) return 0
  if (typeof ziel.symbolSchreiben !== 'function') throw new Error('symboleZiel')
  const B = Y.displayBreite(daten.ansichten[0].breite)
  // Erst alles prüfen, dann schreiben: bei einem Fehler bleibt das Ziel unverändert
  const plan = []
  for (const { name, px } of liste) {
    const datei = `${name}_${px}.png`
    if (!Y.DATEI.test(datei)) melde(`symbolUngueltig|${datei}`, false)
    const buf = symbolDateien && symbolDateien[datei]
    const grund = Y.pngPruefen(Buffer.isBuffer(buf) ? buf : null, Y.kante(px, B))
    if (grund) melde(`symbolUngueltig|${datei} (${grund})`, false)
    const alt = await ziel.symbolLesen(datei)
    if (alt && alt.equals(buf)) continue
    // Gleicher Name, andere Kante: gehört zu einer anderen Displaygruppe (Datei eines anderen Modells), nicht überschreiben
    if (alt && alt.length >= 24 && alt.toString('ascii', 12, 16) === 'IHDR' && alt.readUInt32BE(16) !== Y.kante(px, B)) melde(`symbolAndereGruppe|${datei}`, false)
    plan.push({ datei, buf })
  }
  let geschrieben = 0
  for (const { datei, buf } of plan) {
    await ziel.symbolSchreiben(datei, buf)
    const zurueck = await ziel.symbolLesen(datei)
    if (!zurueck || !zurueck.equals(buf)) melde(`symbolVergleich|${datei}`, false)
    geschrieben++
  }
  return geschrieben
}

// Symbol-Dateien, die nach dem Schreiben keine Studio-Datei im Ordner mehr nennt. ersetzt = Name der Studio-Datei, die gleich
// neu geschrieben wird (ihre alten Symbole zählen nicht), neu = Symbole der neuen Datei. Ist eine Studio-Datei nicht lesbar,
// gilt nichts als unbenutzt (uebersprungen).
async function symboleUnbenutzt(ziel, ersetzt = null, neu = []) {
  if (typeof ziel.symbolListe !== 'function') return { namen: [], uebersprungen: false }
  // ab 0.10.6: zu jedem benutzten Symbol gehören auch seine kleinen Masken name_12/name_16
  const benutzt = new Set()
  const nutze = (x) => { benutzt.add(`${x.name}_${x.px}.png`); for (const k of Y.PX_KLEIN) benutzt.add(`${x.name}_${k}.png`) }
  for (const x of neu || []) nutze(x)
  for (const e of await ziel.liste()) {
    if (!/^.+\.[a-z0-9_]+\.lua$/.test(e.name) || e.name.endsWith('.funke.lua')) continue
    if (ersetzt && e.name.toLowerCase() === ersetzt.toLowerCase()) continue
    let d
    try { d = F.lesen((await ziel.lesen(e.name)).toString('utf8')) } catch { return { namen: [], uebersprungen: true } }
    const sy = d && d.symbole
    if (sy && typeof sy === 'object') for (const x of Object.values(sy)) if (x && typeof x === 'object') nutze(x)
  }
  const namen = (await ziel.symbolListe()).map((f) => f.name).filter((n) => Y.DATEI.test(n) && !benutzt.has(n))
  return { namen, uebersprungen: false }
}

// Unbenutzte Symbol-Dateien löschen, aber nur die, die der User vor dem Übertragen gesehen und freigegeben hat (erlaubt).
// Rückgabe: geloescht, bleiben (weiter unbenutzt, nicht freigegeben), uebersprungen
async function symboleAufraeumen(ziel, erlaubt = []) {
  const u = await symboleUnbenutzt(ziel)
  if (u.uebersprungen) return { geloescht: [], bleiben: 0, uebersprungen: true }
  const ok = new Set(erlaubt || [])
  const geloescht = []
  for (const n of u.namen) {
    if (!ok.has(n)) continue
    await ziel.symbolLoeschen(n)
    geloescht.push(n)
  }
  return { geloescht, bleiben: u.namen.length - geloescht.length, uebersprungen: false }
}

// ---------- Übertragen (Abschnitt 9 und Bauplan Etappe B) ----------
// schritt(text, ok) meldet jeden Schritt an die Oberfläche. Rückgabe { ok, schritte, sicherung }
async function uebertragen({ ziel, ablage, funkeName, kennung, lua, projekt, meta, funkeUebernehmen, schritt, werkGrenzen, symbolDateien, symboleLoeschen = [] }) {
  const name = `${kennung}.${lua}.lua`
  const nameFunke = `${kennung}.${lua}.funke.lua`
  const melde = (t, ok = true) => { schritt && schritt(t, ok); if (!ok) throw new Error(t) }

  // 0. Gleiche Kennung in anderer Schreibweise (SD-Karte kennt kein Gross/Klein, Format v1 §2.1): nie fremde Datei überschreiben
  const vorhanden = await ziel.liste()
  if (vorhanden.some((e) => e.name !== name && e.name.toLowerCase() === name.toLowerCase())) melde('kennungKonflikt', false)

  // Ohne meta.formate (z. B. aus einem Skript): aus der Info-Datei des Modells auf dem Ziel ableiten (Format v1 §14)
  if (!Array.isArray(meta.formate)) {
    try {
      const roh = await ziel.lesen(`${kennung}.${lua}.info.json`)
      const i = roh ? JSON.parse(roh.toString('utf8')) : null
      if (i && Array.isArray(i.formate)) meta = { ...meta, formate: i.formate }
    } catch { /* ohne Info-Datei: Format 1 */ }
  }

  // 1. Datei bauen und prüfen wie die Funke, dazu der Grössenwächter
  let daten = projekt
  let funkeKaputt = false
  const funkeAlt = await ziel.lesen(nameFunke)
  if (funkeAlt && funkeUebernehmen) {
    try { daten = funkeAenderungenUebernehmen(projekt, F.lesen(funkeAlt.toString('utf8')), werkGrenzen) } catch { funkeKaputt = true }
  }
  const gebaut = bauenMitWaechter(daten, meta)
  if (gebaut.fehler.length) melde(`pruefen|${gebaut.fehler.join('; ')}`, false)
  melde(`gebaut|${gebaut.zaehlung.byte} Byte, ${gebaut.zaehlung.elemente} Elemente, Format ${gebaut.daten.format}`)
  if (gebaut.wegfall.length) melde(`wegfall|${gebaut.wegfall.join(', ')}`)

  // 2. Alte Dateien sichern (ziel.lesen wirft, wenn die Datei da ist, aber nicht gelesen werden kann)
  const alt = await ziel.lesen(name)
  let sicherung = null
  if (alt) sicherung = ablage.sichern(funkeName, name, alt)
  if (funkeAlt) ablage.sichern(funkeName, nameFunke, funkeAlt)
  melde(alt || funkeAlt ? `gesichert|${sicherung || ''}` : 'nichtsZuSichern')

  // 3. Symbole zuerst (die Studio-Datei nennt sie), dann die Studio-Datei: schreiben, zurücklesen, vergleichen
  if (gebaut.daten.format === 2 && (gebaut.daten.symbole || []).length) {
    const n = await symboleSchreiben(ziel, gebaut.daten, symbolDateien, melde)
    melde(`symbole|${n}/${Y.dateiListe(gebaut.daten).length}`)
  }
  const neu = Buffer.from(gebaut.text, 'utf8')
  try {
    await ziel.schreiben(name, neu)
  } catch (e) {
    // Verbindung weg mitten im Schreiben: Die Funke zeigt dann «Studio-Datei kaputt – Standard» (Werkgrenzen gelten)
    melde(`schreibenAbgebrochen|${sicherung || '-'}`, false)
  }
  let zurueck = null
  try { zurueck = await ziel.lesen(name) } catch { zurueck = null }
  if (!zurueck || !zurueck.equals(neu)) {
    try { if (alt) await ziel.schreiben(name, alt); else await ziel.loeschen(name) } catch { /* Verbindung weg */ }
    melde(alt ? 'vergleichFehler' : 'vergleichFehlerGeloescht', false)
  }
  melde('geschrieben')

  // 4. Übernommene .funke.lua löschen (sonst gälte sie weiter über der neuen Studio-Datei); eine kaputte ist gesichert
  if (funkeAlt && funkeUebernehmen) { await ziel.loeschen(nameFunke); melde(funkeKaputt ? 'funkeKaputtGeloescht' : 'funkeGeloescht') }

  // 5. Nicht mehr benutzte Symbole aufräumen (nur auf der Funke bzw. ihrer SD-Karte, nie in einem frei gewählten Ordner)
  if (ziel.art !== 'ordner') try {
    // Gelöscht wird nur, was der User vor dem Übertragen angekündigt bekommen und angehakt hat (Sendertest 21.11.2026)
    const a = await symboleAufraeumen(ziel, symboleLoeschen)
    if (a.geloescht.length) melde(`symboleGeloescht|${a.geloescht.length}`)
    if (a.bleiben) melde(`symboleBleiben|${a.bleiben}`)
    if (a.uebersprungen) melde('symboleNichtAufgeraeumt')
  } catch { melde('symboleNichtAufgeraeumt') }

  // Studio-Datei mit altem Lua-Namen bleibt liegen (nichts löschen ohne Wissen des Users); die neue gilt vor ihr
  for (const [alt, neu] of Object.entries(ALIAS)) if (neu === lua && vorhanden.some((e) => e.name.toLowerCase() === `${kennung}.${alt}.lua`.toLowerCase())) melde(`alteDateiBleibt|${kennung}.${alt}.lua`)

  // 6. Modell neu laden (nur bei verbundener Funke und bekanntem Pfad)
  if (ziel.art === 'funke' && meta.modellPfad) {
    const s = await ziel.modellLaden(meta.modellPfad)
    melde(s === 0 ? 'modellGeladen' : `modellNichtGeladen|s${s}`, true)
  } else {
    melde('modellSelbstLaden')
  }
  return { ok: true, sicherung, text: gebaut.text, daten }
}

// ---------- Funken-Schnelltest nach dem Übertragen ----------
// Liest die Info-Datei (Format v1 §14) und wertet Log-Zeilen der Funke aus. vorher = Info-Datei vor dem Übertragen (Text oder null).
// Rückgabe { ok, punkte: [{ stufe: 'gut'|'warn'|'fehler', k, wert }] }
const LOG_FEHLER = /(error|attempt to|stack traceback|instruction limit|instructions|not enough memory|out of memory|Studio-Datei kaputt|zu neu|zuNeu|Studio-Symbol)/i
async function schnelltest({ ziel, kennung, lua, format, vorher, logZeilen, groessen }) {
  const punkte = []
  let alt = false
  const p = (stufe, k, wert) => punkte.push({ stufe, k, wert })
  let roh = null
  try { roh = await ziel.lesen(`${kennung}.${lua}.info.json`) } catch { roh = null }
  if (!roh) p('fehler', 'infoFehlt')
  else {
    let info = null
    try { info = JSON.parse(roh.toString('utf8')) } catch { /* kaputt */ }
    if (!info) p('fehler', 'infoKaputt')
    else {
      // Unverändert seit vor dem Übertragen: Das Lua hat die neue Datei (noch) nicht gelesen, das Ergebnis gilt für den alten Stand
      if (vorher !== undefined && vorher !== null && roh.toString('utf8') === vorher) { alt = true; p('warn', 'infoAlt') }
      const sd = info.studioDatei
      if (sd === 'geladen') p(alt ? 'warn' : 'gut', alt ? 'studioGeladenAlt' : 'studioGeladen')
      else p('fehler', 'studioStatus', String(sd))
      if (Number.isInteger(info.fehler) && info.fehler > 0) p('warn', 'studioFelder', String(info.fehler))
      if (format && Array.isArray(info.formate) && !info.formate.includes(format)) p('fehler', 'formatNicht', String(format))
      // Zeigt das Lua auf der Funke überhaupt eine der gestalteten Ansichten? (Fenstergrössen aus der Info-Datei)
      const fenster = Array.isArray(info.fenster) ? info.fenster.filter((f) => f && Number.isInteger(f.breite) && Number.isInteger(f.hoehe)) : []
      if (Array.isArray(groessen) && groessen.length && fenster.length &&
        !groessen.some((g) => fenster.some((f) => f.breite === g.breite && f.hoehe === g.hoehe))) {
        p('warn', 'ansichtNichtSichtbar', fenster.map((f) => `${f.breite} × ${f.hoehe}`).join(', '))
      }
      if (!Array.isArray(info.sensoren) || info.sensoren.length === 0) p('warn', 'keineSensoren')
      else p('gut', 'sensoren', String(info.sensoren.length))
      if (info.luaVersion) p('gut', 'luaVersion', String(info.luaVersion))
      // Neue Felder ab den Luas mit «Studio-Layout sicher finden» (R4, 22.11.2026)
      if (typeof info.studioQuelle === 'string' && info.studioQuelle) p('gut', 'studioQuelle', `${info.studioQuelle}${info.studioWahl === 'menue' ? ' (Menü)' : ''}`)
      if (typeof info.ansichtGenutzt === 'string' && info.ansichtGenutzt) p(info.angepasst ? 'warn' : 'gut', info.angepasst ? 'ansichtAngepasst' : 'ansichtGenutzt', info.ansichtGenutzt)
      if (typeof info.hinweis === 'string' && info.hinweis) p('warn', 'luaHinweis', info.hinweis)
      if (info.luaVersion && NEUE_WAHL[lua] && versionKleiner(String(info.luaVersion), NEUE_WAHL[lua])) p('warn', 'keineMenueWahl', `${info.luaVersion} < ${NEUE_WAHL[lua]}`)
    }
  }
  // Log: Zeilen dieses Luas (Pfad /<lua>/… oder Name) bzw. zur Studio-Datei sind Fehler, auffällige Zeilen anderer Skripte nur Hinweise
  const auffaellig = (logZeilen || []).filter((z) => LOG_FEHLER.test(z)).slice(-20)
  const eigen = (z) => z.toLowerCase().includes(`/${lua}/`) || z.toLowerCase().includes(lua) || /studio/i.test(z)
  for (const z of auffaellig) {
    if (!eigen(z)) p('warn', 'logAnderes', z.slice(0, 200))
    else p(/Studio-Symbol/i.test(z) ? 'warn' : 'fehler', 'log', z.slice(0, 200))
  }
  if (logZeilen && !auffaellig.length) p('gut', 'logSauber', String(logZeilen.length))
  return { ok: !punkte.some((x) => x.stufe === 'fehler'), unsicher: alt, punkte }
}

module.exports = { ohneSymbole, symboleIn, einstellungenSchreiben, NEUE_WAHL, extraDarstellungen, versionKleiner, ALIAS, aliasAktiv, ablageUmziehen, grenzenSchreiben, symboleUnbenutzt, beschreibungenLaden, Ablage, modelleLesen, neuesProjekt, dateiDaten, dateiDatenMitInfo, bauenMitWaechter, presets, presetAnwenden,
  GRUPPEN, VORBEREITET, gruppeVonFenster, vorbereitetInfo, symboleSchreiben, symboleAufraeumen, schnelltest, funkeAenderungenUebernehmen, uebertragen }
