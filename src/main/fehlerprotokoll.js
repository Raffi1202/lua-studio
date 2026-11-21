'use strict'
// Fehlerprotokoll von Lua-Studio: eine Textdatei im Datenordner der App, damit man nach einem Absturz beim Kumpel
// schnell sieht, was passiert ist. Reines Node (ohne Electron), damit es sich ohne App testen lässt.
//
// Dateien im Ordner <userData>/Protokoll:
//   lua-studio.log       laufendes Protokoll; erreicht es MAX_BYTE, wird es zu
//   lua-studio-alt.log   (die vorherige alte Datei fällt weg). Zusammen höchstens 2 × MAX_BYTE.
//   stufe.txt            aus | normal | ausfuehrlich (Standard normal)
//
// Jede Zeile: «2026-11-21 08:15:02.123 E bereich: text». Arten: K Kopf, I Ereignis, A ausführlich, W Warnung, E Fehler.
// Persönliche Daten: Der Benutzerordner wird überall durch «~» ersetzt; Modellnamen bleiben (zum Zuordnen nötig).
// Geschrieben wird synchron (appendFileSync), damit auch die letzte Zeile vor einem Absturz in der Datei steht.

const fs = require('fs')
const path = require('path')
const os = require('os')
const zlib = require('zlib')

const MAX_BYTE = 1024 * 1024
const STUFEN = ['aus', 'normal', 'ausfuehrlich']
const DATEI = 'lua-studio.log'
const ALT = 'lua-studio-alt.log'
const ZEILE_MAX = 4000            // Byte je Eintrag höchstens (Stack eingeschlossen)
const WIEDERHOLT_MAX = 5          // gleicher Fehler höchstens so oft je Start ausführlich, danach nur gezählt

function zeit(d = new Date()) {
  const z = (n, l = 2) => String(n).padStart(l, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${z(d.getMilliseconds(), 3)}`
}

// Benutzerordner (Mac /Users/<name>, Windows C:\Users\<name>) durch ~ ersetzen, auch in Schreibweise mit / statt \
// Windows: ohne Rücksicht auf Gross/Klein (C:\Users\Max = c:\users\max); 8.3-Kurznamen (RAPHAE~1) werden nicht erkannt.
function ohnePersoenliches(text, heim = os.homedir()) {
  let t = String(text)
  if (!heim || heim.length < 3) return t
  const windows = /^[A-Za-z]:[\\/]/.test(heim) || heim.includes('\\')
  const varianten = new Set([heim, heim.replace(/\\/g, '/'), heim.replace(/\//g, '\\')])
  for (const v of varianten) {
    if (windows) t = t.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '~')
    else t = t.split(v).join('~')
  }
  return t
}

// Name des seriellen Anschlusses ohne Seriennummer (macOS: /dev/cu.usbmodem5B5E1270521 -> /dev/cu.usbmodem…)
function anschlussKurz(pfad) {
  return String(pfad).replace(/(usbmodem|usbserial-?|wchusbserial|SLAB_USBtoUART|serial-?)[0-9A-Za-z_-]{4,}$/i, '$1…')
}

class Fehlerprotokoll {
  // ordner: Zielordner; maxByte: Grösse je Datei; heim: Benutzerordner (zum Ersetzen, Tests); jetzt: Uhr (Tests)
  constructor({ ordner, maxByte = MAX_BYTE, heim = os.homedir(), jetzt = () => new Date() }) {
    this.ordner = ordner
    this.maxByte = maxByte
    this.heim = heim
    this.jetzt = jetzt
    this.datei = path.join(ordner, DATEI)
    this.alt = path.join(ordner, ALT)
    this.stufeDatei = path.join(ordner, 'stufe.txt')
    this.gesehen = new Map()
    this.groesse = null
    this.kaputt = false           // Zeitpunkt (ms) des letzten Schreibfehlers; 60 s später neuer Versuch
    this.kopfZeilen = []
    this.stufe = this._stufeLesen()
  }

  _stufeLesen() {
    try {
      const s = fs.readFileSync(this.stufeDatei, 'utf8').trim()
      if (STUFEN.includes(s)) return s
    } catch { /* fehlt: Standard */ }
    return 'normal'
  }

  stufeSetzen(s) {
    if (!STUFEN.includes(s)) return false
    const vorher = this.stufe
    this.stufe = 'normal'
    if (vorher !== s) this._schreiben('I', 'protokoll', `Stufe ${vorher} -> ${s}`)
    this.stufe = s
    try { fs.mkdirSync(this.ordner, { recursive: true }); fs.writeFileSync(this.stufeDatei, s + '\n') } catch { /* nur Anzeige */ }
    return true
  }

  // art K/I/W/E brauchen «normal», A braucht «ausfuehrlich»
  an(art) {
    if (this.stufe === 'aus') return false
    return art !== 'A' || this.stufe === 'ausfuehrlich'
  }

  _schreiben(art, bereich, text) {
    if (!this.an(art)) return
    if (this.kaputt && Date.now() - this.kaputt < 60000) return
    let t = ohnePersoenliches(String(text).replace(/\r/g, ''), this.heim)
    if (Buffer.byteLength(t) > ZEILE_MAX) t = Buffer.from(t).subarray(0, ZEILE_MAX).toString('utf8') + ' …(gekürzt)'
    const zeile = `${zeit(this.jetzt())} ${art} ${bereich}: ${t.replace(/\n/g, '\n    ')}\n`
    try {
      if (this.groesse === null) {
        fs.mkdirSync(this.ordner, { recursive: true })
        try { this.groesse = fs.statSync(this.datei).size } catch { this.groesse = 0 }
      }
      let text = zeile
      if (this.groesse > 0 && this.groesse + Buffer.byteLength(zeile) > this.maxByte) {
        fs.renameSync(this.datei, this.alt)    // ersetzt die alte Datei
        this.groesse = 0
        // Kopf des Starts auch in der neuen Datei, damit Version und System nie fehlen
        const z = zeit(this.jetzt())
        text = this.kopfZeilen.map((k) => `${z} K start: ${k} (Fortsetzung)\n`).join('') + zeile
      }
      fs.appendFileSync(this.datei, text)
      this.groesse += Buffer.byteLength(text)
      if (this.kaputt) { this.kaputt = false }
    } catch (e) {
      // Datei nicht beschreibbar (Platte voll, Datei gesperrt): einmal melden, 60 s später neu versuchen; die App läuft weiter
      if (!this.kaputt) { try { console.error('Fehlerprotokoll nicht beschreibbar:', e.message) } catch { /* egal */ } }
      this.kaputt = Date.now()
      this.groesse = null
    }
  }

  kopf(zeilen) {
    this.kopfZeilen = zeilen.map((z) => ohnePersoenliches(z, this.heim))
    for (const z of zeilen) this._schreiben('K', 'start', z)
  }
  info(bereich, text) { this._schreiben('I', bereich, text) }
  warnung(bereich, text) { this._schreiben('W', bereich, text) }
  ausfuehrlich(bereich, text) { if (this.an('A')) this._schreiben('A', bereich, typeof text === 'function' ? text() : text) }

  // Fehler mit Stack. Gleicher Fehler (Bereich + Meldung) ab dem 6. Mal nur noch jede 100. Wiederholung als Zählzeile.
  // Rückgabe: wie oft dieser Fehler seit dem Start kam (1 = erstes Mal)
  _zaehlen(schluessel) {
    const n = (this.gesehen.get(schluessel) || 0) + 1
    if (this.gesehen.size < 500 || this.gesehen.has(schluessel)) this.gesehen.set(schluessel, n)
    return n
  }

  fehler(bereich, e, zusatz) {
    const meldung = e && e.message !== undefined ? String(e.message) : String(e)
    const n = this._zaehlen(`${bereich}|${meldung}`.slice(0, 300))
    if (n > WIEDERHOLT_MAX) {
      if (n % 100 === 0) this._schreiben('E', bereich, `${meldung} (${n}× seit Start)`)
      return n
    }
    const stack = e && e.stack ? String(e.stack) : ''
    let text = meldung + (zusatz ? ` [${zusatz}]` : '')
    if (stack) text += '\n' + stack.split('\n').filter((z, i) => i > 0 || !z.includes(meldung)).slice(0, 15).join('\n').trim()
    if (n === WIEDERHOLT_MAX) text += '\n(weitere gleiche Fehler werden nur gezählt)'
    this._schreiben('E', bereich, text)
    return n
  }

  // Warnung mit Wiederholungszählung (z. B. Fehlerzeilen aus dem Lua-Log der Funke): Zahlen zählen nicht zum Schlüssel
  warnungGezaehlt(bereich, text) {
    const n = this._zaehlen(`W|${bereich}|${String(text).replace(/\d+/g, '#')}`.slice(0, 300))
    if (n <= WIEDERHOLT_MAX) this._schreiben('W', bereich, n === WIEDERHOLT_MAX ? `${text}\n(weitere gleiche Zeilen werden nur gezählt)` : text)
    else if (n % 100 === 0) this._schreiben('W', bereich, `${text} (${n}× seit Start)`)
  }

  // Inhalt beider Dateien (alt zuerst), höchstens die letzten maxByte Byte
  lesen(maxByte = 256 * 1024) {
    let t = ''
    for (const d of [this.alt, this.datei]) { try { t += fs.readFileSync(d, 'utf8') } catch { /* fehlt */ } }
    const b = Buffer.from(t)
    return b.length > maxByte ? '…\n' + b.subarray(b.length - maxByte).toString('utf8') : t
  }

  loeschen() {
    for (const d of [this.alt, this.datei]) { try { fs.rmSync(d, { force: true }) } catch { /* weg */ } }
    this.groesse = 0
    this.gesehen.clear()
    this.kaputt = false
    this.info('protokoll', 'gelöscht')
  }
}

// ---------- ZIP für den Support (ohne Abhängigkeit; Deflate über zlib) ----------
let crcTabelle = null
function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0
  if (!crcTabelle) {
    crcTabelle = new Uint32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTabelle[n] = c >>> 0 }
  }
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTabelle[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// dateien: [{ name, daten (Buffer|String) }] -> Buffer einer ZIP-Datei (Namen UTF-8, Zeit = jetzt)
function zipBauen(dateien, jetzt = new Date()) {
  const dosZeit = (jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1)
  const dosDatum = ((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate()
  const teile = [], verzeichnis = []
  let lage = 0
  for (const d of dateien) {
    const roh = Buffer.isBuffer(d.daten) ? d.daten : Buffer.from(String(d.daten), 'utf8')
    const gepackt = zlib.deflateRawSync(roh)
    const name = Buffer.from(d.name, 'utf8')
    const crc = crc32(roh)
    const kopf = Buffer.alloc(30)
    kopf.writeUInt32LE(0x04034b50, 0); kopf.writeUInt16LE(20, 4); kopf.writeUInt16LE(0x0800, 6); kopf.writeUInt16LE(8, 8)
    kopf.writeUInt16LE(dosZeit, 10); kopf.writeUInt16LE(dosDatum, 12); kopf.writeUInt32LE(crc, 14)
    kopf.writeUInt32LE(gepackt.length, 18); kopf.writeUInt32LE(roh.length, 22); kopf.writeUInt16LE(name.length, 26); kopf.writeUInt16LE(0, 28)
    const z = Buffer.alloc(46)
    z.writeUInt32LE(0x02014b50, 0); z.writeUInt16LE(20, 4); z.writeUInt16LE(20, 6); z.writeUInt16LE(0x0800, 8); z.writeUInt16LE(8, 10)
    z.writeUInt16LE(dosZeit, 12); z.writeUInt16LE(dosDatum, 14); z.writeUInt32LE(crc, 16); z.writeUInt32LE(gepackt.length, 20)
    z.writeUInt32LE(roh.length, 24); z.writeUInt16LE(name.length, 28); z.writeUInt32LE(lage, 42)
    teile.push(kopf, name, gepackt)
    verzeichnis.push(z, name)
    lage += 30 + name.length + gepackt.length
  }
  const vz = Buffer.concat(verzeichnis)
  const ende = Buffer.alloc(22)
  ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(dateien.length, 8); ende.writeUInt16LE(dateien.length, 10)
  ende.writeUInt32LE(vz.length, 12); ende.writeUInt32LE(lage, 16)
  return Buffer.concat([...teile, vz, ende])
}

module.exports = { Fehlerprotokoll, STUFEN, MAX_BYTE, DATEI, ALT, ohnePersoenliches, anschlussKurz, zipBauen, crc32, zeit }
