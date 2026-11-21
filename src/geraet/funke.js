'use strict'
// Fernsteuerung einer Ethos-Funke über das Fernsteuerprotokoll (Client-Seite, nach radio_remote.py).
// Die Verbindung selbst (USB-Serial oder Test-Brücke zum Simulator) steckt in einem «Kanal»:
//   { schreiben(buffer), beiDaten(fn), beiEnde(fn), schliessen() }

const { EventEmitter } = require('events')
const { BEFEHL, EREIGNIS, STATUS, PROTOKOLL_VERSION, rahmenBauen, RahmenLeser, cText, Leser } = require('./rahmen')
const { kachelnDekodieren } = require('./bild')

const TASTEN = ['SYS', 'MDL', 'DISP', 'PAGE', 'RTN', 'ENTER', 'UP', 'DOWN', 'LEFT', 'RIGHT']
const LANG_TIPPEN_MS = 1000
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g

function statusText(s) { return STATUS[String(s)] || `Status ${s}` }

class Funke extends EventEmitter {
  // Ereignisse: 'log' (zeile), 'getrennt' (grund), 'zustand' ({flugphase, hfAktiv, lichtAn})
  constructor(kanal) {
    super()
    this.kanal = kanal
    this.folge = 0
    this.offen = new Map()
    this.angenommen = false
    this.abgelehnt = false
    this.hallo = null
    this.bild = null
    this.getrennt = false
    this.logRest = ''
    this.leser = new RahmenLeser((b, f, d) => this._rahmen(b, f, d))
    kanal.beiDaten((bytes) => this.leser.futtern(bytes))
    kanal.beiEnde((grund) => this._ende(grund || 'kabelGetrennt'))
  }

  _ende(grund) {
    if (this.getrennt) return
    this.getrennt = true
    for (const a of this.offen.values()) a.fertig(-6)
    this.offen.clear()
    this.emit('getrennt', grund)
  }

  _rahmen(befehl, folge, d) {
    if (folge === 0) {
      if (befehl === EREIGNIS.CONNECTION) {
        if (d.length && d[0]) { this.angenommen = true; this.emit('angenommen') } else { this.abgelehnt = true; this.emit('abgelehnt') }
      } else if (befehl === EREIGNIS.LOG) {
        // Das Log kommt als Datenstrom: Stücke sammeln, Farbcodes entfernen, nur ganze Zeilen melden
        const teile = (this.logRest + d.toString('utf8').replace(ANSI, '')).split('\n')
        this.logRest = teile.pop()
        if (this.logRest.length > 4000) { teile.push(this.logRest); this.logRest = '' }
        for (const z of teile) this.emit('log', z.replace(/\r$/, ''))
      } else if (befehl === EREIGNIS.STATE && d.length >= 3) {
        this.emit('zustand', { flugphase: d[0], hfAktiv: !!d[1], lichtAn: !!d[2] })
      }
      return
    }
    const a = this.offen.get(folge)
    if (!a || !(befehl & 0x80) || d.length < 2) return
    a.teile.push(Buffer.from(d.subarray(2)))
    if (d[1] & 0x01) a.fertig(d.readInt8(0))
  }

  // Sendet einen Befehl und wartet auf die vollständige Antwort: {status, daten}
  anfrage(befehl, nutzdaten = Buffer.alloc(0), zeitMs = 10000) {
    if (this.getrennt) return Promise.resolve({ status: -6, daten: Buffer.alloc(0) })
    this.folge = (this.folge % 255) + 1
    const folge = this.folge
    const start = Date.now()
    return new Promise((resolve) => {
      const a = { teile: [] }
      const uhr = setTimeout(() => a.fertig(-6), zeitMs)
      a.fertig = (status) => {
        clearTimeout(uhr)
        if (this.offen.get(folge) === a) this.offen.delete(folge)
        const daten = Buffer.concat(a.teile)
        // Für das Fehlerprotokoll: Befehl, Grössen, Status, Dauer; Vorschau = lesbarer Anfang der Nutzdaten (Pfad), gekürzt
        if (this.listenerCount('befehl')) {
          const vorschau = nutzdaten.subarray(0, 120).toString('latin1').replace(/[^\x20-\x7e]+/g, ' ').trim().slice(0, 60)
          this.emit('befehl', { befehl, laenge: nutzdaten.length, status, antwort: daten.length, ms: Date.now() - start, vorschau: vorschau.length >= 3 ? vorschau : '' })
        }
        resolve({ status, daten })
      }
      const alt = this.offen.get(folge)
      if (alt) alt.fertig(-6)
      this.offen.set(folge, a)
      try {
        this.kanal.schreiben(rahmenBauen(befehl, folge, nutzdaten))
      } catch (e) {
        a.fertig(-4)
      }
    })
  }

  // HELLO, dann warten, bis die Fernsteuerung am Sender erlaubt ist.
  async verbinden(warteMs = 60000) {
    // Die echte Funke beantwortet HELLO erst, wenn die Fernsteuerung am Sender erlaubt ist (X18RS, 20.11.2026).
    // Darum lange warten und nach kurzer Zeit ohne Antwort schon «bitte am Sender erlauben» melden.
    // Lehnt der User am Sender ab (CONNECTION 0) oder geht die Verbindung weg, sofort abbrechen statt weiter warten.
    const hinweis = setTimeout(() => this.emit('warteAufFreigabe'), 1500)
    let abbruch = () => {}
    const abgebrochen = new Promise((resolve) => {
      const nein = () => resolve('freigabeAbgelehnt')
      const weg = (g) => resolve(g)
      this.once('abgelehnt', nein); this.once('getrennt', weg)
      abbruch = () => { this.off('abgelehnt', nein); this.off('getrennt', weg) }
    })
    const antwort = await Promise.race([this.anfrage(BEFEHL.HELLO, Buffer.from([PROTOKOLL_VERSION]), warteMs), abgebrochen])
    clearTimeout(hinweis)
    abbruch()
    if (typeof antwort === 'string') throw new Error(antwort)
    const { status, daten } = antwort
    if (status === -6) throw new Error('freigabeZeit')
    if (status === -2) throw new Error('freigabeAbgelehnt')
    if (status) throw new Error(`hallo|s${status}`)
    const r = new Leser(daten)
    const h = { protokoll: r.u8(), firmware: `${r.u8()}.${r.u8()}.${r.u8()}`, board: r.text(), region: r.text(), git: r.text() }
    const zusatz = r.amEnde() ? '' : r.text()
    if (zusatz) h.firmware += `-${zusatz}`
    this.hallo = h
    this.emit('hallo', h)
    // Schon früher erlaubt: dann klappt jeder Befehl ohne Rückfrage am Sender
    if ((await this.anfrage(BEFEHL.RESET_INACTIVITY_TIMER)).status === 0) this.angenommen = true
    if (this.abgelehnt && !this.angenommen) throw new Error('freigabeAbgelehnt')
    if (!this.angenommen) {
      this.emit('warteAufFreigabe')
      await new Promise((resolve, reject) => {
        const uhr = setTimeout(() => { aufraeumen(); reject(new Error('freigabeZeit')) }, warteMs)
        const ja = () => { aufraeumen(); resolve() }
        const nein = () => { aufraeumen(); reject(new Error('freigabeAbgelehnt')) }
        const weg = (g) => { aufraeumen(); reject(new Error(g)) }
        const aufraeumen = () => { clearTimeout(uhr); this.off('angenommen', ja); this.off('abgelehnt', nein); this.off('getrennt', weg) }
        this.on('angenommen', ja); this.on('abgelehnt', nein); this.on('getrennt', weg)
      })
    }
    return h
  }

  // Bildschirm holen. Ergebnis: {status, bild, neu} – neu = false, wenn sich nichts geändert hat.
  async bildschirm(anzeige = 0) {
    for (let versuch = 0; versuch < 2; versuch++) {
      const ganz = !this.bild
      // Die X18RS antwortet erst nach 2–6 s (gemessen 20.11.2026), das erste ganze Bild kann über 10 s brauchen
      const { status, daten } = await this.anfrage(BEFEHL.SCREENSHOT, Buffer.from([anzeige, ganz ? 1 : 0]), 30000)
      if (status) { this.bild = null; return { status } }
      const b = kachelnDekodieren(daten, this.bild)
      if (b) {
        this.bild = b
        return { status: 0, bild: b, neu: ganz || b.geaendert > 0 }
      }
      this.bild = null
    }
    return { status: -4 }
  }

  // Eingaben. Status -7 (Bildschirm war aus) heisst: die Eingabe hat nur das Licht eingeschaltet -> nochmals senden.
  async _eingabe(befehl, nutzdaten) {
    let { status } = await this.anfrage(befehl, nutzdaten)
    if (status === -7) ({ status } = await this.anfrage(befehl, nutzdaten))
    return status
  }

  taste(name, ms = 20) {
    const n = String(name).toUpperCase()
    if (!TASTEN.includes(n) && !/^T[1-6][+-]$/.test(n) && !/^FS[1-9][0-9]*$/.test(n)) return Promise.resolve(-3)
    const d = Buffer.alloc(4); d.writeUInt32LE(Math.max(1, Math.round(ms)))
    // Vor Protokoll 9 haben die Funktionsschalter einen eigenen Befehl
    const befehl = /^FS/.test(n) && this.hallo && this.hallo.protokoll < 9 ? BEFEHL.PRESS_FUNCTION_SWITCH : BEFEHL.PRESS
    return this._eingabe(befehl, Buffer.concat([d, cText(n)]))
  }

  tippen(x, y, ms = 20) {
    if (this.hallo && this.hallo.protokoll < 9) {
      const d = Buffer.alloc(5); d.writeUInt16LE(x); d.writeUInt16LE(y, 2); d[4] = ms >= LANG_TIPPEN_MS ? 1 : 0
      return this._eingabe(BEFEHL.TOUCH, d)
    }
    const d = Buffer.alloc(8); d.writeUInt16LE(x); d.writeUInt16LE(y, 2); d.writeUInt32LE(Math.max(1, Math.round(ms)), 4)
    return this._eingabe(BEFEHL.TOUCH, d)
  }

  wischen(x1, y1, x2, y2) {
    const d = Buffer.alloc(8); d.writeUInt16LE(x1); d.writeUInt16LE(y1, 2); d.writeUInt16LE(x2, 4); d.writeUInt16LE(y2, 6)
    return this._eingabe(BEFEHL.SWIPE, d)
  }

  drehen(schritte) {
    const d = Buffer.alloc(2); d.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(schritte))))
    return this._eingabe(BEFEHL.TURN_ROTARY_ENCODER, d)
  }

  text(t) { return this._eingabe(BEFEHL.ENTER_TEXT, cText(t)) }

  async lichtAn() { return (await this.anfrage(BEFEHL.RESET_BACKLIGHT_TIMER)).status }

  // ---------- Dateien (nach radio_remote.py) ----------
  // Pfad auf der Funke: «SD:/…» bleibt; sonst interner Speicher, bei Funken mit Laufwerken «RADIO:/…».
  async funkenPfad(pfad) {
    if (/^SD:/i.test(pfad)) return pfad
    if (this.lokalesLaufwerk === undefined) {
      this.lokalesLaufwerk = (await this.anfrage(BEFEHL.LIST_FILES, cText('RADIO:/'))).status === 0 ? 'RADIO:' : ''
    }
    return this.lokalesLaufwerk + '/' + String(pfad).replace(/^\/+/, '')
  }

  // Liste: [{ name, ordner, groesse }] oder Fehler mit Status
  async dateien(pfad) {
    const { status, daten } = await this.anfrage(BEFEHL.LIST_FILES, cText(await this.funkenPfad(pfad)), 30000)
    if (status) return { status, liste: [] }
    const r = new Leser(daten)
    const liste = []
    while (!r.amEnde()) {
      const ordner = r.u8() !== 0
      const groesse = r.u32()
      const name = r.text()
      if (name !== '.' && name !== '..') liste.push({ name, ordner, groesse })
    }
    return { status: 0, liste }
  }

  async lesen(pfad) {
    const d = Buffer.alloc(4)
    const { status, daten } = await this.anfrage(BEFEHL.READ_FILE, Buffer.concat([d, cText(await this.funkenPfad(pfad))]), 60000)
    return { status, daten }
  }

  // In Stücken schreiben, die in einen Rahmen passen (1024 Byte Nutzdaten)
  async schreiben(pfad, daten) {
    const p = await this.funkenPfad(pfad)
    const kopf = 4 + Buffer.byteLength(p, 'utf8') + 1
    const platz = 1024 - kopf
    let pos = 0
    do {
      const teil = daten.subarray(pos, pos + platz)
      const o = Buffer.alloc(4); o.writeUInt32LE(pos)
      const { status } = await this.anfrage(BEFEHL.WRITE_FILE, Buffer.concat([o, cText(p), teil]), 30000)
      if (status) return status
      pos += teil.length
    } while (pos < daten.length)
    return 0
  }

  async loeschen(pfad) { return (await this.anfrage(BEFEHL.DELETE_FILE, cText(await this.funkenPfad(pfad)))).status }

  async ordnerAnlegen(pfad) {
    if (this.hallo && this.hallo.protokoll < 10) return -1
    return (await this.anfrage(BEFEHL.CREATE_DIRECTORY, cText(await this.funkenPfad(pfad)))).status
  }

  // Modell laden (Pfad wie in Ethos, z. B. «/models/model03.bin»); sicherer Weg nach dem Übertragen statt Skript-Neuladen
  async modellLaden(pfad) { return (await this.anfrage(BEFEHL.LOAD_MODEL, cText(pfad), 30000)).status }

  trennen() {
    try { this.kanal.schliessen() } catch { /* schon zu */ }
    this._ende('getrennt')
  }
}

module.exports = { Funke, TASTEN, statusText }
