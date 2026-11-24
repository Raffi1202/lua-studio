'use strict'
// Format v1: Kennung, Schreiben, Lesen, Grenzen. Abgleich der JS-Prüfung mit der Lua-Referenz studio_laden.lua,
// wenn `lua` und der Koordinationsordner vorhanden sind (nur auf dem Entwicklungsrechner).

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const F = require('../src/format/format')

// Ordner mit «Lua-Studio-Format v1 - Referenz studio_laden.lua» und den Testdateien (nur auf dem Entwicklungsrechner),
// z. B. LUA_STUDIO_FORMAT=/pfad/zum/ordner npm test; ohne Variable wird der Abgleich übersprungen
const KOORD = process.env.LUA_STUDIO_FORMAT || ''
const REFERENZ = path.join(KOORD, 'Lua-Studio-Format v1 - Referenz studio_laden.lua')
const TESTDATEIEN = path.join(KOORD, 'Lua-Studio-Format v1 - Testdateien')
function luaDa() { try { execFileSync('lua', ['-v'], { stdio: 'ignore' }); return !!KOORD && fs.existsSync(REFERENZ) } catch { return false } }

function platz(i) {
  return { x: i * 10, y: 40, b: 196, h: 138, w: 'lua:akku_proz', darstellung: 'ring', titel: `Akku Möwe ${i} (for)`,
    min: 0, max: 100, farbe: [48, 192, 96], zusatz: 'min', stufen: [{ ab: 50, farbe: [255, 255, 0] }] }
}
function beispiel(n = 16) {
  return {
    studio: '0.2.0', modell: 'Extra 330 6S',
    einstellungen: { kapaz: 5000, zellenzahl: 6, for_x: 1 },
    werte: { 'sensor:0500:0:3': { faktor: 0.5, versatz: -3, einheit: 'U/min', stellen: 0 } },
    grenzen: { 'lua:akku_proz': { richtung: 'unter', warnung: 30, alarm: 20, ansage: true, vibration: false } },
    ansichten: [{ breite: 784, hoehe: 316, plaetze: Array.from({ length: n }, (_, i) => platz(i)) }],
  }
}

test('Kennung byteweise wie Abschnitt 2.1', () => {
  assert.strictEqual(F.kennung('Extra 330 6S'), 'Extra_330_6S')
  assert.strictEqual(F.kennung('Möwe'), 'M__we')
  assert.strictEqual(F.kennung('Goblin 700 (neu)'), 'Goblin_700__neu_')
  assert.strictEqual(F.kennung(''), 'modell')
  assert.strictEqual(F.kennung('x'.repeat(40)).length, 32)
})

test('Schreiben: Escapes, ganze Zahlen, Dezimalzahlen, Schlüssel', () => {
  const s = F.dateiText({ a: 12, b: -0.5, c: 'Ak', d: [1, 2], 'lua:x': true, for: 1 })
  assert.match(s, /^return \{ format = 1, a = 12, b = -0\.5000, c = "\\65\\107"/)
  assert.ok(s.includes('["\\108\\117\\97\\58\\120"] = true'))
  assert.ok(s.includes('["\\102\\111\\114"] = 1'), 'Schlüsselwort als Schlüssel muss in [ ] stehen')
  assert.strictEqual(F.pruefenWieFunke(s), null)
  assert.throws(() => F.dateiText({ x: Infinity }))
})

test('Bauen und wieder lesen ergibt dieselben Daten', () => {
  const d = beispiel()
  const r = F.bauen(d)
  assert.deepStrictEqual(r.fehler, [])
  const zurueck = F.lesen(r.text)
  assert.strictEqual(zurueck.format, 1)
  assert.strictEqual(zurueck.ansichten[0].plaetze[3].titel, 'Akku Möwe 3 (for)')
  assert.strictEqual(zurueck.werte['sensor:0500:0:3'].versatz, -3)
  assert.strictEqual(zurueck.grenzen['lua:akku_proz'].vibration, false)
  assert.deepStrictEqual(zurueck.ansichten[0].plaetze[0].farbe, [48, 192, 96])
  assert.strictEqual(zurueck.einstellungen.for_x, 1)
})

test('Grenzen des Studios: zu viele Angaben werden gemeldet', () => {
  const gross = beispiel(16)
  gross.ansichten.push({ breite: 800, hoehe: 480, plaetze: Array.from({ length: 16 }, (_, i) => ({ ...platz(i), farbeWarn: [1, 2, 3], farbeAlarm: [1, 2, 3], hintergrund: [1, 2, 3], stufen: [{ ab: 1, farbe: [1, 1, 1] }, { ab: 2, farbe: [1, 1, 1] }, { ab: 3, farbe: [1, 1, 1] }] })) })
  const r = F.bauen(gross)
  assert.ok(r.fehler.some((f) => /zu viele|zu gross/.test(f)), r.fehler.join('; '))
})

test('Angriffe werden abgewiesen (JS-Prüfung)', () => {
  for (const s of ['return { n = #s:rep"1" }', 'a="x" return {}', 'return { a = "1"-1-1 }', 'return { a = _ENV[_ENV] }',
    'return { a = "\\" , ", b = "x" }', 'while true do end return {}', 'return { a = f"x" }', 'return { [x] = 1 }']) {
    assert.notStrictEqual(F.pruefenWieFunke(s), null, s)
  }
})

test('Abgleich mit der Lua-Referenz (Testdateien und gebaute Dateien)', { skip: !luaDa() && 'lua oder Referenz nicht vorhanden' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-format-'))
  const dateien = []
  if (fs.existsSync(TESTDATEIEN)) for (const n of fs.readdirSync(TESTDATEIEN)) if (n.endsWith('.lua') && !n.startsWith('messen')) dateien.push(path.join(TESTDATEIEN, n))
  for (let n = 0; n <= 16; n += 4) { const p = path.join(tmp, `gebaut${n}.lua`); fs.writeFileSync(p, F.bauen(beispiel(n)).text); dateien.push(p) }
  const skript = path.join(tmp, 'abgleich.lua')
  fs.writeFileSync(skript, `local laden = dofile(${JSON.stringify(REFERENZ)})\nfor i = 1, #arg do local d, g = laden(arg[i], 1) print(d and "OK" or g) end\n`)
  const lua = execFileSync('lua', [skript, ...dateien]).toString().trim().split('\n')
  dateien.forEach((p, i) => {
    const js = F.pruefenWieFunke(fs.readFileSync(p, 'utf8'))
    const name = path.basename(p)
    if (lua[i] === 'OK' || lua[i] === 'zuNeu') assert.strictEqual(js, null, `${name}: Lua nimmt an, JS lehnt ab (${js})`)
    else if (js === null) {
      // JS prüft nur die Regeln; Lua kann zusätzlich beim Laden/Ausführen scheitern (Syntax, kein format) – nie bei gebauten Dateien
      assert.ok(!name.startsWith('gebaut'), `${name}: gebaute Datei von Lua abgelehnt (${lua[i]})`)
    }
  })
  fs.rmSync(tmp, { recursive: true, force: true })
})

// Gas umkehren (24.11.): Lua-Studio schreibt einstellungen.gas_inv, die Luas lesen es über ihre Zuordnung
// camelCase → snake_case (studio.lua: f[1]:gsub("%u", "_" .. klein)) in gasInv.
test('Gas umkehren: Datei schreiben, Lua liest gasInv', { skip: !luaDa() && 'lua oder Referenz nicht vorhanden' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-gasinv-'))
  for (const l of ['electric', 'glider', 'jet', 'gas_ecu', 'gas_carb']) {
    const b = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'luas', `${l}.json`), 'utf8'))
    const e = b.einstellungen.find((x) => x.s === 'gas_inv')
    assert.ok(e && e.art === 'b' && e.werk === false && e.name.de === 'Gas umkehren' && e.name.en === 'Reverse throttle', `${l}: gas_inv fehlt`)
    for (const v of [true, false]) {
      const p = path.join(tmp, `${l}-${v}.lua`)
      const r = F.bauen({ einstellungen: { gas_inv: v }, werte: {}, grenzen: {}, ansichten: [] })
      assert.deepStrictEqual(r.fehler, [])
      fs.writeFileSync(p, r.text)
      const skript = path.join(tmp, 'gasinv.lua')
      fs.writeFileSync(skript, `local d = dofile(${JSON.stringify(REFERENZ)})(arg[1], 1)\nlocal k = ("gasInv"):gsub("%u", function(c) return "_" .. c:lower() end)\nprint(tostring(d.einstellungen[k]))\n`)
      assert.strictEqual(execFileSync('lua', [skript, p]).toString().trim(), String(v), `${l}: gasInv = ${v}`)
    }
  }
})

// Glider 0.7.3 (Issue #1): zwei Empfangsbänder wie Electric, Grenzen nur im Funkenmenü (vfr_w/vfr_a)
test('Glider 0.7.3: Empfangsbänder wählbar, Datei wird von der Lua-Referenz gelesen', { skip: !luaDa() && 'lua oder Referenz nicht vorhanden' }, () => {
  const b = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'luas', 'glider.json'), 'utf8'))
  const neu = ['rssi_24', 'rssi_900', 'vfr_24', 'vfr_900', 'rx_vfr']
  for (const k of neu) { const w = b.werte.find((x) => x.s === k); assert.ok(w && !w.grenzeRichtung, `${k} fehlt oder hat Grenzrichtung`) }
  assert.deepStrictEqual(b.einstellungen.slice(-2).map((e) => [e.s, e.werk]), [['vfr_w', 70], ['vfr_a', 50]])
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-glider-'))
  const a = { breite: 800, hoehe: 480, plaetze: neu.map((k, i) => ({ x: i * 150, y: 60, b: 140, h: 100, w: `lua:${k}`, darstellung: 'zahl' })) }
  const r = F.bauen({ einstellungen: { vfr_w: 70, vfr_a: 50 }, werte: {}, grenzen: {}, ansichten: [a] })
  assert.deepStrictEqual(r.fehler, [])
  const p = path.join(tmp, 'glider.lua'); fs.writeFileSync(p, r.text)
  const skript = path.join(tmp, 'g.lua')
  fs.writeFileSync(skript, `local d = dofile(${JSON.stringify(REFERENZ)})(arg[1], 1)\nlocal t = {} for _, q in ipairs(d.ansichten[1].plaetze) do t[#t + 1] = q.w end\nprint(table.concat(t, ",") .. ";" .. d.einstellungen.vfr_w .. ";" .. d.einstellungen.vfr_a)\n`)
  assert.strictEqual(execFileSync('lua', [skript, p]).toString().trim(), neu.map((k) => `lua:${k}`).join(',') + ';70;50')
})
