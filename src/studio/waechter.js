'use strict'
// Grössenwächter (Konzept Abschnitt 3, Format 2 §7.2 und §10 Nr. 6): Ampel je Grösse, Rot sperrt das Übertragen.

const F = require('../format/format')
const Y = require('./symbole')

// Grenzen: [grün bis, gelb bis]; darüber rot
const GRENZEN = {
  datei: [12288, F.GRENZE_STUDIO.byte],
  elemente: [1000, F.GRENZE_STUDIO.elemente],
  tabellen: [200, F.GRENZE_STUDIO.tabellen],
  spitze: [60, 126],
  ansichten: [2, 2],
  plaetze: [12, 16],
  kurven: [1, 2],
  deko: [12, Y.MAX_DEKO],
  symbole: [12, Y.MAX_SYMBOLE],
  listen: [32, 48],
}

// Geschätzte Lua-Speicher-Spitze beim Laden (KB), geeicht an der Messung X18RS 20.11.2026 (Ethos 26.2.0):
// typisch 58,6 (Schätzung 74), g16_lang24 125,8 (124), g12_lang24 89,1 (95), g16_513 79,0 (79), g16_liste 53,8 (55),
// g16_tab 24,0 (25), g16_text 10,6 (11). Absichtlich eher zu hoch.
function spitzeSchaetzen(text) {
  const ohne = text.replace(/"[^"]*"/g, '""')
  const texte = text.length - ohne.length
  const anzahl = (re) => (ohne.match(re) || []).length
  const z = F.zaehlen(text)
  const langeNamen = (ohne.match(/[A-Za-z_][A-Za-z0-9_]{12,}\s*=/g) || []).reduce((n, s) => n + s.replace(/\s*=$/, '').length, 0)
  return 4.5 + 0.042 * z.elemente + 0.043 * anzahl(/=/g) + 4 * langeNamen / 1024 + 0.16 * texte / 1024
}

function ampel(wert, [gruen, gelb]) { return wert <= gruen ? 'gruen' : wert <= gelb ? 'gelb' : 'rot' }

// text: gebaute Studio-Datei; daten: was in der Datei steht (nach Format-Wahl)
function pruefen(text, daten) {
  const z = F.zaehlen(text)
  const zeilen = []
  const zeile = (k, wert, grenze, anzeige) => zeilen.push({ k, wert, ampel: ampel(wert, grenze), anzeige, grenze: grenze[1] })
  zeile('datei', z.byte, GRENZEN.datei, `${(z.byte / 1024).toFixed(1)} KB / ${(GRENZEN.datei[1] / 1024).toFixed(0)} KB`)
  zeile('elemente', z.elemente, GRENZEN.elemente, `${z.elemente} / ${GRENZEN.elemente[1]}`)
  zeile('tabellen', z.tabellen, GRENZEN.tabellen, `${z.tabellen} / ${GRENZEN.tabellen[1]}`)
  const sp = spitzeSchaetzen(text)
  zeile('spitze', sp, GRENZEN.spitze, `≈ ${Math.round(sp)} KB / ${GRENZEN.spitze[1]} KB`)
  const ans = daten.ansichten || []
  zeile('ansichten', ans.length, GRENZEN.ansichten, `${ans.length} / 2`)
  const maxP = Math.max(0, ...ans.map((a) => (a.plaetze || []).length))
  zeile('plaetze', maxP, GRENZEN.plaetze, `${maxP} / ${GRENZEN.plaetze[1]}`)
  const maxK = Math.max(0, ...ans.map((a) => (a.plaetze || []).filter((p) => p.darstellung === 'kurve').length))
  zeile('kurven', maxK, GRENZEN.kurven, `${maxK} / ${GRENZEN.kurven[1]}`)
  const listen = Math.max(...['werte', 'grenzen', 'einstellungen'].map((k) => Object.keys(daten[k] || {}).length))
  zeile('listen', listen, GRENZEN.listen, `${listen} / ${GRENZEN.listen[1]}`)
  if (daten.format === 2) {
    const maxD = Math.max(0, ...ans.map((a) => (a.deko || []).length))
    zeile('deko', maxD, GRENZEN.deko, `${maxD} / ${GRENZEN.deko[1]}`)
    // ab 0.11.0 keine Symbole und keine Symbolbilder mehr: Zeilen «Symbole» und «Bildspeicher» entfallen
  }
  return { zeilen, gesperrt: zeilen.filter((r) => r.ampel === 'rot').map((r) => r.k) }
}

module.exports = { GRENZEN, spitzeSchaetzen, pruefen }
