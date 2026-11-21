'use strict'
// Bildschirm der Funke: SCREENSHOT liefert nur die geänderten Kacheln als ein QOI-Bild (Kacheln untereinander).
// Nachgebaut nach decode_qoi / decode_tiles aus radio_remote.py. Pixel intern als RGB565.

function qoiDekodieren(d) {
  if (d.length < 22) return null
  const breite = d.readUInt32BE(4)
  const hoehe = d.readUInt32BE(8)
  const kanaele = d[12]
  if (kanaele !== 3 && kanaele !== 4) return null
  const n = breite * hoehe
  const pixel = new Uint16Array(n)
  const index = new Uint8Array(256)
  let r = 0, g = 0, b = 0, a = 255, lauf = 0, p = 14
  const ende = d.length - 8
  for (let x = 0; x < n; x++) {
    if (lauf > 0) {
      lauf--
    } else if (p < ende) {
      const s = d[p++]
      if (s === 0xFE) {
        r = d[p]; g = d[p + 1]; b = d[p + 2]; p += 3
      } else if (s === 0xFF) {
        r = d[p]; g = d[p + 1]; b = d[p + 2]; a = d[p + 3]; p += 4
      } else if ((s & 0xC0) === 0x00) {
        const k = (s & 0x3F) * 4
        r = index[k]; g = index[k + 1]; b = index[k + 2]; a = index[k + 3]
      } else if ((s & 0xC0) === 0x40) {
        r = (r + ((s >> 4) & 3) - 2) & 255
        g = (g + ((s >> 2) & 3) - 2) & 255
        b = (b + (s & 3) - 2) & 255
      } else if ((s & 0xC0) === 0x80) {
        const q = d[p++]
        const v = (s & 0x3F) - 32
        r = (r + v - 8 + ((q >> 4) & 15)) & 255
        g = (g + v) & 255
        b = (b + v - 8 + (q & 15)) & 255
      } else {
        lauf = s & 0x3F
      }
      const k = ((r * 3 + g * 5 + b * 7 + a * 11) % 64) * 4
      index[k] = r; index[k + 1] = g; index[k + 2] = b; index[k + 3] = a
    } else {
      return null
    }
    pixel[x] = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
  }
  return { breite, hoehe, pixel }
}

// Nutzdaten von SCREENSHOT: Breite (2), Höhe (2), Kachelgrösse (1), Bitfeld der geänderten Kacheln, QOI-Bild.
// vorher: letztes Bild {breite, hoehe, pixel} oder null. Ergebnis: neues Bild samt Liste der geänderten Kacheln.
function kachelnDekodieren(d, vorher) {
  if (d.length < 5) return null
  const breite = d.readUInt16LE(0)
  const hoehe = d.readUInt16LE(2)
  const kachel = d[4]
  if (!kachel) return null
  const kx = Math.ceil(breite / kachel)
  const ky = Math.ceil(hoehe / kachel)
  const bitLaenge = Math.ceil(kx * ky / 8)
  if (d.length < 5 + bitLaenge) return null
  const geaendert = []
  for (let i = 0; i < kx * ky; i++) if (d[5 + (i >> 3)] & (1 << (i & 7))) geaendert.push(i)
  const weiter = vorher && vorher.breite === breite && vorher.hoehe === hoehe
  if (geaendert.length < kx * ky && !weiter) return null
  const pixel = weiter ? Uint16Array.from(vorher.pixel) : new Uint16Array(breite * hoehe)
  if (geaendert.length) {
    const bildDaten = qoiDekodieren(d.subarray(5 + bitLaenge))
    if (!bildDaten || bildDaten.breite !== kachel || bildDaten.hoehe !== kachel * geaendert.length) return null
    geaendert.forEach((i, n) => {
      const x = (i % kx) * kachel
      const y = Math.floor(i / kx) * kachel
      const w = Math.min(kachel, breite - x)
      for (let zeile = 0; zeile < kachel && y + zeile < hoehe; zeile++) {
        const q = (n * kachel + zeile) * kachel
        pixel.set(bildDaten.pixel.subarray(q, q + w), (y + zeile) * breite + x)
      }
    })
  }
  return { breite, hoehe, pixel, geaendert: geaendert.length }
}

// RGB565 -> RGBA (für das Canvas der Oberfläche)
function zuRgba(bild) {
  const { breite, hoehe, pixel } = bild
  const out = Buffer.alloc(breite * hoehe * 4)
  for (let i = 0, o = 0; i < pixel.length; i++, o += 4) {
    const p = pixel[i]
    const r = (p >> 11) & 31, g = (p >> 5) & 63, b = p & 31
    out[o] = (r << 3) | (r >> 2)
    out[o + 1] = (g << 2) | (g >> 4)
    out[o + 2] = (b << 3) | (b >> 2)
    out[o + 3] = 255
  }
  return out
}

module.exports = { qoiDekodieren, kachelnDekodieren, zuRgba }
