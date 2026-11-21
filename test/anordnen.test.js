'use strict'
// Tests für «Automatisch anordnen» (src/studio/anordnen.js, 0.4.0)

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { anordnen, raster, ganzePixel } = require('../src/studio/anordnen')

const MIND = { zahl: [90, 50], ring: [110, 110], balken_w: [140, 40], balken_s: [50, 110], kurve: [180, 90], status: [120, 40] }
const mindest = (breite) => Object.fromEntries(Object.entries(MIND).map(([k, [b, h]]) => [k, [Math.round((b * breite) / 800), Math.round((h * breite) / 800)]]))
const lagen = (r) => r.plaetze.map((q) => [q.x, q.y, q.b, q.h].join(','))
const ueberlappt = (p, q) => p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h

const BEISPIEL = {
  breite: 784, hoehe: 316, plaetze: [
    { x: 8, y: 40, b: 230, h: 150, darstellung: 'ring' }, { x: 250, y: 36, b: 180, h: 150, darstellung: 'ring' },
    { x: 444, y: 44, b: 320, h: 140, darstellung: 'kurve' },
    { x: 4, y: 200, b: 250, h: 100 }, { x: 268, y: 196, b: 230, h: 112 }, { x: 512, y: 204, b: 260, h: 96, darstellung: 'balken_w' }],
}
const KOPF = [{ x: 0, y: 0, b: 784, h: 33 }]

test('Beispiel aus dem Konzeptblatt: gleich breit je Zeile, G = 5', () => {
  const r = anordnen({ ansicht: BEISPIEL, reserviert: KOPF, G: 5, art: 'gleich', mindest: mindest(784) })
  assert.ok(r.ok, JSON.stringify(r))
  assert.deepStrictEqual(lagen(r), ['5,38,255,155', '265,38,255,155', '525,38,254,155', '5,198,255,113', '265,198,255,113', '525,198,254,113'])
  // alle Abstände und Ränder genau 5
  const p = r.plaetze
  assert.strictEqual(p[0].x, 5); assert.strictEqual(784 - (p[2].x + p[2].b), 5); assert.strictEqual(p[0].y - 33, 5)
  assert.strictEqual(316 - (p[3].y + p[3].h), 5); assert.strictEqual(p[1].x - (p[0].x + p[0].b), 5); assert.strictEqual(p[3].y - (p[0].y + p[0].h), 5)
  assert.strictEqual(r.plaetze[0].darstellung, 'ring', 'andere Felder bleiben')
})

test('Verhältnis behalten und Nur verteilen', () => {
  const v = anordnen({ ansicht: BEISPIEL, reserviert: KOPF, G: 5, art: 'verhaeltnis', mindest: mindest(784) })
  assert.deepStrictEqual(lagen(v), ['5,38,241,155', '251,38,188,155', '444,38,335,155', '5,198,258,113', '268,198,238,113', '511,198,268,113'])
  const n = anordnen({ ansicht: BEISPIEL, reserviert: KOPF, G: 5, art: 'verteilen', mindest: mindest(784) })
  assert.ok(n.ok)
  n.plaetze.forEach((q, i) => { assert.strictEqual(q.b, BEISPIEL.plaetze[i].b); assert.strictEqual(q.h, BEISPIEL.plaetze[i].h) })
  // erste Zeile: Lücken genau 5, Ränder links und rechts gleich (±1 px Rundung)
  const z = n.plaetze.slice(0, 3)
  assert.strictEqual(z[1].x - z[0].x - z[0].b, 5); assert.strictEqual(z[2].x - z[1].x - z[1].b, 5)
  assert.ok(Math.abs(z[0].x - (784 - z[2].x - z[2].b)) <= 1)
  assert.strictEqual(n.abstand, 5)
})

test('Elektro 800 × 480 bleibt Pixel für Pixel gleich (mit Kopfzeile und Flüge-Feld)', () => {
  const b = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/luas/elektro.json'), 'utf8'))
  const a = b.standard.ansichten.find((x) => x.breite === 800)
  const res = b.reserviert.filter((x) => x.breite === 800 && x.hoehe === 480)
  for (const art of ['gleich', 'verhaeltnis']) {
    const r = anordnen({ ansicht: a, reserviert: res, G: 8, art, mindest: mindest(800) })
    assert.ok(r.ok, art)
    r.plaetze.forEach((q, i) => assert.deepStrictEqual([q.x, q.y, q.b, q.h], [a.plaetze[i].x, a.plaetze[i].y, a.plaetze[i].b, a.plaetze[i].h], `${art} Platz ${i}`))
    assert.ok(r.hinweise.includes('festeSpalte'))
  }
})

test('Alle Standardbelegungen, zufällig verschoben: nie auf reservierten Flächen, nie überlappend, im Bild', () => {
  const dir = path.join(__dirname, '../src/luas')
  let s = 7
  const zufall = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  let geprueft = 0
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    for (const a of (b.standard && b.standard.ansichten) || []) {
      const res = (b.reserviert || []).filter((x) => x.breite === a.breite && x.hoehe === a.hoehe)
      for (let k = 0; k < 20; k++) {
        const v = { ...a, plaetze: a.plaetze.map((p) => ({ ...p, x: p.x + Math.round((zufall() - 0.5) * 6), y: p.y + Math.round((zufall() - 0.5) * 6) })) }
        for (const art of ['gleich', 'verhaeltnis', 'verteilen', 'raster']) {
          const r = art === 'raster' ? raster({ ansicht: v, reserviert: res, G: 5, mindest: mindest(a.breite) }) : anordnen({ ansicht: v, reserviert: res, G: 5, art, mindest: mindest(a.breite) })
          if (!r.ok) continue
          geprueft++
          r.plaetze.forEach((q, i) => {
            assert.ok(q.x >= 0 && q.y >= 0 && q.x + q.b <= a.breite && q.y + q.h <= a.hoehe, `${f} ${art} im Bild`)
            assert.ok(Number.isInteger(q.x) && Number.isInteger(q.b) && Number.isInteger(q.y) && Number.isInteger(q.h))
            assert.ok(!res.some((x) => ueberlappt(q, x)), `${f} ${a.breite} ${art} Platz ${i} auf reservierter Fläche`)
            r.plaetze.forEach((o, j) => { if (j > i) assert.ok(!ueberlappt(q, o), `${f} ${art} ${i}/${j} überlappen`) })
          })
        }
      }
    }
  }
  assert.ok(geprueft > 300, String(geprueft))
})

test('Windrad: keine Zerlegung, Raster hilft', () => {
  const a = { breite: 784, hoehe: 316, plaetze: [
    { x: 0, y: 0, b: 500, h: 100 }, { x: 500, y: 0, b: 284, h: 200 }, { x: 284, y: 200, b: 500, h: 116 }, { x: 0, y: 100, b: 284, h: 216 }, { x: 284, y: 100, b: 216, h: 100 }] }
  const r = anordnen({ ansicht: a, reserviert: [], G: 5, art: 'gleich', mindest: mindest(784) })
  assert.deepStrictEqual(r, { ok: false, grund: 'verschachtelt' })
  const q = raster({ ansicht: a, reserviert: [], G: 5, mindest: mindest(784) })
  assert.ok(q.ok)
})

test('Zu klein und zu eng: nichts anwenden, Kästchen nennen', () => {
  const a = { breite: 784, hoehe: 316, plaetze: Array.from({ length: 8 }, (_, i) => ({ x: i * 98, y: 40, b: 95, h: 120, darstellung: 'ring' })) }
  const r = anordnen({ ansicht: a, reserviert: KOPF, G: 5, art: 'gleich', mindest: mindest(784) })
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.grund, 'zuKlein')
  assert.strictEqual(typeof r.index, 'number')
  assert.deepStrictEqual(r.mindest, [108, 108])
  assert.deepStrictEqual(anordnen({ ansicht: { breite: 800, hoehe: 480, plaetze: [] } }), { ok: false, grund: 'leer' })
})

test('Ganze Pixel: Summe stimmt, Rest an die grössten Nachkommastellen', () => {
  assert.deepStrictEqual(ganzePixel([254.67, 254.67, 254.66], 764), [255, 255, 254])
  assert.deepStrictEqual(ganzePixel([10, 10], 20), [10, 10])
})

test('Nachprüfung 0.4.0: alle Standardbelegungen mit allen Arten ok; Nur verteilen mit gleichen Lücken', () => {
  const dir = path.join(__dirname, '../src/luas')
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    for (const a of (b.standard && b.standard.ansichten) || []) {
      const res = (b.reserviert || []).filter((x) => x.breite === a.breite && x.hoehe === a.hoehe)
      const G = a.breite === 800 ? 8 : 5
      for (const art of ['gleich', 'verhaeltnis', 'verteilen']) {
        const r = anordnen({ ansicht: a, reserviert: res, G, art, mindest: mindest(a.breite) })
        assert.ok(r.ok, `${f} ${a.breite} ${art}: ${JSON.stringify(r)}`)
        if (art !== 'verteilen') continue
        // Nachbarn ohne etwas dazwischen: Lücke genau r.abstand
        const P = r.plaetze
        P.forEach((p, i) => P.forEach((q, j) => {
          if (i === j) return
          const zwischenX = P.some((o) => o !== p && o !== q && o.x >= p.x + p.b && o.x + o.b <= q.x && o.y < p.y + p.h && p.y < o.y + o.h)
          if (p.y < q.y + q.h && q.y < p.y + p.h && q.x >= p.x + p.b && !zwischenX) assert.strictEqual(q.x - p.x - p.b, r.abstand, `${f} ${a.breite} x ${i}/${j}`)
          const zwischenY = P.some((o) => o !== p && o !== q && o.y >= p.y + p.h && o.y + o.h <= q.y && o.x < p.x + p.b && p.x < o.x + o.b)
          if (p.x < q.x + q.b && q.x < p.x + p.b && q.y >= p.y + p.h && !zwischenY) assert.strictEqual(q.y - p.y - p.h, r.abstand, `${f} ${a.breite} y ${i}/${j}`)
        }))
        P.forEach((q, i) => assert.deepStrictEqual([q.b, q.h], [a.plaetze[i].b, a.plaetze[i].h], 'Grössen bleiben'))
      }
    }
  }
  // Elektro 800 × 480 bleibt auch bei «Nur verteilen» gleich
  const b = JSON.parse(fs.readFileSync(path.join(dir, 'elektro.json'), 'utf8'))
  const a = b.standard.ansichten.find((x) => x.breite === 800)
  const r = anordnen({ ansicht: a, reserviert: b.reserviert.filter((x) => x.breite === 800), G: 8, art: 'verteilen', mindest: mindest(800) })
  r.plaetze.forEach((q, i) => assert.deepStrictEqual([q.x, q.y], [a.plaetze[i].x, a.plaetze[i].y]))
  // ein Kästchen allein in einer Zeile kommt in die Mitte
  const e = anordnen({ ansicht: { breite: 400, hoehe: 300, plaetze: [{ x: 150, y: 20, b: 100, h: 80 }, { x: 100, y: 150, b: 200, h: 80 }] }, reserviert: [], G: 5, art: 'verteilen', mindest: mindest(400) })
  assert.deepStrictEqual(e.plaetze.map((q) => q.x), [150, 100])
  assert.strictEqual(e.plaetze[1].y - e.plaetze[0].y - 80, 5)
})

test('Nachprüfung 0.4.0: Überlappung und reservierte Fläche werden vorher gemeldet', () => {
  const u = anordnen({ ansicht: { breite: 784, hoehe: 316, plaetze: [{ x: 10, y: 40, b: 200, h: 120 }, { x: 150, y: 100, b: 200, h: 120 }] }, reserviert: KOPF, G: 5, mindest: mindest(784) })
  assert.deepStrictEqual([u.grund, u.index, u.index2], ['ueberlappt', 0, 1])
  const r = anordnen({ ansicht: { breite: 800, hoehe: 480, plaetze: [{ x: 10, y: 300, b: 300, h: 150 }] }, reserviert: [{ x: 100, y: 400, b: 100, h: 40 }], G: 8, mindest: mindest(800) })
  assert.deepStrictEqual([r.grund, r.index], ['reserviert', 0])
})

test('Raster: unvollständige letzte Zeile füllt den freien Platz der Zeile (Sendertest 21.11.: 11 Kästchen Elektro 800 × 480)', () => {
  const AN = require('../src/studio/anordnen')
  const b = require('../src/luas/elektro.json')
  const res = b.reserviert.filter((r) => r.breite === 800 && r.hoehe === 480)
  const plaetze = Array.from({ length: 11 }, (_, i) => ({ x: (i % 5) * 150, y: 60 + Math.floor(i / 5) * 130, b: 140, h: 120, darstellung: 'zahl' }))
  const r = AN.raster({ ansicht: { breite: 800, hoehe: 480, plaetze }, reserviert: res, G: 8, mindest: { zahl: [60, 40] } })
  assert.ok(r.ok, r.grund)
  const letzte = r.plaetze[10]
  assert.deepStrictEqual([letzte.x, letzte.b], [248, 544], 'rechts neben «Flüge» (8…240) mit Abstand 8 bis zum Rand')
  // zwei Kästchen in der letzten Zeile ohne Hindernis: je die halbe Breite
  const p12 = Array.from({ length: 12 }, (_, i) => ({ x: (i % 5) * 150, y: 60 + Math.floor(i / 5) * 130, b: 140, h: 120, darstellung: 'zahl' }))
  const r2 = AN.raster({ ansicht: { breite: 800, hoehe: 480, plaetze: p12 }, reserviert: [], G: 8, mindest: { zahl: [60, 40] } })
  assert.ok(r2.ok)
  const z = r2.plaetze.filter((p) => p.y === r2.plaetze[11].y)
  assert.ok(z.length < 5 || z.every((p) => p.b === z[0].b), 'volle Zeilen bleiben gleich')
  const zuletzt = r2.plaetze.slice(-2)
  if (zuletzt[0].y === zuletzt[1].y && r2.plaetze.filter((p) => p.y === zuletzt[0].y).length === 2) {
    assert.strictEqual(zuletzt[0].x, 8); assert.strictEqual(zuletzt[1].x + zuletzt[1].b, 792)
    assert.strictEqual(zuletzt[1].x - (zuletzt[0].x + zuletzt[0].b), 8)
  }
  // Lücken und Überlappung: keine zwei Kästchen überlappen, keines auf der reservierten Fläche
  for (const p of r.plaetze) for (const q of r.plaetze) if (p !== q) assert.ok(!(p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h))
})

test('Raster: Lücke neben «Flüge» wird auch gefüllt, wenn die letzte Zeile gleich viele Kästchen wie freie Zellen hat (Prüfbefund 0.4.1)', () => {
  const AN = require('../src/studio/anordnen')
  const res = require('../src/luas/elektro.json').reserviert.filter((r) => r.breite === 800 && r.hoehe === 480)
  for (const n of [3, 10]) {
    const plaetze = Array.from({ length: n }, (_, i) => ({ x: (i % 4) * 190, y: 60 + Math.floor(i / 4) * 130, b: 180, h: 120, darstellung: 'zahl' }))
    const r = AN.raster({ ansicht: { breite: 800, hoehe: 480, plaetze }, reserviert: res, G: 8, mindest: { zahl: [60, 40] } })
    assert.ok(r.ok, r.grund)
    const y = Math.max(...r.plaetze.map((p) => p.y))
    const zeile = r.plaetze.filter((p) => p.y === y).sort((p, q) => p.x - q.x)
    if (zeile.some((p) => p.y < 432 + 40 && p.y + p.h > 432)) assert.strictEqual(zeile[0].x, 248, `n=${n}: beginnt rechts neben «Flüge»`)
    assert.strictEqual(zeile[zeile.length - 1].x + zeile[zeile.length - 1].b, 792, `n=${n}: bis zum Rand`)
  }
})
