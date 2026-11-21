'use strict'
// Client-Tests mit einer gespielten Funke im Speicher: Nutzdaten byteweise gegen radio_remote.py,
// Ablehnung am Sender, Log als zerrissener Datenstrom.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { Funke } = require('../src/geraet/funke')
const { rahmenBauen, RahmenLeser, EREIGNIS } = require('../src/geraet/rahmen')

function pluginBasis() {
  // Ordner des «ethos-tools plugin» (enthält Versionsordner mit radio_remote.py bzw. run_wasm.js), über ETHOS_TOOLS_DIR
  const basis = process.env.ETHOS_TOOLS_DIR || ''
  if (!basis) console.log('Hinweis: ETHOS_TOOLS_DIR nicht gesetzt (Ordner des ethos-tools plugin) – Abgleich übersprungen')
  return basis
}
function pluginPfad() {
  const basis = pluginBasis()
  if (!basis) return null
  if (!fs.existsSync(basis)) return null
  const v = fs.readdirSync(basis).filter((n) => fs.existsSync(path.join(basis, n, 'radio_remote.py'))).sort()
  return v.length ? path.join(basis, v[v.length - 1]) : null
}

// Gespielte Funke: zeichnet alle Rahmen auf und beantwortet jede Anfrage mit Status 0
function spielFunke({ antwort = () => [0, Buffer.alloc(0)] } = {}) {
  const geschrieben = []
  let datenFn = () => {}
  const sende = (b) => setImmediate(() => datenFn(b))
  const leser = new RahmenLeser((befehl, folge, d) => {
    const [status, daten] = antwort(befehl, Buffer.from(d))
    if (status === null) return
    const kopf = Buffer.alloc(2); kopf.writeInt8(status); kopf[1] = 1
    sende(rahmenBauen(befehl | 0x80, folge, Buffer.concat([kopf, daten])))
  })
  return {
    geschrieben,
    sende,
    kanal: {
      schreiben: (b) => { geschrieben.push(Buffer.from(b)); leser.futtern(b) },
      beiDaten: (fn) => { datenFn = fn },
      beiEnde: () => {},
      schliessen: () => {},
    },
  }
}

test('Nutzdaten aller Befehle gleich wie radio_remote.py', { skip: !pluginPfad() && 'Ethos-Plugin nicht installiert' }, async () => {
  const s = spielFunke()
  const f = new Funke(s.kanal)
  f.hallo = { protokoll: 11 }
  f.angenommen = true
  await f.taste('MDL', 600)
  await f.tippen(400, 240, 1000)
  await f.wischen(600, 240, 200, 10)
  await f.drehen(-3)
  await f.text('Hä ok')
  await f.lichtAn()
  await f.anfrage(0x20, Buffer.from([0, 1])) // SCREENSHOT ganz
  const js = s.geschrieben.map((b) => b.toString('hex'))

  const py = execFileSync('python3', ['-I', '-c', `
import sys, struct, json
sys.path.insert(0, ${JSON.stringify(pluginPfad())})
import radio_remote as r
def rahmen(cmd, seq, p=b''):
    body = bytes((cmd, seq, len(p) & 255, len(p) >> 8)) + p
    c = r.crc16(body)
    return (bytes((r.SYNC,)) + body + bytes((c & 255, c >> 8))).hex()
C = r.CMD
print(json.dumps([
  rahmen(C['PRESS'], 1, struct.pack('<I', 600) + r.cstr('MDL')),
  rahmen(C['TOUCH'], 2, struct.pack('<HHI', 400, 240, 1000)),
  rahmen(C['SWIPE'], 3, struct.pack('<HHHH', 600, 240, 200, 10)),
  rahmen(C['TURN_ROTARY_ENCODER'], 4, struct.pack('<h', -3)),
  rahmen(C['ENTER_TEXT'], 5, r.cstr('Hä ok')),
  rahmen(C['RESET_BACKLIGHT_TIMER'], 6),
  rahmen(C['SCREENSHOT'], 7, bytes((0, 1))),
]))`]).toString()
  assert.deepStrictEqual(js, JSON.parse(py))

  // HELLO
  const s2 = spielFunke({ antwort: () => [0, Buffer.from('0b1a0200583138525300455500616263000000', 'hex')] })
  const f2 = new Funke(s2.kanal)
  const h = await f2.verbinden(1000)
  assert.deepStrictEqual(h, { protokoll: 11, firmware: '26.2.0', board: 'X18RS', region: 'EU', git: 'abc' })
  const pyHallo = execFileSync('python3', ['-I', '-c', `
import sys
sys.path.insert(0, ${JSON.stringify(pluginPfad())})
import radio_remote as r
body = bytes((r.CMD['HELLO'], 1, 1, 0, r.PROTOCOL_VERSION)); c = r.crc16(body)
print((bytes((r.SYNC,)) + body + bytes((c & 255, c >> 8))).hex())`]).toString().trim()
  assert.strictEqual(s2.geschrieben[0].toString('hex'), pyHallo)
})

test('Ablehnung am Sender: klare Meldung, kein langes Warten', async () => {
  const s = spielFunke({
    antwort: (befehl) => {
      if (befehl === 0x01) {
        setTimeout(() => s.sende(rahmenBauen(EREIGNIS.CONNECTION, 0, Buffer.from([0]))), 30)
        return [0, Buffer.from('0b1a020058313852530045550000', 'hex')]
      }
      return [-2, Buffer.alloc(0)]
    },
  })
  const f = new Funke(s.kanal)
  const t0 = Date.now()
  await assert.rejects(f.verbinden(5000), /freigabeAbgelehnt/)
  assert.ok(Date.now() - t0 < 2000)
})

test('Lua-Log: Stücke zu ganzen Zeilen, Farbcodes und \\r entfernt', async () => {
  const s = spielFunke()
  const f = new Funke(s.kanal)
  const zeilen = []
  f.on('log', (z) => zeilen.push(z))
  for (const stueck of ['\x1b[31mFeh', 'ler: attempt to\r\nzwei', 'te Zeile\n', 'Rest']) {
    s.sende(rahmenBauen(EREIGNIS.LOG, 0, Buffer.from(stueck, 'utf8')))
  }
  await new Promise((r) => setTimeout(r, 20))
  assert.deepStrictEqual(zeilen, ['Fehler: attempt to', 'zweite Zeile'])
})

test('Antwort in mehreren Stücken wird zusammengesetzt', async () => {
  const s = spielFunke({ antwort: () => [null] })
  const f = new Funke(s.kanal)
  const p = f.anfrage(0x31, Buffer.alloc(0))
  const teil = (letztes, daten) => { const k = Buffer.alloc(2); k[1] = letztes ? 1 : 0; return rahmenBauen(0xB1, 1, Buffer.concat([k, Buffer.from(daten)])) }
  s.sende(teil(false, 'abc'))
  s.sende(teil(true, 'def'))
  const r = await p
  assert.strictEqual(r.status, 0)
  assert.strictEqual(r.daten.toString(), 'abcdef')
})

// Verhalten der echten X18RS (20.11.2026): HELLO kommt erst nach der Entscheidung am Sender
const HALLO = Buffer.from('0b1a020058313852530045550000', 'hex')

test('HELLO erst nach der Freigabe: Hinweis «erlauben», dann verbunden', async () => {
  const s = spielFunke({
    antwort: (befehl) => {
      if (befehl === 0x01) {
        setTimeout(() => {
          s.sende(rahmenBauen(EREIGNIS.CONNECTION, 0, Buffer.from([1])))
          const k = Buffer.from([0, 1])
          s.sende(rahmenBauen(0x81, 1, Buffer.concat([k, HALLO])))
        }, 1800)
        return [null]
      }
      return [0, Buffer.alloc(0)]
    },
  })
  const f = new Funke(s.kanal)
  let hinweis = 0
  f.on('warteAufFreigabe', () => hinweis++)
  const h = await f.verbinden(5000)
  assert.strictEqual(h.board, 'X18RS')
  assert.ok(hinweis >= 1, 'Hinweis «am Sender erlauben» kam nicht')
})

test('Ablehnung während HELLO wartet: sofort «abgelehnt», nicht erst nach der Wartezeit', async () => {
  const s = spielFunke({
    antwort: (befehl) => {
      if (befehl === 0x01) setTimeout(() => s.sende(rahmenBauen(EREIGNIS.CONNECTION, 0, Buffer.from([0]))), 50)
      return [null]
    },
  })
  const f = new Funke(s.kanal)
  const t0 = Date.now()
  await assert.rejects(f.verbinden(10000), /freigabeAbgelehnt/)
  assert.ok(Date.now() - t0 < 1000)
})

test('HELLO mit Status -2: «abgelehnt»; keine Antwort: «Zeit abgelaufen»', async () => {
  const s1 = spielFunke({ antwort: () => [-2, Buffer.alloc(0)] })
  await assert.rejects(new Funke(s1.kanal).verbinden(2000), /freigabeAbgelehnt/)
  const s2 = spielFunke({ antwort: () => [null] })
  await assert.rejects(new Funke(s2.kanal).verbinden(300), /freigabeZeit/)
})

test('Dateibefehle: Nutzdaten gleich wie radio_remote.py (Liste, Lesen, Schreiben in Stücken, Löschen, Ordner, Modell)', { skip: !pluginPfad() && 'Ethos-Plugin nicht installiert' }, async () => {
  const s = spielFunke({ antwort: (befehl, d) => (befehl === 0x30 && d.toString().startsWith('RADIO:') ? [-4, Buffer.alloc(0)] : [0, Buffer.alloc(0)]) })
  const f = new Funke(s.kanal)
  f.hallo = { protokoll: 11 }
  f.angenommen = true
  const gross = Buffer.alloc(2500, 0x41)
  await f.dateien('SD:/scripts/studio')
  await f.lesen('SD:/scripts/studio/a.lua')
  await f.schreiben('SD:/scripts/studio/a.lua', gross)
  await f.loeschen('/scripts/x.lua')
  await f.ordnerAnlegen('SD:/scripts/studio')
  await f.modellLaden('/models/model01.bin')
  const js = s.geschrieben.map((b) => b.toString('hex'))
  const py = execFileSync('python3', ['-I', '-c', `
import sys, struct, json
sys.path.insert(0, ${JSON.stringify(pluginPfad())})
import radio_remote as r
def rahmen(cmd, seq, p=b''):
    body = bytes((cmd, seq, len(p) & 255, len(p) >> 8)) + p
    c = r.crc16(body)
    return (bytes((r.SYNC,)) + body + bytes((c & 255, c >> 8))).hex()
C = r.CMD
p = 'SD:/scripts/studio/a.lua'
daten = b'A' * 2500
room = 1024 - len(struct.pack('<I', 0) + r.cstr(p))
out = [rahmen(C['LIST_FILES'], 1, r.cstr('SD:/scripts/studio')), rahmen(C['READ_FILE'], 2, struct.pack('<I', 0) + r.cstr(p))]
seq, off = 3, 0
while off < len(daten):
    out.append(rahmen(C['WRITE_FILE'], seq, struct.pack('<I', off) + r.cstr(p) + daten[off:off+room])); seq += 1; off += room
out.append(rahmen(C['LIST_FILES'], seq, r.cstr('RADIO:/'))); seq += 1
out.append(rahmen(C['DELETE_FILE'], seq, r.cstr('/scripts/x.lua'))); seq += 1
out.append(rahmen(C['CREATE_DIRECTORY'], seq, r.cstr('SD:/scripts/studio'))); seq += 1
out.append(rahmen(C['LOAD_MODEL'], seq, r.cstr('/models/model01.bin')))
print(json.dumps(out))`]).toString()
  assert.deepStrictEqual(js, JSON.parse(py))
})
