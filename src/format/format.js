'use strict'
// Studio-Datei nach Lua-Studio-Format v1 schreiben und mit denselben Regeln prüfen wie die Funke
// (FrSky Koordination/Lua-Studio-Format v1.md, Abschnitte 2.1, 4, 6; Referenz studio_laden.lua).

const FORMAT = 1
const GRENZE_FUNKE = { byte: 16384, elemente: 1200, tabellen: 240 }
const GRENZE_STUDIO = { byte: 15360, elemente: 1100, tabellen: 220 }
const SCHLUESSELWOERTER = ['and', 'break', 'do', 'else', 'elseif', 'end', 'for', 'function', 'goto', 'if', 'in',
  'local', 'nil', 'not', 'or', 'repeat', 'then', 'until', 'while']
const BEZEICHNER = /^[A-Za-z_][A-Za-z0-9_]*$/

// Abschnitt 2.1: Kennung byteweise aus dem Modellnamen
function kennung(modellname) {
  const bytes = Buffer.from(String(modellname || ''), 'utf8')
  let k = ''
  for (const b of bytes) {
    const c = String.fromCharCode(b)
    k += /[A-Za-z0-9]/.test(c) ? c : '_'
  }
  k = k.slice(0, 32)
  return k || 'modell'
}

// Text vollständig als Dezimal-Escapes
function text(t) {
  return '"' + [...Buffer.from(String(t), 'utf8')].map((b) => '\\' + b).join('') + '"'
}

function zahl(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Keine endliche Zahl: ${v}`)
  if (Number.isInteger(v)) return String(v)
  // höchstens 4 Nachkommastellen, nie Exponent
  const s = v.toFixed(4)
  if (/e/i.test(s)) throw new Error(`Zahl zu gross: ${v}`)
  return s
}

// JS-Wert -> Lua-Literal. Objekte: Schlüssel als Bezeichner, wenn möglich (und kein Schlüsselwort), sonst ["…"] mit Escapes.
// Arrays -> Listen. Felder mit undefined werden weggelassen.
function literal(v) {
  if (v === true || v === false) return String(v)
  if (typeof v === 'number') return zahl(v)
  if (typeof v === 'string') return text(v)
  if (Array.isArray(v)) return '{ ' + v.map(literal).join(', ') + ' }'
  if (v && typeof v === 'object') {
    const teile = []
    for (const [k, w] of Object.entries(v)) {
      if (w === undefined || w === null) continue
      const schluessel = BEZEICHNER.test(k) && k.length <= 24 && !SCHLUESSELWOERTER.includes(k) && !['return', 'true', 'false'].includes(k)
        ? k : `[${text(k)}]`
      teile.push(`${schluessel} = ${literal(w)}`)
    }
    return '{ ' + teile.join(', ') + ' }'
  }
  throw new Error(`Nicht darstellbar: ${typeof v}`)
}

function dateiText(daten) {
  return 'return ' + literal({ format: FORMAT, ...daten }) + '\n'
}

// Zählung wie in studio_laden.lua (ausserhalb von Texten)
function zaehlen(s) {
  const ohne = s.replace(/"[^"]*"/g, '""')
  const anzahl = (re) => (ohne.match(re) || []).length
  const tabellen = anzahl(/\{/g)
  return { byte: Buffer.byteLength(s, 'utf8'), elemente: anzahl(/,/g) + anzahl(/=/g) + tabellen, tabellen }
}

// Genau die Prüfungen von studio_laden.lua, Schritte 1–5 (ohne Laden). Rückgabe: null = gut, sonst Grund.
function pruefenWieFunke(s) {
  const z = zaehlen(s)
  if (z.byte > GRENZE_FUNKE.byte) return 'zu gross'
  // Wie Lua: nur ASCII; %s ist nur Leerzeichen, Tab, Zeilenende, \v, \f
  if (/[^\x00-\x7f]/.test(s)) return 'Zeichen'
  if (!/^[ \t\n\r\v\f]*return[ \t\n\r\v\f]*\{/.test(s)) return 'Anfang'
  if (/[^A-Za-z0-9 \t\n\r\v\f_{}[\]=,"\\\-.]/.test(s)) return 'Zeichen'
  if (/\\[^0-9]/.test(s)) return 'Escape'
  if (s.includes('..') || s.includes('--') || s.includes('[[')) return 'Folge'
  const ohne = s.replace(/"[^"]*"/g, '""')
  for (const w of SCHLUESSELWOERTER) {
    if (new RegExp(`(^|[^A-Za-z0-9_])${w}(?![A-Za-z0-9_])`).test(ohne)) return `Wort ${w}`
  }
  if (/-\s*[^0-9]/.test(ohne) || /[^=,{[\s]\s*-/.test(ohne)) return 'Minus'
  if ((ohne.match(/(^|[^A-Za-z0-9_])return(?![A-Za-z0-9_])/g) || []).length !== 1) return 'return'
  if (/[A-Za-z0-9_]{25}/.test(ohne)) return 'Name zu lang'
  if (ohne.includes('==')) return '=='
  const rest = ohne.replace(/^\s*return/, '').replace(/[A-Za-z_][A-Za-z0-9_]*\s*=/g, '=')
    .replace(/(^|[^A-Za-z0-9_])(true|false)(?![A-Za-z0-9_])/g, '$1')
  if (/[A-Za-z_]/.test(rest)) return 'Name'
  if (/\[\s*[^0-9"-]/.test(ohne)) return 'Schluessel'
  if (z.tabellen > GRENZE_FUNKE.tabellen || z.elemente > GRENZE_FUNKE.elemente) return 'zu viele Elemente'
  return null
}

// Studio-Datei bauen und gegen die Studio-Grenzen prüfen. Rückgabe { text, zaehlung } oder Fehler mit .grund
function bauen(daten) {
  const s = dateiText(daten)
  const z = zaehlen(s)
  const fehler = []
  if (z.byte > GRENZE_STUDIO.byte) fehler.push(`Datei zu gross (${z.byte} von ${GRENZE_STUDIO.byte} Byte)`)
  if (z.elemente > GRENZE_STUDIO.elemente) fehler.push(`zu viele Angaben (${z.elemente} von ${GRENZE_STUDIO.elemente})`)
  if (z.tabellen > GRENZE_STUDIO.tabellen) fehler.push(`zu viele Listen (${z.tabellen} von ${GRENZE_STUDIO.tabellen})`)
  const funke = pruefenWieFunke(s)
  if (funke) fehler.push(`Funke würde ablehnen: ${funke}`)
  return { text: s, zaehlung: z, fehler }
}

// Studio-Datei (bzw. .funke.lua) lesen: nur für Dateien, die die Prüfung bestehen. Kleiner Parser für das
// reine Daten-Literal (keine Ausführung von Code).
function lesen(s) {
  const grund = pruefenWieFunke(s)
  if (grund) throw new Error(`Datei ungültig: ${grund}`)
  let i = s.indexOf('{')
  const leer = () => { while (i < s.length && /\s/.test(s[i])) i++ }
  const wert = () => {
    leer()
    const c = s[i]
    if (c === '{') return tabelle()
    if (c === '"') {
      i++
      const bytes = []
      while (s[i] !== '"') {
        if (i >= s.length) throw new Error('Text ohne Ende')
        if (s[i] === '\\') {
          i++; let d = ''; while (i < s.length && /[0-9]/.test(s[i]) && d.length < 3) d += s[i++]
          const b = Number(d)
          if (!d || b > 255) throw new Error('Escape ungültig')
          bytes.push(b)
        } else bytes.push(s.charCodeAt(i++))
      }
      i++
      return Buffer.from(bytes).toString('utf8')
    }
    const m = /^(-?\s*[0-9.]+|true|false)/.exec(s.slice(i))
    if (!m) throw new Error(`Unerwartet an Stelle ${i}`)
    i += m[0].length
    if (m[0] === 'true') return true
    if (m[0] === 'false') return false
    return Number(m[0].replace(/\s/g, ''))
  }
  const tabelle = () => {
    i++ // {
    const liste = []
    const obj = {}
    let istObj = false
    for (;;) {
      leer()
      if (i >= s.length) throw new Error('Tabelle ohne Ende')
      if (s[i] === '}') { i++; break }
      if (s[i] === ',') { i++; continue }
      let m
      if (s[i] === '[') {
        i++
        const k = wert()
        leer(); i++ // ]
        leer(); i++ // =
        obj[k] = wert(); istObj = true
      } else if ((m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(s.slice(i))) && !['true', 'false'].includes(m[1])) {
        i += m[0].length
        obj[m[1]] = wert(); istObj = true
      } else {
        liste.push(wert())
      }
    }
    if (istObj) { liste.forEach((v, n) => { obj[n + 1] = v }); return obj }
    return liste
  }
  return tabelle()
}

module.exports = { FORMAT, GRENZE_FUNKE, GRENZE_STUDIO, kennung, text, literal, dateiText, zaehlen, pruefenWieFunke, bauen, lesen }
