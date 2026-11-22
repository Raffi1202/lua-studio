'use strict'
// Format 2 (Lua-Studio-Format 2.md): Symbole, Schmuck, Format-Wahl, Grössenwächter, Presets, Vorbereiten, Symbol-Dateien beim Übertragen.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const S = require('../src/studio/studio')
const Y = require('../src/studio/symbole')
const W = require('../src/studio/waechter')
const F = require('../src/format/format')
const { ordnerZiel } = require('../src/studio/ziel')

const B = S.beschreibungenLaden(path.join(__dirname, 'vorlagen'))
const grau = (k, v = 0) => Buffer.alloc(k * k, v)

function projekt(plaetze, deko) {
  const a = { breite: 784, hoehe: 316, plaetze }
  if (deko) a.deko = deko
  return { einstellungen: {}, werte: {}, grenzen: {}, ansichten: [a] }
}
const platz = (extra = {}) => ({ x: 4, y: 4, b: 200, h: 100, w: 'lua:akku_proz', darstellung: 'zahl', ...extra })
const meta2 = { studioVersion: '0.3.0', funke: 'X18RS', modell: 'Test', luaVersion: '1.0.0', formate: [1, 2] }

test('Symbolsatz: 34 Symbole mit SVG-Quelle, Schlepp erst ab 48 px, keine Einheit-Symbole', () => {
  assert.strictEqual(Y.KATALOG.length, 34)
  for (const k of Y.KATALOG) {
    assert.match(k.name, Y.NAME)
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'src', 'symbole', 'svg', `${k.name}.svg`)), k.name)
  }
  assert.strictEqual(Y.imKatalog('schlepp').minPx, 48)
  for (const n of ['spannung', 'strom', 'verbrauch', 'energie', 'drehzahl', 'gas', 'regler', 'bec', 'pumpe', 'governor', 'rotor']) assert.strictEqual(Y.imKatalog(n), null, n)
})

test('Kantenlänge je Display (Format 2 §2)', () => {
  assert.deepStrictEqual([784, 800, 630, 640, 472, 480].map(Y.displayBreite), [800, 800, 640, 640, 480, 480])
  assert.deepStrictEqual([24, 32, 48, 64].map((p) => Y.kante(p, 640)), [19, 26, 38, 51])
  assert.deepStrictEqual([24, 32, 48, 64].map((p) => Y.kante(p, 480)), [14, 19, 29, 38])
})

test('Graustufen-PNG: gültiger Kopf, Farbtyp 0, Inhalt stimmt; Kopfprüfung weist Falsches ab', () => {
  const g = grau(48, 255); g[0] = 0; g[47 * 48 + 47] = 128
  const png = Y.pngGrau(48, g)
  assert.strictEqual(Y.pngPruefen(png, 48), null)
  assert.strictEqual(png[25], 0) // Farbtyp
  assert.ok(png.length < 4096)
  // IDAT entpacken und vergleichen
  let i = 8, idat = []
  while (i < png.length) { const n = png.readUInt32BE(i); const art = png.toString('ascii', i + 4, i + 8); if (art === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + n)); i += 12 + n }
  const roh = zlib.inflateSync(Buffer.concat(idat))
  assert.strictEqual(roh[1], 0); assert.strictEqual(roh[47 * 49 + 48], 128); assert.strictEqual(roh[2], 255)
  assert.strictEqual(Y.pngPruefen(png, 38), 'kante')
  assert.strictEqual(Y.pngPruefen(Buffer.from('kein png, nur text, aber lang genug'), 48), 'kennung')
  assert.strictEqual(Y.pngPruefen(png.subarray(0, 20), 48), 'kurz')
  const rgba = Buffer.from(png); rgba[25] = 6
  assert.strictEqual(Y.pngPruefen(rgba, 48), 'farbtyp')
  assert.strictEqual(Y.pngPruefen(Buffer.concat([png, Buffer.alloc(5000)]), 48), 'gross')
})

test('Format-Wahl: Format 2 nur wenn das Lua es kann und die Gestaltung es braucht', () => {
  const p = projekt([platz({ symbol: 'akku', symbolPx: 48, einheitZeigen: false })], [{ art: 'symbol', x: 600, y: 10, name: 'elektromotor', px: 64 }, { art: 'rahmen', x: 600, y: 100, b: 100, h: 50 }])
  const r2 = S.dateiDatenMitInfo(p, meta2)
  assert.strictEqual(r2.daten.format, 2)
  assert.strictEqual(r2.daten.symbole, undefined, 'ab 0.11.0 keine Symbole')
  const g = F.bauen(r2.daten)
  assert.deepStrictEqual(g.fehler, [])
  assert.strictEqual(F.pruefenWieFunke(g.text), null)
  const zurueck = F.lesen(g.text)
  assert.strictEqual(zurueck.format, 2)
  assert.strictEqual(zurueck.ansichten[0].plaetze[0].symbol, undefined)
  assert.strictEqual(zurueck.ansichten[0].plaetze[0].einheitZeigen, false)
  // 0.10.4: altes «fett» wird nicht mehr geschrieben (gilt wie «am Wert»)
  const pf = projekt([platz({ symbol: 'akku', symbolPx: 48, einheitZeigen: 'fett' })])
  assert.strictEqual(S.dateiDatenMitInfo(pf, meta2).daten.ansichten[0].plaetze[0].einheitZeigen, undefined)
  assert.deepStrictEqual(zurueck.ansichten[0].deko.map((d) => d.art), ['rahmen'])

  const r1 = S.dateiDatenMitInfo(p, { ...meta2, formate: [1] })
  assert.strictEqual(r1.daten.format, 1)
  assert.deepStrictEqual(r1.wegfall, ['luaKannNicht2'])
  assert.strictEqual(r1.daten.symbole, undefined)
  const t1 = F.bauen(r1.daten).text
  assert.ok(!/symbol|deko|einheitZeigen/.test(t1), t1)

  // Ohne Format-2-Felder bleibt es Format 1, auch wenn das Lua 2 kann
  assert.strictEqual(S.dateiDatenMitInfo(projekt([platz()]), meta2).daten.format, 1)
})

test('Ungültiges wird nicht geschrieben: fremde Symbole, Schlepp unter 48 px, kaputter Schmuck, mehr als 24 Schmuck', () => {
  const deko = [
    { art: 'text', x: 10, y: 10, b: 100, h: 20, text: 'Hallo' },
    { art: 'kreis', x: 1, y: 1, b: 5, h: 5 },
    { art: 'rahmen', x: 700, y: 10, b: 200, h: 20 },
    { art: 'linie', x: 10, y: 300, b: 100, h: -100 },
    { art: 'linie', x: 10, y: 10, b: 0, h: 0 },
    { art: 'symbol', x: 10, y: 10, name: '../x', px: 24 },
    { art: 'symbol', x: 10, y: 10, name: 'schlepp', px: 32 },
    { art: 'text', x: 10, y: 10, b: 100, h: 20, text: 'x'.repeat(25) },
  ]
  for (let i = 0; i < 30; i++) deko.push({ art: 'rahmen', x: i, y: i, b: 10, h: 10 })
  const r = S.dateiDatenMitInfo(projekt([platz({ symbol: 'rotor' }), platz({ x: 300, symbol: 'schlepp', symbolPx: 32 })], deko), meta2)
  const a = r.daten.ansichten[0]
  assert.strictEqual(a.deko.length, 24)
  assert.strictEqual(a.deko[0].art, 'text')
  assert.deepStrictEqual(a.deko[1], { art: 'linie', x: 10, y: 300, b: 100, h: -100 })
  assert.ok(!a.plaetze.some((p) => p.symbol))
  assert.ok(r.verworfen.includes('deko:anzahl'))   // Symbole fallen ab 0.11.0 still weg
  assert.strictEqual(F.pruefenWieFunke(F.bauen(r.daten).text), null)
})

test('Listen über 48 Einträge sperren (Format 2 §7.2)', () => {
  const p = projekt([platz()])
  for (let i = 0; i < 49; i++) p.werte[`sensor:0210:${i}`] = { faktor: 2 }
  const r = S.bauenMitWaechter(p, meta2)
  assert.ok(r.fehler.some((f) => f.includes('listen')))
})

test('Presets: Vorlagen aus beschreibung.json geprüft, sonst Standard des Luas; Leer und Anwenden', () => {
  const b = JSON.parse(JSON.stringify(B.testlua))
  const std = S.presets(b)
  assert.strictEqual(std.length, 1)
  assert.strictEqual(std[0].s, 'standard')
  b.vorlagen = [
    { s: 'sechs_s', name: { de: '6S', en: '6S' }, ansichten: [{ breite: 784, hoehe: 316, plaetze: [platz(), { x: 700, y: 0, b: 200, h: 50, w: 'x' }], deko: [{ art: 'rahmen', x: 0, y: 0, b: 10, h: 10 }, { art: 'x' }] }] },
    { s: 'Kaputt', name: { de: 'x' }, ansichten: [] },
  ]
  const v = S.presets(b)
  assert.strictEqual(v.length, 1)
  assert.strictEqual(v[0].ansichten[0].plaetze.length, 1)
  assert.strictEqual(v[0].ansichten[0].deko.length, 1)
  const p = S.presetAnwenden(projekt([]), v[0], [{ breite: 784, hoehe: 316 }, { breite: 800, hoehe: 480 }])
  assert.deepStrictEqual(p.ansichten.map((a) => `${a.breite}x${a.hoehe}:${a.plaetze.length}`), ['784x316:1', '800x480:0'])
})

test('Ohne Funke vorbereiten: Kennung nach Format v1 §2.1, Fenster der Displaygruppe, formate aus der Beschreibung', () => {
  const b = { ...B.testlua, formate: [1, 2], luaVersion: '0.9.0' }
  const i = S.vorbereitetInfo('M', b, 'Extra 330 6S')
  assert.strictEqual(i.kennung, 'Extra_330_6S')
  assert.deepStrictEqual(i.fenster, [{ breite: 630, hoehe: 258 }, { breite: 640, hoehe: 360 }])
  assert.deepStrictEqual(i.formate, [1, 2])
  assert.strictEqual(S.gruppeVonFenster([{ breite: 784, hoehe: 316 }]), 'L')
  assert.strictEqual(S.gruppeVonFenster([{ breite: 472, hoehe: 210 }]), 'S')
  assert.throws(() => S.vorbereitetInfo('X', b, 'a'))
  assert.throws(() => S.vorbereitetInfo('L', b, '  '))
  const np = S.neuesProjekt(b, i)
  assert.deepStrictEqual(np.ansichten.map((a) => `${a.breite}x${a.hoehe}`).sort(), ['630x258', '640x360'])
  const nl = S.neuesProjekt(b, S.vorbereitetInfo('L', b, 'X'))
  assert.ok(nl.ansichten.every((a) => [784, 800].includes(a.breite)))
})

// ab 0.10.6: zu jedem Platzsymbol gehören die kleinen Masken name_12/name_16 (Kante 12/16 bei 800er-Displays)
function mitMasken(d) {
  const r = { ...(d || {}) }
  for (const n of Object.keys(d || {})) { const name = n.replace(/_\d+\.png$/, ''); for (const k of [12, 16]) if (!r[`${name}_${k}.png`]) r[`${name}_${k}.png`] = Y.pngGrau(k, Buffer.alloc(k * k, 200)) }
  return r
}
test('Preset auf ein X14-Modell: Grössen des Modells bleiben, fremde Preset-Ansichten fallen weg', () => {
  const preset = { ansichten: [{ breite: 784, hoehe: 316, plaetze: [platz()] }, { breite: 800, hoehe: 480, plaetze: [platz()] }, { breite: 630, hoehe: 258, plaetze: [platz({ b: 150 })] }] }
  const x14 = [{ breite: 630, hoehe: 258 }, { breite: 640, hoehe: 360 }]
  const p = S.presetAnwenden({ einstellungen: {}, werte: {}, grenzen: {}, ansichten: [] }, preset, x14)
  assert.deepStrictEqual(p.ansichten.map((a) => `${a.breite}x${a.hoehe}:${a.plaetze.length}`), ['630x258:1', '640x360:0'])
  // ohne Fenster: die bisherigen Ansichten des Projekts bestimmen die Grössen
  const q = S.presetAnwenden({ ansichten: [{ breite: 800, hoehe: 480, plaetze: [] }] }, preset, [])
  assert.deepStrictEqual(q.ansichten.map((a) => `${a.breite}x${a.hoehe}:${a.plaetze.length}`), ['800x480:1'])
  // Vorlagen mit mehr als 2 Ansichten werden nicht auf die ersten 2 gekürzt
  const b = { ...B.testlua, vorlagen: [{ s: 'v', name: { de: 'v', en: 'v' }, ansichten: preset.ansichten }] }
  assert.strictEqual(S.presets(b)[0].ansichten.length, 3)
})

test('Ungültige Werte aus Vorlagen werden nicht geschrieben und gemeldet', () => {
  const b = { ...B.testlua, vorlagen: [{ s: 'v', name: { de: 'v', en: 'v' }, ansichten: [{ breite: 784, hoehe: 316,
    plaetze: [platz({ symbol: 'akku', symbolPx: 40, einheitZeigen: 'xx', farbe: [999, -5, 'q'], darstellung: 'gibtsnicht' })],
    deko: [{ art: 'rahmen', x: 0, y: 0, b: 10, h: 10, farbe: [1000000, 'z'] }] }] }] }
  const v = S.presets(b)[0]
  const p = v.ansichten[0].plaetze[0]
  assert.strictEqual(p.symbolPx, undefined); assert.strictEqual(p.einheitZeigen, undefined); assert.strictEqual(p.farbe, undefined); assert.strictEqual(p.darstellung, undefined)
  assert.strictEqual(v.ansichten[0].deko[0].farbe, undefined)
  assert.ok(v.verworfen.includes('farbe'))
  // auch direkt im Projekt: das Studio schreibt keine Werte ausserhalb von Format 2
  const r = S.dateiDatenMitInfo(projekt([platz({ symbol: 'akku', symbolPx: 40, einheitZeigen: 'xx', farbeWarn: [1, 2] })]), meta2)
  const q = r.daten.ansichten[0].plaetze[0]
  assert.strictEqual(q.symbolPx, undefined); assert.strictEqual(q.einheitZeigen, undefined); assert.strictEqual(q.farbeWarn, undefined)
  assert.ok(r.verworfen.includes('farbeWarn'))
})

test('Funken-Schnelltest: Info-Datei und Log auswerten', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-st-'))
  const ziel = ordnerZiel('ordner', tmp)
  const info = (x) => fs.writeFileSync(path.join(tmp, 'M.testlua.info.json'), JSON.stringify({ lua: 'testlua', luaVersion: '0.4.0', formate: [1, 2], studioDatei: 'geladen', sensoren: [{ appId: 528, sub: 0, phys: 3, name: 'VFAS' }], ...x }))
  let r = await S.schnelltest({ ziel, kennung: 'M', lua: 'testlua', format: 2, vorher: null, logZeilen: ['Electric bereit'] })
  assert.deepStrictEqual(r.punkte.map((x) => x.k), ['infoFehlt', 'logSauber'])
  assert.strictEqual(r.ok, false)
  info({})
  r = await S.schnelltest({ ziel, kennung: 'M', lua: 'testlua', format: 2, vorher: null, logZeilen: ['ok'] })
  assert.strictEqual(r.ok, true)
  info({ studioDatei: 'zuNeu', formate: [1], sensoren: [], fehler: 3 })
  const vorher = fs.readFileSync(path.join(tmp, 'M.testlua.info.json'), 'utf8')
  r = await S.schnelltest({ ziel, kennung: 'M', lua: 'testlua', format: 2, vorher, logZeilen: ['x', '/scripts/testlua/main.lua:12: attempt to index a nil value', 'Studio-Symbol: akku_48 fehlt', '/scripts/anderes/main.lua:3: attempt to call nil', 'Fehler: 0'] })
  const k = r.punkte.map((x) => `${x.stufe}:${x.k}`)
  for (const e of ['warn:infoAlt', 'fehler:studioStatus', 'warn:studioFelder', 'fehler:formatNicht', 'warn:keineSensoren', 'fehler:log', 'warn:log', 'warn:logAnderes']) assert.ok(k.includes(e), e + ' fehlt in ' + k)
  assert.strictEqual(r.punkte.filter((x) => x.k === 'log' || x.k === 'logAnderes').length, 3, 'Fehler: 0 ist kein Befund')
  assert.strictEqual(r.ok, false)
  // Alte Info-Datei mit «geladen» ist keine Entwarnung
  info({})
  const alt = fs.readFileSync(path.join(tmp, 'M.testlua.info.json'), 'utf8')
  r = await S.schnelltest({ ziel, kennung: 'M', lua: 'testlua', format: 2, vorher: alt, logZeilen: [] })
  assert.strictEqual(r.unsicher, true)
  assert.ok(r.punkte.some((x) => x.k === 'studioGeladenAlt') && !r.punkte.some((x) => x.k === 'studioGeladen'))
  fs.writeFileSync(path.join(tmp, 'M.testlua.info.json'), '{kaputt')
  r = await S.schnelltest({ ziel, kennung: 'M', lua: 'testlua', format: 1, logZeilen: null })
  assert.deepStrictEqual(r.punkte.map((x) => x.k), ['infoKaputt'])
})

test('M6: formate aus der Info-Datei, wenn meta.formate fehlt; Schnelltest meldet nicht sichtbare Ansicht', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-m6-'))
  const ziel = ordnerZiel('ordner', tmp)
  fs.writeFileSync(path.join(tmp, 'E.testlua.info.json'), JSON.stringify({ lua: 'testlua', formate: [1, 2], studioDatei: 'geladen', fenster: [{ breite: 800, hoehe: 480 }], sensoren: [{ appId: 1, sub: 0, phys: 0, name: 'x' }] }))
  const { formate, ...ohne } = meta2
  const p = { einstellungen: {}, werte: {}, grenzen: {}, ansichten: [{ breite: 784, hoehe: 316, plaetze: [platz({ einheitZeigen: false })] }] }
  await S.uebertragen({ ziel, ablage: new S.Ablage(path.join(tmp, 'pc')), funkeName: 'X', kennung: 'E', lua: 'testlua', projekt: p, meta: ohne,
    funkeUebernehmen: false, schritt: () => {}, werkGrenzen: {}, symbolDateien: mitMasken({ 'akku_24.png': Y.pngGrau(24, grau(24)) }) })
  assert.strictEqual(F.lesen(fs.readFileSync(path.join(tmp, 'E.testlua.lua'), 'utf8')).format, 2)
  const r = await S.schnelltest({ ziel, kennung: 'E', lua: 'testlua', format: 2, logZeilen: [], groessen: [{ breite: 784, hoehe: 316 }] })
  assert.ok(r.punkte.some((x) => x.k === 'ansichtNichtSichtbar' && x.wert === '800 × 480'))
  const r2 = await S.schnelltest({ ziel, kennung: 'E', lua: 'testlua', format: 2, logZeilen: [], groessen: [{ breite: 800, hoehe: 480 }] })
  assert.ok(!r2.punkte.some((x) => x.k === 'ansichtNichtSichtbar'))
})

test('Neues Projekt: Fenstergrösse der Funke geht vor den Standardansichten (X14-Funke mit zwei 800er-Standards)', () => {
  const b = { ...B.testlua, standard: { ...B.testlua.standard, ansichten: [{ breite: 784, hoehe: 316, plaetze: [] }, { breite: 800, hoehe: 480, plaetze: [] }] } }
  const p = S.neuesProjekt(b, { fenster: [{ breite: 640, hoehe: 360 }, null, { breite: 'x' }] })
  assert.strictEqual(p.ansichten[0].breite, 640)
  assert.strictEqual(p.ansichten.length, 2)
})

test('Schnelltest (0.9.0): neue Felder der Info-Datei und Warnung bei älterem Lua ohne Menü-Wahl', async () => {
  const S2 = require('../src/studio/studio')
  const info = { format: 1, lua: 'gas_carb', luaVersion: '0.11.0', fenster: [{ breite: 800, hoehe: 480 }], sensoren: [{ name: 'A' }], studioQuelle: 'RADIO:/scripts/studio/Bobber.gas_carb.lua', studioWahl: 'menue', ansichtGenutzt: '800x480', angepasst: true, hinweis: 'Studio: Ansicht 800×480 angepasst' }
  const ziel = { lesen: async (n) => (n.endsWith('.info.json') ? Buffer.from(JSON.stringify(info)) : null), liste: async () => [] }
  const r = await S2.schnelltest({ ziel, kennung: 'Bobber', lua: 'gas_carb', format: 1, vorher: null, logZeilen: [] })
  const k = r.punkte.map((x) => x.k)
  for (const x of ['studioQuelle', 'ansichtAngepasst', 'luaHinweis', 'keineMenueWahl']) assert.ok(k.includes(x), x)
  assert.ok(r.punkte.find((x) => x.k === 'studioQuelle').wert.includes('(Menü)'))
})

test('Kleine Masken 12/16 (0.10.6): Stufe im Platzkopf, Dateiliste, Wächter zählt nur 24–64', () => {
  assert.strictEqual(Y.kopfPx(18, 800), 16); assert.strictEqual(Y.kopfPx(12, 800), 12); assert.strictEqual(Y.kopfPx(9, 800), 12); assert.strictEqual(Y.kopfPx(30, 800), 24)
  const daten = { symbole: [{ name: 'akku', px: 48 }], ansichten: [{ breite: 800, hoehe: 480, plaetze: [{ symbol: 'akku', symbolPx: 48 }] }] }
  assert.deepStrictEqual(Y.dateiListe(daten).map((s) => `${s.name}_${s.px}`), ['akku_48', 'akku_12', 'akku_16'])
  assert.strictEqual(Y.grosseSymbole(Y.dateiListe(daten)).length, 1)
  assert.ok(Y.DATEI.test('akku_12.png') && Y.DATEI.test('akku_16.png') && !Y.DATEI.test('akku_20.png'))
  assert.ok(!Y.PX_WAHL.includes(12), '12/16 nicht wählbar')
})

test('Schalter «Alle Symbole aus» (0.10.6): keine Symbole in der Datei, Projekt behält sie', () => {
  const p = projekt([platz({ symbol: 'akku', symbolPx: 48 })], [{ art: 'symbol', x: 600, y: 10, name: 'elektromotor', px: 64 }])
  p.symboleAus = true
  const d = S.dateiDatenMitInfo(p, meta2).daten
  assert.strictEqual(d.symbole, undefined)
  assert.strictEqual(d.ansichten[0].plaetze[0].symbol, undefined)
  assert.ok(!(d.ansichten[0].deko || []).some((x) => x.art === 'symbol'))
  assert.strictEqual(Y.dateiListe(d).length, 0, 'keine Symbolbilder')
  assert.strictEqual(p.ansichten[0].plaetze[0].symbol, 'akku', 'Projekt behält das Symbol')
})

test('Symbole entfallen ab 0.11.0: keine Symbole in Datei und Vorlagen, keine Bilder, alte Bilder als Angebot zum Löschen', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-ohne-sym-'))
  const ziel = ordnerZiel('laufwerk', path.join(tmp, 'sd'))
  fs.mkdirSync(path.join(tmp, 'sd', 'scripts', 'studio', 'symbole'), { recursive: true })
  const alt = path.join(tmp, 'sd', 'scripts', 'studio', 'symbole')
  for (const n of ['akku_48.png', 'akku_12.png', 'stern_24.png']) fs.writeFileSync(path.join(alt, n), Y.pngGrau(4, grau(4)))
  const p = projekt([platz({ symbol: 'akku', symbolPx: 48 })], [{ art: 'symbol', x: 600, y: 10, name: 'stern', px: 32 }])
  assert.ok(S.symboleIn(p))
  const d = S.dateiDaten(p, meta2)
  assert.strictEqual(d.symbole, undefined)
  assert.ok(!d.ansichten[0].plaetze[0].symbol && !(d.ansichten[0].deko || []).some((x) => x.art === 'symbol'))
  assert.strictEqual(Y.dateiListe(d).length, 0, 'keine Symbolbilder')
  // alte Bilder: Angebot zum Löschen (nur mit Haken), danach sind sie weg
  const u = await S.symboleUnbenutzt(ziel, 'Test.testlua.lua', [])
  assert.deepStrictEqual(u.namen.sort(), ['akku_12.png', 'akku_48.png', 'stern_24.png'])
  await S.uebertragen({ ziel, ablage: new S.Ablage(path.join(tmp, 'pc')), funkeName: 'X18RS', kennung: 'Test', lua: 'testlua', projekt: p,
    meta: meta2, funkeUebernehmen: false, schritt: () => {}, werkGrenzen: {}, symbolDateien: {}, symboleLoeschen: u.namen })
  assert.deepStrictEqual(fs.readdirSync(alt).filter((n) => n.endsWith('.png')), [])
  // Vorlagen ohne Symbole
  const b = { ...B.testlua, vorlagen: [{ s: 'v', name: { de: 'v', en: 'v' }, ansichten: [{ breite: 784, hoehe: 316, plaetze: [platz({ symbol: 'akku', symbolPx: 48 })],
    deko: [{ art: 'symbol', x: 600, y: 10, name: 'stern', px: 32 }] }] }] }
  const v = S.presets(b)[0]
  assert.strictEqual(v.ansichten[0].plaetze[0].symbol, undefined)
  assert.ok(!(v.ansichten[0].deko || []).some((x) => x.art === 'symbol'))
})
