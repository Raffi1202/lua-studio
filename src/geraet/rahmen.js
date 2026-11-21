'use strict'
// Rahmen des Ethos-Fernsteuerprotokolls (USB-Serial), nachgebaut nach radio_remote.py (Protokoll 11).
// Aufbau: SYNC 0xE7 | Befehl | Folgenummer | Länge (2, LE) | Nutzdaten | CRC-16/XMODEM (2, LE) über Befehl..Nutzdaten.

const SYNC = 0xE7
const MAX_NUTZDATEN = 1024
const PROTOKOLL_VERSION = 11

const BEFEHL = {
  HELLO: 0x01,
  PRESS: 0x10,
  TOUCH: 0x11,
  SWIPE: 0x12,
  TURN_ROTARY_ENCODER: 0x13,
  ENTER_TEXT: 0x14,
  RESET_BACKLIGHT_TIMER: 0x15,
  PRESS_FUNCTION_SWITCH: 0x16,
  RESET_INACTIVITY_TIMER: 0x1B,
  SCREENSHOT: 0x20,
  LIST_FILES: 0x30,
  READ_FILE: 0x31,
  WRITE_FILE: 0x32,
  DELETE_FILE: 0x33,
  CREATE_DIRECTORY: 0x34,
  LOAD_MODEL: 0x40,
  RELOAD: 0x41,
}

const EREIGNIS = { STATE: 0xC1, CONNECTION: 0xC2, LOG: 0xC3, CONTROLS: 0xC4 }

// Statuscodes der Firmware
const STATUS = {
  0: 'ok', '-1': 'nicht unterstützt', '-2': 'abgelehnt', '-3': 'ungültiger Wert',
  '-4': 'E/A-Fehler', '-5': 'beschäftigt', '-6': 'Zeitüberschreitung', '-7': 'Bildschirm war aus',
}

function crc16(daten) {
  let crc = 0
  for (const b of daten) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc
}

function rahmenBauen(befehl, folge, nutzdaten = Buffer.alloc(0)) {
  if (nutzdaten.length > MAX_NUTZDATEN) throw new Error('Nutzdaten zu lang')
  const kopf = Buffer.from([befehl, folge, nutzdaten.length & 255, nutzdaten.length >> 8])
  const koerper = Buffer.concat([kopf, nutzdaten])
  const crc = crc16(koerper)
  return Buffer.concat([Buffer.from([SYNC]), koerper, Buffer.from([crc & 255, crc >> 8])])
}

// Zerlegt einen Bytestrom in Rahmen; ruft beiRahmen(befehl, folge, nutzdaten) für jeden gültigen Rahmen.
class RahmenLeser {
  constructor(beiRahmen) {
    this.beiRahmen = beiRahmen
    this.zustand = 'sync'
    this.puffer = []
    this.laenge = 0
  }

  futtern(bytes) {
    for (const b of bytes) {
      if (this.zustand === 'sync') {
        if (b === SYNC) { this.puffer = []; this.zustand = 'kopf' }
      } else if (this.zustand === 'kopf') {
        this.puffer.push(b)
        if (this.puffer.length === 4) {
          this.laenge = this.puffer[2] | (this.puffer[3] << 8)
          this.zustand = this.laenge > MAX_NUTZDATEN ? 'sync' : (this.laenge ? 'daten' : 'crc')
        }
      } else if (this.zustand === 'daten') {
        this.puffer.push(b)
        if (this.puffer.length === 4 + this.laenge) this.zustand = 'crc'
      } else {
        this.puffer.push(b)
        if (this.puffer.length === 6 + this.laenge) {
          this.zustand = 'sync'
          const r = Buffer.from(this.puffer)
          const n = 4 + this.laenge
          if ((r[n] | (r[n + 1] << 8)) === crc16(r.subarray(0, n))) {
            this.beiRahmen(r[0], r[1], r.subarray(4, n))
          }
        }
      }
    }
  }
}

// Text als C-Zeichenkette (UTF-8 mit 0 am Ende)
function cText(text) {
  return Buffer.concat([Buffer.from(String(text), 'utf8'), Buffer.from([0])])
}

class Leser {
  constructor(daten) { this.d = daten; this.pos = 0 }
  u8() { if (this.pos >= this.d.length) throw new RangeError('Ende'); return this.d[this.pos++] }
  u32() { const v = this.d.readUInt32LE(this.pos); this.pos += 4; return v }
  text() {
    const ende = this.d.indexOf(0, this.pos)
    if (ende < 0) throw new RangeError('Text ohne Ende')
    const t = this.d.subarray(this.pos, ende).toString('utf8')
    this.pos = ende + 1
    return t
  }
  amEnde() { return this.pos >= this.d.length }
}

module.exports = { SYNC, MAX_NUTZDATEN, PROTOKOLL_VERSION, BEFEHL, EREIGNIS, STATUS, crc16, rahmenBauen, RahmenLeser, cText, Leser }
