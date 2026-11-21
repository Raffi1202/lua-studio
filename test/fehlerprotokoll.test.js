'use strict'
// Tests für das Fehlerprotokoll (src/main/fehlerprotokoll.js): Stufen, Ringpuffer, Benutzerordner, Wiederholungen, ZIP.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const { execFileSync } = require('child_process')
const { Fehlerprotokoll, ohnePersoenliches, zipBauen, crc32, zeit } = require('../src/main/fehlerprotokoll')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ls-protokoll-'))
const uhr = () => new Date(2026, 10, 21, 8, 15, 2, 123)

test('Zeitformat und Zeilenaufbau', () => {
  assert.strictEqual(zeit(uhr()), '2026-11-21 08:15:02.123')
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: path.join(o, 'Protokoll'), jetzt: uhr })
  P.kopf(['Lua-Studio 0.3.3'])
  P.info('verbindung', 'verbunden\nzweite Zeile')
  const t = fs.readFileSync(P.datei, 'utf8')
  assert.strictEqual(t, '2026-11-21 08:15:02.123 K start: Lua-Studio 0.3.3\n2026-11-21 08:15:02.123 I verbindung: verbunden\n    zweite Zeile\n')
})

test('Stufen: aus schreibt nichts, normal ohne A, ausführlich alles; Stufe bleibt gespeichert', () => {
  const o = tmp()
  let P = new Fehlerprotokoll({ ordner: o, jetzt: uhr })
  assert.strictEqual(P.stufe, 'normal')
  let aufgerufen = false
  P.ausfuehrlich('befehl', () => { aufgerufen = true; return 'x' })
  assert.strictEqual(aufgerufen, false, 'Text-Funktion nur bei ausführlich auswerten')
  P.info('a', 'eins')
  P.stufeSetzen('ausfuehrlich')
  P.ausfuehrlich('befehl', () => 'READ_FILE 20 B')
  P.stufeSetzen('aus')
  P.fehler('x', new Error('still'))
  P.info('a', 'still')
  const t = fs.readFileSync(P.datei, 'utf8')
  assert.match(t, /I a: eins/)
  assert.match(t, /A befehl: READ_FILE 20 B/)
  assert.match(t, /Stufe ausfuehrlich -> aus/)
  assert.doesNotMatch(t, /still/)
  P = new Fehlerprotokoll({ ordner: o })
  assert.strictEqual(P.stufe, 'aus')
  assert.strictEqual(P.stufeSetzen('quatsch'), false)
})

test('Ringpuffer: Datei wird zur -alt.log, zusammen höchstens 2 × max', () => {
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: o, maxByte: 2000, jetzt: uhr })
  for (let i = 0; i < 200; i++) P.info('n', `Zeile ${i} ` + 'x'.repeat(40))
  const a = fs.statSync(P.datei).size, b = fs.statSync(P.alt).size
  assert.ok(a <= 2000 && b <= 2000, `${a} ${b}`)
  assert.match(fs.readFileSync(P.datei, 'utf8'), /Zeile 199 /)
  const ganz = P.lesen()
  assert.ok(ganz.indexOf('Zeile 199 ') > ganz.lastIndexOf('Zeile 150 '), 'alt zuerst, neu danach')
  assert.ok(P.lesen(500).startsWith('…\n'))
  // nach einem Neustart: vorhandene Grösse zählt mit
  const P2 = new Fehlerprotokoll({ ordner: o, maxByte: 2000, jetzt: uhr })
  for (let i = 0; i < 30; i++) P2.info('n', 'y'.repeat(60))
  assert.ok(fs.statSync(P2.datei).size <= 2000)
})

test('Benutzerordner wird durch ~ ersetzt (Mac und Windows)', () => {
  assert.strictEqual(ohnePersoenliches('/Users/max/Library/x', '/Users/max'), '~/Library/x')
  assert.strictEqual(ohnePersoenliches('C:\\Users\\Max\\AppData a C:/Users/Max/b', 'C:\\Users\\Max'), '~\\AppData a ~/b')
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: o, heim: '/Users/kumpel' })
  const e = new Error('ENOENT: /Users/kumpel/Desktop/a.lua')
  e.stack = 'Error: ENOENT: /Users/kumpel/Desktop/a.lua\n    at lesen (/Users/kumpel/app/x.js:1:2)'
  P.fehler('studio', e)
  const t = fs.readFileSync(P.datei, 'utf8')
  assert.doesNotMatch(t, /kumpel/)
  assert.match(t, /~\/Desktop\/a\.lua/)
  assert.match(t, /at lesen \(~\/app\/x\.js:1:2\)/)
})

test('Fehler mit Stack; Wiederholungen nur gezählt; lange Einträge gekürzt', () => {
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: o })
  for (let i = 0; i < 250; i++) P.fehler('bild', new Error('gleich'))
  P.fehler('absturz', 'ohne Error-Objekt', 'unhandledRejection')
  P.info('lang', 'z'.repeat(10000))
  const t = fs.readFileSync(P.datei, 'utf8')
  assert.strictEqual((t.match(/E bild: gleich\n/g) || []).length, 5)
  assert.match(t, /weitere gleiche Fehler werden nur gezählt/)
  assert.match(t, /gleich \(100× seit Start\)/)
  assert.match(t, /gleich \(200× seit Start\)/)
  assert.match(t, /E absturz: ohne Error-Objekt \[unhandledRejection\]/)
  assert.match(t, /at .*fehlerprotokoll\.test\.js/)
  assert.match(t, /z{100} …\(gekürzt\)/)
})

test('Löschen und nicht beschreibbarer Ordner', () => {
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: o, maxByte: 500 })
  for (let i = 0; i < 30; i++) P.info('n', 'x'.repeat(50))
  P.loeschen()
  assert.ok(!fs.existsSync(P.alt))
  assert.match(fs.readFileSync(P.datei, 'utf8'), /^\S+ \S+ I protokoll: gelöscht\n$/)
  // Ordner ist eine Datei: kein Absturz, danach still
  const datei = path.join(o, 'keinordner'); fs.writeFileSync(datei, '')
  const Q = new Fehlerprotokoll({ ordner: datei })
  const fehlerAus = console.error; console.error = () => {}
  try { assert.doesNotThrow(() => { Q.info('a', 'b'); Q.fehler('a', new Error('c')) }) } finally { console.error = fehlerAus }
  assert.ok(Q.kaputt > 0)
})

test('CRC32 und ZIP lassen sich lesen', () => {
  assert.strictEqual(crc32(Buffer.from('123456789')), 0xCBF43926)
  const dateien = [{ name: 'lua-studio.log', daten: 'Zeile ä\n'.repeat(500) }, { name: 'funke-info/SD_scripts_studio/m1.electric.info.json', daten: Buffer.from('{"a":1}') }]
  const zip = zipBauen(dateien, uhr())
  // selbst lesen: lokale Köpfe der Reihe nach
  let lage = 0
  for (const d of dateien) {
    assert.strictEqual(zip.readUInt32LE(lage), 0x04034b50)
    const gross = zip.readUInt32LE(lage + 18), nl = zip.readUInt16LE(lage + 26)
    assert.strictEqual(zip.subarray(lage + 30, lage + 30 + nl).toString('utf8'), d.name)
    const roh = zlib.inflateRawSync(zip.subarray(lage + 30 + nl, lage + 30 + nl + gross))
    assert.ok(roh.equals(Buffer.from(d.daten)))
    assert.strictEqual(zip.readUInt32LE(lage + 14), crc32(roh))
    lage += 30 + nl + gross
  }
  assert.strictEqual(zip.readUInt32LE(zip.length - 22), 0x06054b50)
  // mit unzip prüfen, wo vorhanden
  let unzip = true
  try { execFileSync('unzip', ['-v'], { stdio: 'ignore' }) } catch { unzip = false }
  if (unzip) {
    const z = path.join(tmp(), 'a.zip'); fs.writeFileSync(z, zip)
    const aus = execFileSync('unzip', ['-t', z]).toString()
    assert.match(aus, /No errors detected/)
  }
})

test('Nachprüfung: Funken-Zeilen gezählt, Kopf nach Rotation, Anschluss ohne Seriennummer, Windows Gross/Klein, Neuversuch', () => {
  const { anschlussKurz } = require('../src/main/fehlerprotokoll')
  const o = tmp()
  const P = new Fehlerprotokoll({ ordner: o, maxByte: 3000, jetzt: uhr })
  P.kopf(['Lua-Studio 0.3.3', 'System test'])
  for (let i = 0; i < 300; i++) P.warnungGezaehlt('funke-log', `000${i} [Lua] error: attempt to index nil (zeile ${i})`)
  const t = P.lesen()
  assert.strictEqual((t.match(/W funke-log: /g) || []).length, 8, '5 ausgeschrieben, dann 100×, 200×, 300×')
  assert.match(t, /\(300× seit Start\)/)
  // Rotation: Kopf steht auch in der neuen Datei
  for (let i = 0; i < 80; i++) P.info('n', 'x'.repeat(60))
  assert.match(fs.readFileSync(P.datei, 'utf8'), /^\S+ \S+ K start: Lua-Studio 0\.3\.3 \(Fortsetzung\)\n\S+ \S+ K start: System test \(Fortsetzung\)\n/)
  assert.strictEqual(anschlussKurz('/dev/cu.usbmodem5B5E1270521'), '/dev/cu.usbmodem…')
  assert.strictEqual(anschlussKurz('/dev/cu.wchusbserial5B5E1270521'), '/dev/cu.wchusbserial…')
  assert.strictEqual(anschlussKurz('COM3'), 'COM3')
  assert.strictEqual(ohnePersoenliches('c:\\users\\max\\a und C:/USERS/MAX/b', 'C:\\Users\\Max'), '~\\a und ~/b')
  // Schreibfehler: still, nach 60 s neuer Versuch
  const d = path.join(o, 'datei'); fs.writeFileSync(d, '')
  const Q = new Fehlerprotokoll({ ordner: d })
  const fehlerAus = console.error; console.error = () => {}
  try { Q.info('a', 'b') } finally { console.error = fehlerAus }
  assert.ok(Q.kaputt > 0)
  fs.rmSync(d); Q.kaputt = Date.now() - 61000
  Q.info('a', 'wieder da')
  assert.strictEqual(Q.kaputt, false)
  assert.match(fs.readFileSync(Q.datei, 'utf8'), /wieder da/)
})
