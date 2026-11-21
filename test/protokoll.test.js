'use strict'
// Tests für Rahmen, CRC, QOI und Kacheln. Wo das Ethos-Plugin installiert ist, wird zusätzlich gegen
// die Python-Vorlage radio_remote.py verglichen (gleiche Eingabe -> gleiches Ergebnis).

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { crc16, rahmenBauen, RahmenLeser } = require('../src/geraet/rahmen')
const { qoiDekodieren, kachelnDekodieren, zuRgba } = require('../src/geraet/bild')
const { qoiSchreiben, KACHEL } = require('../src/geraet/kanal-simulator')

function pluginBasis() {
  // Ordner des «ethos-tools plugin» (enthält Versionsordner mit radio_remote.py bzw. run_wasm.js), über ETHOS_TOOLS_DIR
  const basis = process.env.ETHOS_TOOLS_DIR || ''
  if (!basis) console.log('Hinweis: ETHOS_TOOLS_DIR nicht gesetzt (Ordner des ethos-tools plugin) – Abgleich übersprungen')
  return basis
}
function zufall(n, saat = 1) {
  const b = Buffer.alloc(n)
  let s = saat
  for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; b[i] = s >> 16 }
  return b
}

// Ein Testbild: Flächen, Verläufe und Rauschen (alle QOI-Fälle des Schreibers)
function testbild(breite, hoehe, saat = 7) {
  const p = new Uint16Array(breite * hoehe)
  const r = zufall(p.length, saat)
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    const i = y * breite + x
    p[i] = x < breite / 3 ? 0x001F : x < (2 * breite) / 3 ? ((x & 31) << 11) | (y & 63) << 5 : (r[i] * 257) & 0xFFFF
  }
  return p
}

function pluginPfad() {
  const basis = pluginBasis()
  if (!basis) return null
  if (!fs.existsSync(basis)) return null
  const v = fs.readdirSync(basis).filter((n) => fs.existsSync(path.join(basis, n, 'radio_remote.py'))).sort()
  return v.length ? path.join(basis, v[v.length - 1]) : null
}

function python(code, eingabe) {
  const pfad = pluginPfad()
  return execFileSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(pfad)})\n${code}`], { input: eingabe, maxBuffer: 64 << 20 })
}

test('CRC-16/XMODEM: bekannter Prüfwert', () => {
  assert.strictEqual(crc16(Buffer.from('123456789')), 0x31C3)
})

test('Rahmen bauen und wieder lesen, auch zerstückelt und mit Störbytes', () => {
  const nutz = zufall(700, 3)
  const r1 = rahmenBauen(0x91, 5, nutz)
  const r2 = rahmenBauen(0xC3, 0, Buffer.from('hallo'))
  const kaputt = Buffer.from(r1); kaputt[10] ^= 0xFF
  const strom = Buffer.concat([Buffer.from([1, 2, 0xE7, 0xFF, 0xFF]), kaputt, r1, r2])
  const gesehen = []
  const leser = new RahmenLeser((b, f, d) => gesehen.push([b, f, Buffer.from(d)]))
  for (let i = 0; i < strom.length; i += 7) leser.futtern(strom.subarray(i, i + 7))
  assert.strictEqual(gesehen.length, 2)
  assert.deepStrictEqual(gesehen[0], [0x91, 5, nutz])
  assert.deepStrictEqual(gesehen[1], [0xC3, 0, Buffer.from('hallo')])
})

test('QOI: schreiben und lesen ergibt dasselbe Bild', () => {
  const p = testbild(KACHEL, KACHEL * 5)
  const b = qoiDekodieren(qoiSchreiben(KACHEL, KACHEL * 5, p))
  assert.strictEqual(b.breite, KACHEL)
  assert.deepStrictEqual(Array.from(b.pixel), Array.from(p))
})

test('Kacheln: ganzes Bild, dann nur geänderte Kacheln', () => {
  const breite = 100, hoehe = 70 // nicht durch 32 teilbar: Randkacheln
  const kx = Math.ceil(breite / KACHEL), ky = Math.ceil(hoehe / KACHEL)
  const voll = testbild(breite, hoehe, 11)
  const paket = (bild, liste) => {
    const bit = Buffer.alloc(Math.ceil(kx * ky / 8))
    const stapel = new Uint16Array(KACHEL * KACHEL * liste.length)
    liste.forEach((i, n) => {
      bit[i >> 3] |= 1 << (i & 7)
      const x0 = (i % kx) * KACHEL, y0 = Math.floor(i / kx) * KACHEL
      for (let z = 0; z < KACHEL && y0 + z < hoehe; z++) {
        const w = Math.min(KACHEL, breite - x0)
        stapel.set(bild.subarray((y0 + z) * breite + x0, (y0 + z) * breite + x0 + w), (n * KACHEL + z) * KACHEL)
      }
    })
    const kopf = Buffer.alloc(5); kopf.writeUInt16LE(breite); kopf.writeUInt16LE(hoehe, 2); kopf[4] = KACHEL
    return Buffer.concat([kopf, bit, liste.length ? qoiSchreiben(KACHEL, KACHEL * liste.length, stapel) : Buffer.alloc(0)])
  }
  const alle = [...Array(kx * ky).keys()]
  const b1 = kachelnDekodieren(paket(voll, alle), null)
  assert.deepStrictEqual(Array.from(b1.pixel), Array.from(voll))
  // Nur Teil ohne Vorbild: ungültig
  assert.strictEqual(kachelnDekodieren(paket(voll, [1]), null), null)
  // Eine Kachel ändern (Randkachel unten rechts)
  const neu = Uint16Array.from(voll)
  for (let y = 64; y < 70; y++) for (let x = 96; x < 100; x++) neu[y * breite + x] = 0xF800
  const b2 = kachelnDekodieren(paket(neu, [kx * ky - 1]), b1)
  assert.strictEqual(b2.geaendert, 1)
  assert.deepStrictEqual(Array.from(b2.pixel), Array.from(neu))
  // Nichts geändert
  const b3 = kachelnDekodieren(paket(neu, []), b2)
  assert.strictEqual(b3.geaendert, 0)
  // RGBA
  const rgba = zuRgba(b3)
  assert.deepStrictEqual([...rgba.subarray(((64 * breite) + 96) * 4, ((64 * breite) + 96) * 4 + 4)], [255, 0, 0, 255])
})

test('Vergleich mit radio_remote.py (CRC, QOI, Kacheln)', { skip: !pluginPfad() && 'Ethos-Plugin nicht installiert' }, () => {
  const daten = zufall(3000, 5)
  const crcPy = Number(python('import radio_remote as r; print(r.crc16(sys.stdin.buffer.read()))', daten).toString().trim())
  assert.strictEqual(crc16(daten), crcPy)

  const p = testbild(KACHEL, KACHEL * 3, 9)
  const qoi = qoiSchreiben(KACHEL, KACHEL * 3, p)
  const py = JSON.parse(python('import radio_remote as r, json; w,h,px = r.decode_qoi(sys.stdin.buffer.read()); print(json.dumps([w,h,px]))', qoi).toString())
  assert.deepStrictEqual(py, [KACHEL, KACHEL * 3, Array.from(qoiDekodieren(qoi).pixel)])

  const kopf = Buffer.alloc(5); kopf.writeUInt16LE(40); kopf.writeUInt16LE(40, 2); kopf[4] = KACHEL
  const stapel = new Uint16Array(KACHEL * KACHEL * 4)
  const quelle = testbild(40, 40, 13)
  ;[0, 1, 2, 3].forEach((i, n) => {
    const x0 = (i % 2) * KACHEL, y0 = Math.floor(i / 2) * KACHEL
    for (let z = 0; z < KACHEL && y0 + z < 40; z++) {
      const w = Math.min(KACHEL, 40 - x0)
      stapel.set(quelle.subarray((y0 + z) * 40 + x0, (y0 + z) * 40 + x0 + w), (n * KACHEL + z) * KACHEL)
    }
  })
  const paket = Buffer.concat([kopf, Buffer.from([0x0F]), qoiSchreiben(KACHEL, KACHEL * 4, stapel)])
  const pyK = JSON.parse(python('import radio_remote as r, json; w,h,px = r.decode_tiles(sys.stdin.buffer.read(), None); print(json.dumps(px))', paket).toString())
  assert.deepStrictEqual(Array.from(kachelnDekodieren(paket, null).pixel), pyK)
  assert.deepStrictEqual(pyK, Array.from(quelle))
})
