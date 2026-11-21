'use strict'
// Test-Kanal: spielt die Funke-Seite des Fernsteuerprotokolls und reicht die Befehle an einen
// Ethos-Simulator weiter (run_wasm.js --serve --port <eigener Port>). So läuft der ganze Protokollweg
// des Studios (Rahmen, Kacheln, QOI, Freigabe, Log) auch ohne echte Funke.

const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const zlib = require('zlib')
const { BEFEHL, EREIGNIS, MAX_NUTZDATEN, rahmenBauen, RahmenLeser, Leser } = require('./rahmen')

const KACHEL = 32

// ---------- PNG lesen (8 Bit RGB/RGBA, nicht verschachtelt) ----------
function pngLesen(buf) {
  let p = 8, breite = 0, hoehe = 0, farbtyp = 0
  const idat = []
  while (p < buf.length) {
    const laenge = buf.readUInt32BE(p)
    const typ = buf.toString('ascii', p + 4, p + 8)
    const d = buf.subarray(p + 8, p + 8 + laenge)
    if (typ === 'IHDR') {
      breite = d.readUInt32BE(0); hoehe = d.readUInt32BE(4); farbtyp = d[9]
      if (d[8] !== 8 || (farbtyp !== 2 && farbtyp !== 6) || d[12] !== 0) throw new Error('PNG-Format nicht unterstützt')
    } else if (typ === 'IDAT') idat.push(d)
    p += 12 + laenge
  }
  const bpp = farbtyp === 6 ? 4 : 3
  const roh = zlib.inflateSync(Buffer.concat(idat))
  const zeile = breite * bpp
  const out = Buffer.alloc(hoehe * zeile)
  for (let y = 0; y < hoehe; y++) {
    const f = roh[y * (zeile + 1)]
    for (let x = 0; x < zeile; x++) {
      const v = roh[y * (zeile + 1) + 1 + x]
      const a = x >= bpp ? out[y * zeile + x - bpp] : 0
      const b = y ? out[(y - 1) * zeile + x] : 0
      const c = x >= bpp && y ? out[(y - 1) * zeile + x - bpp] : 0
      let w
      if (f === 0) w = v
      else if (f === 1) w = v + a
      else if (f === 2) w = v + b
      else if (f === 3) w = v + ((a + b) >> 1)
      else { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); w = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
      out[y * zeile + x] = w & 255
    }
  }
  const rgb565 = new Uint16Array(breite * hoehe)
  for (let i = 0; i < rgb565.length; i++) {
    const o = i * bpp
    rgb565[i] = ((out[o] >> 3) << 11) | ((out[o + 1] >> 2) << 5) | (out[o + 2] >> 3)
  }
  return { breite, hoehe, pixel: rgb565 }
}

// ---------- QOI schreiben (RGB, nur RUN / INDEX / RGB) ----------
function qoiSchreiben(breite, hoehe, rgb565) {
  const teile = []
  const kopf = Buffer.alloc(14)
  kopf.write('qoif', 0, 'ascii'); kopf.writeUInt32BE(breite, 4); kopf.writeUInt32BE(hoehe, 8); kopf[12] = 3; kopf[13] = 0
  teile.push(kopf)
  const index = new Int32Array(64).fill(-1)
  let vor = -1, lauf = 0
  const bytes = []
  const farbe = (p) => [(((p >> 11) & 31) * 255 / 31) | 0, (((p >> 5) & 63) * 255 / 63) | 0, ((p & 31) * 255 / 31) | 0]
  for (let i = 0; i < rgb565.length; i++) {
    const [r, g, b] = farbe(rgb565[i])
    const schluessel = (r << 16) | (g << 8) | b
    if (schluessel === vor) {
      lauf++
      if (lauf === 62) { bytes.push(0xC0 | 61); lauf = 0 }
      continue
    }
    if (lauf) { bytes.push(0xC0 | (lauf - 1)); lauf = 0 }
    const k = (r * 3 + g * 5 + b * 7 + 255 * 11) % 64
    if (index[k] === schluessel) bytes.push(k)
    else { index[k] = schluessel; bytes.push(0xFE, r, g, b) }
    vor = schluessel
  }
  if (lauf) bytes.push(0xC0 | (lauf - 1))
  teile.push(Buffer.from(bytes), Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]))
  return Buffer.concat(teile)
}
// Hinweis: Der erste Pixel ist nie ein RUN, weil vor = -1; Startwert des QOI-Dekoders ist (0,0,0,255).
// Das Ergebnis ist darum auch für schwarze Startpixel korrekt (RGB-Befehl statt RUN).

// ---------- Simulator per HTTP ----------
function simAnfrage(port, befehl, werte = {}) {
  const qs = new URLSearchParams(werte).toString()
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: `/${befehl}${qs ? '?' + qs : ''}`, timeout: 20000 }, (res) => {
      const teile = []
      res.on('data', (c) => teile.push(c))
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(teile).toString('utf8'))) } catch { resolve({ ok: false }) } })
    })
    req.on('error', (e) => resolve({ ok: false, error: e.message, netz: true }))
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')))
  })
}

function simPost(port, befehl, koerper) {
  const daten = Buffer.from(JSON.stringify(koerper), 'utf8')
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, path: `/${befehl}`, method: 'POST', timeout: 20000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': daten.length } }, (res) => {
      const teile = []
      res.on('data', (c) => teile.push(c))
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(teile).toString('utf8'))) } catch { resolve({ ok: false }) } })
    })
    req.on('error', (e) => resolve({ ok: false, error: e.message, netz: true }))
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')))
    req.end(daten)
  })
}

const STATUS_NAME = { success: 0, unsupported: -1, refused: -2, 'invalid argument': -3, 'I/O error': -4, busy: -5, timeout: -6 }
function simStatus(antwort) {
  if (antwort.ok) return 0
  if (antwort.status && STATUS_NAME[antwort.status] !== undefined) return STATUS_NAME[antwort.status]
  if (antwort.status && /woke/.test(antwort.status)) return -7
  return -4
}

// Öffnet den Test-Kanal. freigabeMs: so lange «wartet» die gespielte Funke, bis sie die Fernsteuerung erlaubt.
async function simulatorOeffnen(port, { freigabeMs = 800 } = {}) {
  const info = await simAnfrage(port, 'getInformation')
  if (!info.ok) throw new Error(`simulatorFehlt|${port}`)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-sim-'))
  let datenFn = () => {}, endeFn = () => {}
  let offen = true, erlaubt = false, logSeit, gesendet = null
  let kette = Promise.resolve()
  let schreibPuffer = { pfad: null, daten: Buffer.alloc(0) }
  // Der Simulator hat nur einen Speicher: «SD:/x» und «RADIO:/x» werden zu «/x». «RADIO:/» gibt es nicht (wie eine Funke ohne Laufwerke).
  const simPfad = (p) => (/^RADIO:/i.test(p) ? null : '/' + String(p).replace(/^SD:/i, '').replace(/^\/+/, ''))

  const senden = (befehl, folge, d) => { if (offen) setImmediate(() => datenFn(rahmenBauen(befehl, folge, d))) }
  // Antwort in Stücken: Status (int8), Merker (Bit 0 = letztes Stück), Daten
  const antworten = (befehl, folge, status, daten = Buffer.alloc(0)) => {
    const platz = MAX_NUTZDATEN - 2
    let pos = 0
    do {
      const stueck = daten.subarray(pos, pos + platz)
      pos += stueck.length
      const kopf = Buffer.alloc(2); kopf.writeInt8(status); kopf[1] = pos >= daten.length ? 1 : 0
      senden(befehl | 0x80, folge, Buffer.concat([kopf, stueck]))
    } while (pos < daten.length)
  }

  const bildschirm = async (ganz) => {
    const datei = path.join(tmp, 'bild.png')
    const a = await simAnfrage(port, 'screenshot', { out: datei, quiet: 30 })
    if (!a.ok) return null
    const b = pngLesen(fs.readFileSync(datei))
    const kx = Math.ceil(b.breite / KACHEL), ky = Math.ceil(b.hoehe / KACHEL)
    const bitfeld = Buffer.alloc(Math.ceil(kx * ky / 8))
    const geaendert = []
    const neuAnfang = ganz || !gesendet || gesendet.breite !== b.breite || gesendet.hoehe !== b.hoehe
    for (let i = 0; i < kx * ky; i++) {
      const x0 = (i % kx) * KACHEL, y0 = Math.floor(i / kx) * KACHEL
      let anders = neuAnfang
      for (let y = y0; !anders && y < Math.min(y0 + KACHEL, b.hoehe); y++) {
        for (let x = x0; x < Math.min(x0 + KACHEL, b.breite); x++) {
          if (b.pixel[y * b.breite + x] !== gesendet.pixel[y * b.breite + x]) { anders = true; break }
        }
      }
      if (anders) { geaendert.push(i); bitfeld[i >> 3] |= 1 << (i & 7) }
    }
    const stapel = new Uint16Array(KACHEL * KACHEL * geaendert.length)
    geaendert.forEach((i, n) => {
      const x0 = (i % kx) * KACHEL, y0 = Math.floor(i / kx) * KACHEL
      for (let z = 0; z < KACHEL && y0 + z < b.hoehe; z++) {
        const w = Math.min(KACHEL, b.breite - x0)
        stapel.set(b.pixel.subarray((y0 + z) * b.breite + x0, (y0 + z) * b.breite + x0 + w), (n * KACHEL + z) * KACHEL)
      }
    })
    gesendet = b
    const kopf = Buffer.alloc(5); kopf.writeUInt16LE(b.breite); kopf.writeUInt16LE(b.hoehe, 2); kopf[4] = KACHEL
    return Buffer.concat([kopf, bitfeld, geaendert.length ? qoiSchreiben(KACHEL, KACHEL * geaendert.length, stapel) : Buffer.alloc(0)])
  }

  const ausfuehren = async (befehl, folge, d) => {
    const r = new Leser(Buffer.from(d))
    if (befehl === BEFEHL.HELLO) {
      const fw = String(info.firmware || '26.2.0').split(/[.-]/).map(Number)
      const antwort = Buffer.concat([
        Buffer.from([11, fw[0] || 0, fw[1] || 0, fw[2] || 0]),
        Buffer.from(`${info.board || 'SIM'}\0EU\0simulator\0\0`, 'utf8'),
      ])
      antworten(befehl, folge, 0, antwort)
      setTimeout(() => { erlaubt = true; senden(EREIGNIS.CONNECTION, 0, Buffer.from([1])) }, freigabeMs)
      return
    }
    if (!erlaubt) return antworten(befehl, folge, -2)
    let a
    switch (befehl) {
      case BEFEHL.RESET_INACTIVITY_TIMER: return antworten(befehl, folge, 0)
      case BEFEHL.SCREENSHOT: {
        const daten = await bildschirm(d[1] === 1)
        return daten ? antworten(befehl, folge, 0, daten) : antworten(befehl, folge, -4)
      }
      case BEFEHL.PRESS: { const ms = r.u32(); a = await simAnfrage(port, 'press', { name: r.text(), ms }); break }
      case BEFEHL.TOUCH: { const x = d.readUInt16LE(0), y = d.readUInt16LE(2), ms = d.readUInt32LE(4); a = await simAnfrage(port, 'touch', { x, y, ms }); break }
      case BEFEHL.SWIPE: a = await simAnfrage(port, 'swipe', { x1: d.readUInt16LE(0), y1: d.readUInt16LE(2), x2: d.readUInt16LE(4), y2: d.readUInt16LE(6) }); break
      case BEFEHL.TURN_ROTARY_ENCODER: a = await simAnfrage(port, 'turnRotaryEncoder', { steps: d.readInt16LE(0) }); break
      case BEFEHL.ENTER_TEXT: a = await simAnfrage(port, 'enterText', { text: r.text() }); break
      case BEFEHL.RESET_BACKLIGHT_TIMER: a = await simAnfrage(port, 'resetBacklightTimer'); break
      case BEFEHL.LIST_FILES: {
        const p = simPfad(r.text())
        if (p === null) return antworten(befehl, folge, -4)
        a = await simAnfrage(port, 'listFiles', { path: p })
        if (!a.ok) return antworten(befehl, folge, -4)
        const teile = a.files.map((f) => { const k = Buffer.alloc(5); k[0] = f.isDirectory ? 1 : 0; k.writeUInt32LE(f.size, 1); return Buffer.concat([k, Buffer.from(f.name + '\0', 'utf8')]) })
        return antworten(befehl, folge, 0, Buffer.concat(teile))
      }
      case BEFEHL.READ_FILE: {
        r.u32()
        const p = simPfad(r.text())
        a = p === null ? { ok: false } : await simAnfrage(port, 'readFile', { path: p })
        if (!a.ok) return antworten(befehl, folge, -4)
        return antworten(befehl, folge, 0, a.text !== undefined ? Buffer.from(a.text, 'utf8') : Buffer.from(a.base64, 'base64'))
      }
      case BEFEHL.WRITE_FILE: {
        const pos = r.u32()
        const p = simPfad(r.text())
        if (p === null) return antworten(befehl, folge, -4)
        const teil = Buffer.from(d.subarray(r.pos))
        const alt = pos > 0 && schreibPuffer.pfad === p ? schreibPuffer.daten.subarray(0, pos) : Buffer.alloc(0)
        schreibPuffer = { pfad: p, daten: Buffer.concat([alt, teil]) }
        // Nicht über «writeFile» von run_wasm.js: Das schreibt bei kleinen Dateien falsche Bytes (Plugin 0.3.0, 20.11.2026,
        // vermutlich geteilter Node-Puffer ohne byteOffset). Stattdessen schreibt ein Lua-Makro die Bytes mit io.open.
        const lua = (s) => '"' + [...Buffer.from(s, 'utf8')].map((b) => '\\' + b).join('') + '"'
        const inhalt = '"' + [...schreibPuffer.daten].map((b) => '\\' + b).join('') + '"'
        a = await simPost(port, 'startMacro', { code: `local f = io.open(${lua(p)}, "wb") if not f then error("offen") end f:write(${inhalt}) f:close()` })
        break
      }
      case BEFEHL.DELETE_FILE: { const p = simPfad(r.text()); a = p === null ? { ok: false } : await simAnfrage(port, 'deleteFile', { path: p }); break }
      case BEFEHL.CREATE_DIRECTORY: { const p = simPfad(r.text()); a = p === null ? { ok: false } : await simAnfrage(port, 'createDirectory', { path: p }); break }
      case BEFEHL.LOAD_MODEL: a = await simAnfrage(port, 'loadModel', { path: r.text() }); break
      default: return antworten(befehl, folge, -1)
    }
    if (a.netz) return beenden('simulatorWeg')
    return antworten(befehl, folge, simStatus(a))
  }

  const leser = new RahmenLeser((befehl, folge, d) => {
    const kopie = Buffer.from(d)
    // Die Funke arbeitet die Befehle nacheinander ab
    kette = kette.then(() => ausfuehren(befehl, folge, kopie)).catch(() => antworten(befehl, folge, -4))
  })

  // Lua-Log des Simulators als EVENT_LOG weitergeben
  const logUhr = setInterval(async () => {
    if (!erlaubt || !offen) return
    const a = await simAnfrage(port, 'getLog', logSeit === undefined ? {} : { since: logSeit })
    if (a.netz) return beenden('simulatorWeg')
    if (!a.ok) return
    if (logSeit !== undefined && (a.lines || []).length) {
      // Als Strom mit Zeilenenden und in kleinen Stücken senden, wie die Firmware (Zeilen dürfen zerrissen ankommen)
      const strom = Buffer.from(a.lines.map((z) => `\x1b[0m${z}\r\n`).join(''), 'utf8')
      for (let i = 0; i < strom.length; i += 17) senden(EREIGNIS.LOG, 0, strom.subarray(i, i + 17))
    }
    logSeit = a.next
  }, 1000)

  function beenden(grund) {
    if (!offen) return
    offen = false
    clearInterval(logUhr)
    fs.rmSync(tmp, { recursive: true, force: true })
    endeFn(grund)
  }

  return {
    schreiben: (buf) => { if (!offen) throw new Error('Kanal zu'); leser.futtern(buf) },
    beiDaten: (fn) => { datenFn = fn },
    beiEnde: (fn) => { endeFn = fn },
    schliessen: () => beenden('getrennt'),
  }
}

module.exports = { simulatorOeffnen, pngLesen, qoiSchreiben, KACHEL }
