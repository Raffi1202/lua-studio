'use strict'
// Vorlagen «Original» (ab 0.6.0): je Lua die eingebaute Anordnung mit den Mitteln, die das veröffentlichte Lua über die
// Studio-Datei schon kennt (Format 1/2). Grundlage: standard.ansichten aus der Beschreibung, dazu Farben wie in der
// eingebauten Ansicht des Luas (seite1.lua) und auf X14/X18 umgerechnete Ansichten. Die Luas selbst ändern sich nicht.

const W = [255, 255, 255], GRUEN = [64, 220, 110], BLAU = [64, 150, 240], HBLAU = [168, 212, 242]

// Farben je Wert wie in der eingebauten Ansicht (Ring: Bogenfarbe; Zahl: Farbe des Werts)
const FARBEN = {
  electric: { 'lua:akku_proz': GRUEN, 'lua:strom': BLAU, 'lua:drehzahl': HBLAU, 'lua:reglertemp': GRUEN, 'lua:gas_proz': HBLAU,
    'lua:zelle': GRUEN, 'lua:verbraucht': W, 'lua:leistung': W, 'lua:hoehe': W, 'lua:speed': W, 'lua:rssi': GRUEN, 'lua:fluege': W },
  // Jet 0.4.0 (seite1.lua): Ringe Drehzahl hellblau, EGT/Kraftstoff/ECU-Akku grün; Zahlen weiss, Empfang grün
  jet: { 'lua:drehzahl': HBLAU, 'lua:egt': GRUEN, 'lua:kraftstoff_proz': GRUEN, 'lua:ecu_akku': GRUEN, 'lua:fluss': W, 'lua:pumpe': W,
    'lua:schub': W, 'lua:hoehe': W, 'lua:speed': W, 'lua:empfang': GRUEN, 'lua:laeufe': W },
}

// Was über die Studio-Datei nicht geht (das Lua zeichnet es nur in seiner eingebauten Anzeige)
const HINWEIS = {
  jet: {
    de: 'Wie die eingebaute Seite 1 von Jet. Nicht einstellbar über die Studio-Datei: Fusszeilen der eingebauten Anzeige, die Farbstreifen oben an den Kästchen und Titel, die mit der Sprache der Funke wechseln. Seite 2 (Turbinen) und 3 (Flugliste) bleiben wie im Lua.',
    en: 'Like the built-in page 1 of Jet. Not adjustable via the studio file: footers of the built-in display, the colour stripes on top of the boxes and titles that follow the language of the radio. Pages 2 (turbines) and 3 (flight list) stay as in the Lua.',
  },
  electric: {
    de: 'Wie die eingebaute Anzeige von Electric. Nicht einstellbar über die Studio-Datei: Fusszeilen wie «6S 23,1V», «bei 46 A», «0,6 Wh», der Knopf «AUF 0», die Farbstreifen oben an den Kästchen und Titel, die mit der Sprache der Funke wechseln.',
    en: 'Like the built-in display of Electric. Not adjustable via the studio file: footers like «6S 23.1V», «at 46 A», «0.6 Wh», the «AUF 0» button, the colour stripes on top of the boxes and titles that follow the language of the radio.',
  },
}

// Weitere Fenstergrössen aus den Grössen der X18RS (Vollbild aus 800 × 480, kompakt aus 784 × 316)
const UMRECHNEN = [
  { von: [800, 480], nach: [[640, 360], [480, 320]] },
  { von: [784, 316], nach: [[630, 258], [472, 210]] },
]

function skaliert(a, breite, hoehe) {
  const fx = breite / a.breite, fy = hoehe / a.hoehe
  const plaetze = a.plaetze.map((p) => {
    const x = Math.round(p.x * fx), y = Math.round(p.y * fy)
    return { ...p, x, y, b: Math.round((p.x + p.b) * fx) - x, h: Math.round((p.y + p.h) * fy) - y }
  })
  return { breite, hoehe, plaetze }
}

// Feste Felder des Luas, die es nur in einer Grösse selbst zeichnet (Electric: «Flüge» nur bei 800 × 480, ansicht.lua).
// In umgerechneten Grössen wird daraus ein normaler Platz mit diesem Wert.
const FESTE_ALS_PLATZ = { electric: { von: [800, 480], w: 'lua:fluege' }, jet: { von: [800, 480], w: 'lua:laeufe' } }
const MIN_ZAHL = [90, 50]   // Mindestgrösse «zahl» bei 800 px Breite (wie die Prüfung der Oberfläche)

function festesFeldAlsPlatz(beschreibung, quelle, ziel) {
  const f = FESTE_ALS_PLATZ[beschreibung.lua]
  if (!f || quelle.breite !== f.von[0] || quelle.hoehe !== f.von[1]) return
  const r = (beschreibung.reserviert || []).find((x) => x.breite === quelle.breite && x.hoehe === quelle.hoehe && !(x.x <= 0 && x.b >= quelle.breite))
  if (!r) return
  const fx = ziel.breite / quelle.breite, fy = ziel.hoehe / quelle.hoehe
  const x = Math.round(r.x * fx), b = Math.round((r.x + r.b) * fx) - x
  let y = Math.round(r.y * fy)
  const unten = Math.round((r.y + r.h) * fy)
  const minH = Math.ceil(MIN_ZAHL[1] * ziel.breite / 800)
  // zu niedrig: den Platz direkt darüber in derselben Spalte kürzen (Abstand bleibt)
  if (unten - y < minH) {
    const fehlt = minH - (unten - y)
    const oben = ziel.plaetze.find((p) => p.x < x + b && x < p.x + p.b && p.y + p.h <= y && y - (p.y + p.h) <= 12)
    if (!oben || oben.h - fehlt < Math.ceil(MIN_ZAHL[1] * ziel.breite / 800)) return
    oben.h -= fehlt
    y -= fehlt
  }
  ziel.plaetze.push({ x, y, b, h: unten - y, w: f.w, darstellung: 'zahl' })
}

// Vorlage «Original» für ein Lua oder null, wenn das Studio für dieses Lua keine kennt
function original(beschreibung) {
  const farben = beschreibung && FARBEN[beschreibung.lua]
  const std = beschreibung && beschreibung.standard && beschreibung.standard.ansichten
  if (!farben || !Array.isArray(std) || !std.length) return null
  const ansichten = std.map((a) => ({ breite: a.breite, hoehe: a.hoehe,
    plaetze: a.plaetze.map((p) => (farben[p.w] ? { ...p, farbe: farben[p.w] } : { ...p })) }))
  for (const u of UMRECHNEN) {
    const q = ansichten.find((a) => a.breite === u.von[0] && a.hoehe === u.von[1])
    if (!q) continue
    for (const [b, h] of u.nach) {
      if (ansichten.some((a) => a.breite === b && a.hoehe === h)) continue
      const neu = skaliert(q, b, h)
      festesFeldAlsPlatz(beschreibung, q, neu)
      ansichten.push(neu)
    }
  }
  return { s: 'original', name: { de: 'Original (wie das Lua)', en: 'Original (like the Lua)' },
    hinweis: HINWEIS[beschreibung.lua] || { de: 'Wie die eingebaute Anzeige des Luas, soweit über die Studio-Datei einstellbar.', en: 'Like the built-in display of the Lua, as far as the studio file allows.' }, ansichten }
}

module.exports = { original, FARBEN }
