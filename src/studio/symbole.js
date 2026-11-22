'use strict'
// Symbole für Format 2 (Lua-Studio-Format 2.md, Abschnitte 2–4):
// Katalog, Kantenlänge je Display, Graustufen-PNG schreiben und prüfen, Liste «symbole» einer Studio-Datei bilden.

const zlib = require('zlib')

// Bezugsgrössen: 24–64 wählbar (Platz und Schmuck); ab 0.10.6 zusätzlich 12 und 16 als kleine Masken für den Platzkopf
// (Symbol so hoch wie die Titelschrift; drawMask skaliert nicht, darum eigene Dateien, Entscheid Electric 0.7.5).
const PX_WAHL = [24, 32, 48, 64]
const PX_KLEIN = [12, 16]
const PX = [...PX_KLEIN, ...PX_WAHL]
const NAME = /^[a-z][a-z0-9_]{0,23}$/
const DATEI = /^([a-z][a-z0-9_]{0,23})_(12|16|24|32|48|64)\.png$/
const MAX_SYMBOLE = 20
const MAX_DEKO = 24
const MAX_PNG = 4096

// Symbolsatz (Entwurf 20.11.2026, «Bild oder Einheit», Format 2 §10). minPx: kleinste erlaubte Bezugsgrösse.
const KATALOG = [
  ['akku', 'Akku', 'Battery'], ['zelle', 'Akkuzelle', 'Cell'], ['temperatur', 'Temperatur', 'Temperature'],
  ['elektromotor', 'Elektromotor', 'Electric motor'], ['propeller', 'Propeller', 'Propeller'],
  ['kolbenmotor_1zyl', 'Kolbenmotor 1 Zyl.', 'Piston engine 1 cyl.'], ['kolbenmotor_2zyl', 'Kolbenmotor 2 Zyl.', 'Piston engine 2 cyl.'],
  ['kolbenmotor_4zyl', 'Kolbenmotor 4 Zyl.', 'Piston engine 4 cyl.'], ['sternmotor', 'Sternmotor', 'Radial engine'],
  ['turbine', 'Jet-Turbine', 'Jet turbine'], ['impeller', 'Impeller', 'Ducted fan'], ['tank', 'Tank', 'Tank'],
  ['heli', 'Heli', 'Heli'], ['segler', 'Segler', 'Glider'], ['flugzeug', 'Flugzeug', 'Airplane'], ['fluege', 'Flüge', 'Flights'],
  ['hoehe', 'Höhe', 'Altitude'], ['vario', 'Vario', 'Vario'], ['speed', 'Geschwindigkeit', 'Speed'], ['gps', 'GPS', 'GPS'],
  ['satellit', 'Satelliten', 'Satellites'], ['kompass', 'Kompass', 'Compass'], ['empfang', 'Empfang', 'Signal'],
  ['antenne', 'Antenne', 'Antenna'], ['flugmodus', 'Flugmodus', 'Flight mode'], ['uhr', 'Uhr', 'Timer'], ['stern', 'Stern', 'Star'],
  ['info', 'Info', 'Info'], ['warnung', 'Warnung', 'Warning'], ['alarm', 'Alarm', 'Alarm'], ['scharf', 'Scharf', 'Armed'],
  ['sicher', 'Sicher', 'Safe'], ['thermik', 'Thermik', 'Thermal'], ['schlepp', 'Schlepp', 'Tow', 48],
].map(([name, de, en, minPx]) => ({ name, de, en, minPx: minPx || 24 }))

function imKatalog(name) { return KATALOG.find((k) => k.name === name) || null }

// Displaybreite aus der Breite einer Ansicht (Format 2 §2, Werte aus «Widget-Zonen gemessen»)
function displayBreite(ansichtBreite) {
  if (ansichtBreite >= 784) return 800
  if (ansichtBreite >= 630) return 640
  return 480
}
function kante(px, B) { return Math.round(px * B / 800) }
function rand(B) { return Math.round(4 * B / 800) }

// ---------- PNG ----------
const CRC_TAB = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c }
  return t
})()
function crc32(buf) { let c = -1; for (const b of buf) c = CRC_TAB[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0 }
function chunk(art, daten) {
  const laenge = Buffer.alloc(4); laenge.writeUInt32BE(daten.length)
  const kopf = Buffer.concat([Buffer.from(art, 'ascii'), daten])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(kopf))
  return Buffer.concat([laenge, kopf, crc])
}
const KENNUNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

// Graustufen-PNG (Farbtyp 0, 8 Bit, ohne Alpha) aus kante × kante Grauwerten (0 = schwarz = deckend)
function pngGrau(k, grau) {
  if (!Number.isInteger(k) || k < 1 || k > 256 || !grau || grau.length !== k * k) throw new Error('symbolBild')
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(k, 0); ihdr.writeUInt32BE(k, 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const roh = Buffer.alloc(k * (k + 1))
  for (let y = 0; y < k; y++) { roh[y * (k + 1)] = 0; for (let x = 0; x < k; x++) roh[y * (k + 1) + 1 + x] = Math.max(0, Math.min(255, grau[y * k + x] | 0)) }
  return Buffer.concat([KENNUNG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(roh, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// Kopfprüfung wie auf der Funke (Format 2 §4.3), zusätzlich Farbtyp 0 und Grösse höchstens 4 KB. null = gut.
function pngPruefen(buf, k) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return 'kurz'
  if (buf.length > MAX_PNG) return 'gross'
  if (!buf.subarray(0, 8).equals(KENNUNG)) return 'kennung'
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return 'ihdr'
  if (buf.readUInt32BE(16) !== k || buf.readUInt32BE(20) !== k) return 'kante'
  if (buf.length < 29 || buf[24] !== 8 || buf[25] !== 0) return 'farbtyp'
  return null
}

// ---------- Studio-Datei ----------
function symbolPx(p) { return PX_WAHL.includes(p.symbolPx) ? p.symbolPx : 24 }
// Stufe für den Platzkopf: die grösste Kante ≤ Titelhöhe th (Displaypixel), sonst die kleinste (12)
function kopfPx(th, B) { let px = PX[0]; for (const s of PX) if (kante(s, B) <= th) px = s; return px }

// Liste «symbole» (Name + Bezugsgrösse) aus Plätzen und Schmuck; nur Namen aus dem Katalog
function symbolListe(ansichten) {
  const liste = []
  const dazu = (name, px) => { if (imKatalog(name) && PX.includes(px) && !liste.some((s) => s.name === name && s.px === px)) liste.push({ name, px }) }
  for (const a of ansichten || []) {
    for (const p of a.plaetze || []) if (p.symbol) dazu(p.symbol, symbolPx(p))
    for (const d of a.deko || []) if (d.art === 'symbol') dazu(d.name, d.px)
  }
  return liste
}

function benutztFormat2(ansichten) {
  return (ansichten || []).some((a) => (a.deko && a.deko.length) || (a.plaetze || []).some((p) => p.symbol || p.symbolPx !== undefined || p.einheitZeigen !== undefined))
}

// Format-2-Felder entfernen (für Format 1)
function ohneFormat2(ansichten) {
  return (ansichten || []).map((a) => {
    const { deko, ...rest } = a
    return { ...rest, plaetze: (a.plaetze || []).map(({ symbol, symbolPx: _p, einheitZeigen, ...p }) => p) }
  })
}

// Schmuck-Element nach Format 2 §3.4 prüfen. null = gut, sonst Grund.
function dekoPruefen(d, a) {
  if (!d || typeof d !== 'object') return 'art'
  const ganz = (v) => Number.isInteger(v)
  if (!['symbol', 'text', 'linie', 'rahmen'].includes(d.art)) return 'art'
  if (!ganz(d.x) || !ganz(d.y) || d.x < 0 || d.y < 0 || d.x >= a.breite || d.y >= a.hoehe) return 'lage'
  if (d.art === 'symbol') {
    if (!NAME.test(String(d.name)) || !imKatalog(d.name)) return 'name'
    if (!PX_WAHL.includes(d.px) || d.px < imKatalog(d.name).minPx) return 'px'
    const k = kante(d.px, displayBreite(a.breite))
    if (d.x + k > a.breite || d.y + k > a.hoehe) return 'lage'
    return null
  }
  if (!ganz(d.b) || !ganz(d.h)) return 'groesse'
  if (d.art === 'linie') {
    if (d.b === 0 && d.h === 0) return 'groesse'
    const ex = d.x + d.b, ey = d.y + d.h
    if (ex < 0 || ey < 0 || ex >= a.breite || ey >= a.hoehe) return 'lage'
    return null
  }
  if (d.b < 1 || d.h < 1 || d.x + d.b > a.breite || d.y + d.h > a.hoehe) return 'groesse'
  if (d.art === 'text' && (typeof d.text !== 'string' || !d.text || Buffer.byteLength(d.text, 'utf8') > 24)) return 'text'
  return null
}

// Dateien zum Übertragen (ab 0.10.6): die Liste «symbole» und zu jedem Platzsymbol die kleinen Masken name_12/name_16.
// Die kleinen Masken stehen nicht in «symbole» (Lua-Grenze 20 Einträge bleibt, ältere Luas lesen die Datei unverändert);
// das Lua findet sie über den Namen.
function dateiListe(daten) {
  const liste = [...(daten.symbole || [])]
  for (const a of daten.ansichten || []) for (const p of a.plaetze || []) {
    if (!p.symbol || !imKatalog(p.symbol)) continue
    for (const px of PX_KLEIN) if (!liste.some((s) => s.name === p.symbol && s.px === px)) liste.push({ name: p.symbol, px })
  }
  return liste
}
// Grössenwächter: die Grenze MAX_SYMBOLE zählt die wählbaren Stufen; kleine Masken (12/16, je ≤ 256 Byte) zählen nicht dazu
function grosseSymbole(liste) { return (liste || []).filter((s) => !PX_KLEIN.includes(s.px)) }
module.exports = { PX, PX_WAHL, PX_KLEIN, kopfPx, grosseSymbole, dateiListe, NAME, DATEI, MAX_SYMBOLE, MAX_DEKO, MAX_PNG, KATALOG, imKatalog, displayBreite, kante, rand, crc32, pngGrau, pngPruefen,
  symbolPx, symbolListe, benutztFormat2, ohneFormat2, dekoPruefen }
