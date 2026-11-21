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
  // Heli 1.13.1 (Simulatorbild «Normal»): Akku/Reglertemp grün, Drehzahl hellblau, Strom blau; Zelle grün, BEC/Verbraucht weiss
  // Glider 0.5.0: Farben wie im Lua ohne Studio-Datei (keine eigenen Farben je Wert)
  glider: {},
  // Gas Engine ECU/Carb: Farben wie im Lua ohne Studio-Datei
  gas_ecu: {},
  gas_carb: {},
  heli: { 'lua:akku_proz': GRUEN, 'lua:drehzahl': HBLAU, 'lua:strom': BLAU, 'lua:reglertemp': GRUEN, 'lua:zelle': GRUEN, 'lua:bec': W,
    'lua:verbraucht': W, 'lua:spannung': W, 'lua:rssi': GRUEN, 'lua:leistung': W, 'lua:fluege': W },
}

// Was über die Studio-Datei nicht geht (das Lua zeichnet es nur in seiner eingebauten Anzeige)
const HINWEIS = {
  gas_ecu: { de: 'Wie die eingebaute Anzeige von Gas Engine (Vollbild wie Seite 1, kompakt wie die Kompaktansicht). Zylinder und Tank (mit «VOLLGETANKT») gibt es ab Gas Engine 1.11.0 / 0.11.0 auch über die Studio-Datei. Nicht einstellbar: der Drehzahl-Bogen mit Farbzonen und die Kopfzeile mit den Pillen.', en: 'Like the built-in display of Gas Engine (full screen like page 1, compact like the compact view). Cylinders and tank (with «REFUELLED») are available via the studio file from Gas Engine 1.11.0 / 0.11.0. Not adjustable: the RPM arc with colour zones and the top bar with its pills.' },
  gas_carb: { de: 'Wie die eingebaute Anzeige von Gas Engine (Vollbild wie Seite 1, kompakt wie die Kompaktansicht). Zylinder und Tank (mit «VOLLGETANKT») gibt es ab Gas Engine 1.11.0 / 0.11.0 auch über die Studio-Datei. Nicht einstellbar: der Drehzahl-Bogen mit Farbzonen und die Kopfzeile mit den Pillen.', en: 'Like the built-in display of Gas Engine (full screen like page 1, compact like the compact view). Cylinders and tank (with «REFUELLED») are available via the studio file from Gas Engine 1.11.0 / 0.11.0. Not adjustable: the RPM arc with colour zones and the top bar with its pills.' },
  glider: {
    de: 'Wie die Kompaktansicht von Glider; im Vollbild auf die Fläche unter der Kopfzeile umgerechnet. Nicht einstellbar über die Studio-Datei: Kopfzeile mit Flugphase, Motor, Empfang und Flug, das Alarmband darunter.',
    en: 'Like the compact view of Glider; in full screen scaled to the area below the top bar. Not adjustable via the studio file: top bar with flight mode, motor, signal and flight, the alarm band below it.',
  },
  heli: {
    de: 'Wie die eingebaute Anzeige von Heli. Nicht einstellbar über die Studio-Datei: Fusszeilen wie «12S 47,0V» oder «Kopf 1840 U/MIN», die Pille «SCHARF» in der Governor-Kachel, das Feld Flugmodus, der Knopf «AUF 0», die Farbstreifen an den Kästchen und Titel, die mit der Sprache der Funke wechseln.',
    en: 'Like the built-in display of Heli. Not adjustable via the studio file: footers like «12S 47.0V» or «head 1840 rpm», the «ARMED» pill in the governor box, the flight mode field, the «AUF 0» button, the colour stripes on the boxes and titles that follow the language of the radio.',
  },
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
  // Luas ohne Vollbild in der Beschreibung (Glider, Gas Engine): Vollbild aus der Kompaktansicht, unter der Kopfzeile
  { von: [784, 316], nach: [[800, 480], [640, 360], [480, 320]], band: true },
]
// Höhe des reservierten Bands oben (Kopfzeile des Luas) für eine Fenstergrösse
function bandOben(beschreibung, b, h) {
  return Math.max(0, ...((beschreibung.reserviert || []).filter((r) => r.breite === b && r.hoehe === h && r.y <= 0 && r.x <= 0 && r.b >= b).map((r) => r.y + r.h)))
}

// Mindestgrössen bei 800 px Breite (wie die Prüfung der Oberfläche)
const MINDEST = { zahl: [90, 50], ring: [110, 110], balken_w: [140, 40], balken_s: [50, 110], kurve: [180, 90], status: [120, 40] }
// Nach dem Umrechnen: zu niedrige Plätze holen die fehlende Höhe beim Platz direkt darüber (gleiche Spalte), Abstand bleibt
function mindestHoehe(a) {
  const f = a.breite / 800
  const minH = (p) => Math.round((MINDEST[p.darstellung || 'zahl'] || MINDEST.zahl)[1] * f)
  for (const p of a.plaetze) {
    const fehlt = minH(p) - p.h
    if (fehlt <= 0) continue
    const oben = a.plaetze.filter((q) => q !== p && q.x < p.x + p.b && p.x < q.x + q.b && q.y + q.h <= p.y && p.y - (q.y + q.h) <= 12)
    if (!oben.length || oben.some((q) => q.h - fehlt < minH(q))) continue
    for (const q of oben) q.h -= fehlt
    p.y -= fehlt; p.h += fehlt
  }
  return a
}

// sb/tb: Kopfband der Quelle bzw. des Ziels; der Bereich darunter wird gestreckt (ohne Band: ganz)
function skaliert(a, breite, hoehe, sb = 0, tb = 0) {
  const fx = breite / a.breite, fy = (hoehe - tb) / (a.hoehe - sb)
  const Y = (y) => Math.round(tb + (y - sb) * fy)
  const plaetze = a.plaetze.map((p) => {
    const x = Math.round(p.x * fx), y = Y(p.y)
    return { ...p, x, y, b: Math.round((p.x + p.b) * fx) - x, h: Y(p.y + p.h) - y }
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

// Gas Engine ab 1.11.0 / 0.11.0 (darstellungenExtra zylinder und tank): Vollbild wie die eingebaute Seite 1 –
// Zylinder links, Drehzahl in der Mitte, Tank rechts, unten Höhe, Steigen, Speed (unter dem reservierten Kopfband)
function gasVollbild(beschreibung) {
  const ex = beschreibung.darstellungenExtra || {}
  if (!ex.zylinder || !ex.tank) return null
  const B = 800, H = 480, g = 6
  const y0 = bandOben(beschreibung, B, H) + g, uh = 70, uy = H - g - uh, oh = uy - g - y0
  return { breite: B, hoehe: H, plaetze: [
    { x: g, y: y0, b: 248, h: oh, w: 'lua:cht_max', darstellung: 'zylinder' },
    { x: 260, y: y0, b: 280, h: oh, w: 'lua:rpm', darstellung: 'ring' },
    { x: 546, y: y0, b: 248, h: oh, w: 'lua:tank_proz', darstellung: 'tank' },
    { x: g, y: uy, b: 258, h: uh, w: 'lua:hoehe', darstellung: 'zahl' },
    { x: 270, y: uy, b: 260, h: uh, w: 'lua:vario', darstellung: 'zahl' },
    { x: 536, y: uy, b: 258, h: uh, w: 'lua:speed', darstellung: 'zahl' },
  ] }
}

// Vorlage «Original» für ein Lua oder null, wenn das Studio für dieses Lua keine kennt
function original(beschreibung) {
  const farben = beschreibung && FARBEN[beschreibung.lua]
  const std = beschreibung && beschreibung.standard && beschreibung.standard.ansichten
  if (!farben || !Array.isArray(std) || !std.length) return null
  const ansichten = std.map((a) => ({ breite: a.breite, hoehe: a.hoehe,
    plaetze: a.plaetze.map((p) => (farben[p.w] ? { ...p, farbe: farben[p.w] } : { ...p })) }))
  const voll = (beschreibung.lua === 'gas_ecu' || beschreibung.lua === 'gas_carb') && gasVollbild(beschreibung)
  if (voll && !ansichten.some((a) => a.breite === 800 && a.hoehe === 480)) ansichten.push(voll)
  for (const u of UMRECHNEN) {
    const q = ansichten.find((a) => a.breite === u.von[0] && a.hoehe === u.von[1])
    if (!q) continue
    for (const [b, h] of u.nach) {
      if (ansichten.some((a) => a.breite === b && a.hoehe === h)) continue
      const neu = u.band ? skaliert(q, b, h, bandOben(beschreibung, q.breite, q.hoehe), bandOben(beschreibung, b, h)) : skaliert(q, b, h)
      festesFeldAlsPlatz(beschreibung, q, neu)
      ansichten.push(mindestHoehe(neu))
    }
  }
  return { s: 'original', name: { de: 'Original (wie das Lua)', en: 'Original (like the Lua)' },
    hinweis: HINWEIS[beschreibung.lua] || { de: 'Wie die eingebaute Anzeige des Luas, soweit über die Studio-Datei einstellbar.', en: 'Like the built-in display of the Lua, as far as the studio file allows.' }, ansichten }
}

module.exports = { original, FARBEN }
