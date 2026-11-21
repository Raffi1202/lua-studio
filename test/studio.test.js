'use strict'
// Studio-Kern: Modelle aus Info-Dateien, neues Projekt, Übertragen auf ein Ordner-Ziel mit Sicherung und .funke.lua.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const S = require('../src/studio/studio')
const { ordnerZiel } = require('../src/studio/ziel')
const F = require('../src/format/format')

const B = S.beschreibungenLaden(path.join(__dirname, 'vorlagen'))

function umgebung() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-studio-'))
  const sd = path.join(tmp, 'ETHOS_SD')
  fs.mkdirSync(path.join(sd, 'scripts', 'studio'), { recursive: true })
  const info = { format: 1, lua: 'testlua', luaVersion: '0.0.1', formate: [1], modell: 'Möwe 3S', kennung: 'M__we_3S',
    funke: 'X18RS', ethos: '26.2.0', fenster: [{ breite: 784, hoehe: 316 }, { breite: 800, hoehe: 480 }], studioDatei: 'fehlt', sensoren: [] }
  fs.writeFileSync(path.join(sd, 'scripts', 'studio', 'M__we_3S.testlua.info.json'), JSON.stringify(info))
  return { tmp, sd, ziel: ordnerZiel('laufwerk', sd), ablage: new S.Ablage(path.join(tmp, 'ablage')), info }
}

test('Beschreibung laden, Modelle aus Info-Dateien, neues Projekt mit Fenstern', async () => {
  assert.ok(B.testlua)
  const u = umgebung()
  const m = await S.modelleLesen(u.ziel)
  assert.strictEqual(m.length, 1)
  assert.strictEqual(m[0].info.modell, 'Möwe 3S')
  assert.strictEqual(F.kennung(m[0].info.modell), m[0].kennung)
  const p = S.neuesProjekt(B.testlua, m[0].info)
  assert.strictEqual(p.einstellungen.kapaz, 4500)
  assert.deepStrictEqual(p.ansichten.map((a) => `${a.breite}x${a.hoehe}`), ['784x316', '800x480'])
  assert.strictEqual(p.ansichten[0].plaetze.length, 3)
  fs.rmSync(u.tmp, { recursive: true, force: true })
})

test('Übertragen: schreiben, zurücklesen, Sicherung der alten Datei, .funke.lua übernehmen und löschen', async () => {
  const u = umgebung()
  const projekt = S.neuesProjekt(B.testlua, u.info)
  projekt.grenzen['lua:akku_proz'] = { richtung: 'unter', warnung: 30, alarm: 20 }
  const meta = { studioVersion: '0.2.0', funke: 'X18RS', modell: 'Möwe 3S', luaVersion: '0.0.1' }
  const schritte = []
  let r = await S.uebertragen({ ziel: u.ziel, ablage: u.ablage, funkeName: 'X18RS', kennung: 'M__we_3S', lua: 'testlua', projekt, meta, funkeUebernehmen: true, schritt: (t) => schritte.push(t) })
  assert.ok(r.ok)
  const datei = path.join(u.sd, 'scripts', 'studio', 'M__we_3S.testlua.lua')
  assert.strictEqual(F.pruefenWieFunke(fs.readFileSync(datei, 'utf8')), null)
  assert.ok(schritte.includes('nichtsZuSichern') && schritte.includes('modellSelbstLaden'))

  // Änderung an der Funke simulieren, dann erneut übertragen
  fs.writeFileSync(path.join(u.sd, 'scripts', 'studio', 'M__we_3S.testlua.funke.lua'), F.dateiText({ einstellungen: { kapaz: 3300 }, grenzen: { 'lua:akku_proz': { warnung: 35 } } }))
  schritte.length = 0
  r = await S.uebertragen({ ziel: u.ziel, ablage: u.ablage, funkeName: 'X18RS', kennung: 'M__we_3S', lua: 'testlua', projekt, meta, funkeUebernehmen: true, schritt: (t) => schritte.push(t) })
  const neu = F.lesen(fs.readFileSync(datei, 'utf8'))
  assert.strictEqual(neu.einstellungen.kapaz, 3300)
  assert.deepStrictEqual(neu.grenzen['lua:akku_proz'], { richtung: 'unter', warnung: 35, alarm: 20 })
  assert.ok(!fs.existsSync(path.join(u.sd, 'scripts', 'studio', 'M__we_3S.testlua.funke.lua')), '.funke.lua muss gelöscht sein')
  assert.ok(r.sicherung && fs.existsSync(r.sicherung), 'alte Datei muss gesichert sein')
  fs.rmSync(u.tmp, { recursive: true, force: true })
})

test('Übertragen bricht ab, wenn die Datei zu gross würde, und schreibt nichts', async () => {
  const u = umgebung()
  const projekt = S.neuesProjekt(B.testlua, u.info)
  const voll = (i) => ({ x: 0, y: 0, b: 90, h: 50, w: 'lua:strom', farbe: [1, 2, 3], farbeWarn: [1, 2, 3], farbeAlarm: [1, 2, 3], hintergrund: [1, 2, 3], stufen: [{ ab: 1, farbe: [1, 1, 1] }, { ab: 2, farbe: [1, 1, 1] }, { ab: 3, farbe: [1, 1, 1] }], titel: `T${i}` })
  projekt.ansichten = [{ breite: 784, hoehe: 316, plaetze: Array.from({ length: 16 }, (_, i) => voll(i)) }, { breite: 800, hoehe: 480, plaetze: Array.from({ length: 16 }, (_, i) => voll(i)) }]
  await assert.rejects(S.uebertragen({ ziel: u.ziel, ablage: u.ablage, funkeName: 'X18RS', kennung: 'M__we_3S', lua: 'testlua', projekt, meta: {}, funkeUebernehmen: false }), /pruefen\|/)
  assert.ok(!fs.existsSync(path.join(u.sd, 'scripts', 'studio', 'M__we_3S.testlua.lua')))
  fs.rmSync(u.tmp, { recursive: true, force: true })
})

test('.funke.lua: «warnung = false» schaltet nur die Warnung aus, der Alarm bleibt (auch ohne Eintrag in der Studio-Datei)', () => {
  const projekt = { einstellungen: {}, werte: {}, grenzen: { 'lua:strom': { richtung: 'ueber', warnung: 80, alarm: 100 } }, ansichten: [] }
  const werk = { 'lua:akku_proz': { richtung: 'unter', warnung: 30, alarm: 20 } }
  const p = S.funkeAenderungenUebernehmen(projekt, { grenzen: { 'lua:strom': { warnung: false }, 'lua:akku_proz': { warnung: false } } }, werk)
  assert.deepStrictEqual(p.grenzen['lua:strom'], { richtung: 'ueber', warnung: false, alarm: 100 })
  assert.deepStrictEqual(p.grenzen['lua:akku_proz'], { richtung: 'unter', warnung: false, alarm: 20 })
  // ungültige Typen werden nicht übernommen
  const q = S.funkeAenderungenUebernehmen(projekt, { grenzen: { 'lua:strom': { warnung: 'x', aus: 1 } } }, werk)
  assert.deepStrictEqual(q.grenzen['lua:strom'], { richtung: 'ueber', warnung: 80, alarm: 100 })
  const s = F.dateiText({ grenzen: { 'lua:x': { warnung: false } } })
  assert.strictEqual(F.pruefenWieFunke(s), null)
  assert.strictEqual(F.lesen(s).grenzen['lua:x'].warnung, false)
})

test('Leere Ansichten werden nicht geschrieben (sonst zeigte das Lua ein leeres Widget statt seiner Belegung)', () => {
  const d = S.dateiDaten({ einstellungen: {}, werte: {}, grenzen: {}, ansichten: [{ breite: 784, hoehe: 316, plaetze: [] }, { breite: 800, hoehe: 480, plaetze: [{ x: 0, y: 0, b: 100, h: 60, w: 'lua:strom' }] }] }, {})
  assert.deepStrictEqual(d.ansichten.map((a) => a.breite), [800])
})

test('Doppelte Kennungen ohne Rücksicht auf Gross/Klein werden markiert', async () => {
  // nachgebildetes Ziel: das Mac-Dateisystem selbst unterscheidet Gross/Klein nicht, die Funke kann beide Namen liefern
  const namen = ['Extra', 'EXTRA', 'Andere'].map((k) => ({ name: `${k}.testlua.info.json` }))
  const ziel = { liste: async () => namen, lesen: async () => Buffer.from('{}') }
  const m = await S.modelleLesen(ziel)
  assert.deepStrictEqual(m.filter((x) => x.doppelt).map((x) => x.kennung).sort(), ['EXTRA', 'Extra'])
})

test('Format-Prüfung wie die Funke: Unicode-Leerraum und Bytes über 0x7F abgelehnt; lesen() bricht sauber ab', () => {
  assert.notStrictEqual(F.pruefenWieFunke('return {\u00a0a = 1 }'), null)
  assert.notStrictEqual(F.pruefenWieFunke('return {\u2028a = 1 }'), null)
  assert.throws(() => F.lesen('return { a = "\\65'))
})

test('«auch bei Motor aus» (Format 2 §3.5): nur false wird geschrieben, .funke.lua je Feld, Datei besteht die Funken-Prüfung', () => {
  const projekt = { einstellungen: {}, werte: {}, ansichten: [{ breite: 800, hoehe: 480, plaetze: [{ x: 0, y: 0, b: 100, h: 60, w: 'lua:strom' }] }],
    grenzen: { 'lua:strom': { richtung: 'ueber', warnung: 80, alarm: 100, beiMotorAus: false }, 'lua:temp': { richtung: 'ueber', alarm: 90, beiMotorAus: true }, 'lua:zelle': { richtung: 'unter', alarm: 3.3 } } }
  const d = S.dateiDaten(projekt, {})
  assert.strictEqual(d.grenzen['lua:strom'].beiMotorAus, false)
  assert.ok(!('beiMotorAus' in d.grenzen['lua:temp']), 'true wird weggelassen (fehlt = true)')
  assert.ok(!('beiMotorAus' in d.grenzen['lua:zelle']))
  assert.strictEqual(projekt.grenzen['lua:temp'].beiMotorAus, true, 'Projekt bleibt unverändert')
  const s = F.dateiText(d)
  assert.strictEqual(F.pruefenWieFunke(s), null)
  assert.match(s, /beiMotorAus = false/)
  assert.strictEqual((s.match(/beiMotorAus/g) || []).length, 1)
  assert.strictEqual(F.lesen(s).grenzen['lua:strom'].beiMotorAus, false)
  // .funke.lua: true hebt ein false auf, falscher Typ wird nicht übernommen, neuer Eintrag beginnt mit den Werkgrenzen
  const werk = { 'lua:akku_proz': { richtung: 'unter', warnung: 30, alarm: 20 } }
  const p = S.funkeAenderungenUebernehmen(projekt, { grenzen: { 'lua:strom': { beiMotorAus: true }, 'lua:zelle': { beiMotorAus: 0 }, 'lua:akku_proz': { beiMotorAus: false } } }, werk)
  assert.strictEqual(p.grenzen['lua:strom'].beiMotorAus, true)
  assert.ok(!('beiMotorAus' in p.grenzen['lua:zelle']))
  assert.deepStrictEqual(p.grenzen['lua:akku_proz'], { richtung: 'unter', warnung: 30, alarm: 20, beiMotorAus: false })
})

test('Umbenennung 21.11.2026: Projekte und Vorlagen am PC ziehen auf den neuen Lua-Namen um, alte Datei als Sicherung', () => {
  const w = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-alias-'))
  fs.mkdirSync(path.join(w, 'modelle', 'X18RS'), { recursive: true })
  fs.writeFileSync(path.join(w, 'modelle', 'X18RS', 'Extra.elektro.json'), JSON.stringify({ grenzen: {}, info: { lua: 'elektro' } }))
  fs.writeFileSync(path.join(w, 'modelle', 'X18RS', 'Goblin.helirf.json'), '{}')
  fs.mkdirSync(path.join(w, 'vorlagen', 'segler'), { recursive: true })
  fs.writeFileSync(path.join(w, 'vorlagen', 'segler', 'Thermik.json'), '{}')
  const u = S.ablageUmziehen(w, ['electric', 'glider', 'helirf', 'jet'])
  assert.deepStrictEqual(u.sort(), ['X18RS/Extra.elektro.json', 'vorlagen/segler/Thermik.json'])
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(w, 'modelle', 'X18RS', 'Extra.electric.json'), 'utf8')).info.lua, 'electric')
  assert.ok(fs.existsSync(path.join(w, 'vor-umbenennung', 'modelle', 'X18RS', 'Extra.elektro.json')), 'alte Datei gesichert')
  assert.ok(fs.existsSync(path.join(w, 'modelle', 'X18RS', 'Goblin.helirf.json')), 'helirf bleibt, solange heli nicht bekannt ist')
  assert.ok(fs.existsSync(path.join(w, 'vorlagen', 'glider', 'Thermik.json')))
  assert.deepStrictEqual(S.ablageUmziehen(w, ['electric', 'glider']), [], 'zweiter Lauf: nichts mehr')
})

test('Umbenennung: alte Studio-Datei auf der Funke wird erkannt und bleibt beim Übertragen liegen', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-alias2-'))
  const ziel = ordnerZiel('ordner', tmp)
  fs.writeFileSync(path.join(tmp, 'Extra.electric.info.json'), JSON.stringify({ format: 1, lua: 'electric', modell: 'Extra', kennung: 'Extra', fenster: [{ breite: 800, hoehe: 480 }], formate: [1] }))
  fs.writeFileSync(path.join(tmp, 'Extra.elektro.lua'), F.dateiText({ format: 1, ansichten: [] }))
  const m = await S.modelleLesen(ziel)
  assert.strictEqual(m[0].alteStudioDatei, 'Extra.elektro.lua')
  const schritte = []
  await S.uebertragen({ ziel, ablage: new S.Ablage(path.join(tmp, 'pc')), funkeName: 'X18RS', kennung: 'Extra', lua: 'electric', meta: { formate: [1] }, funkeUebernehmen: false, werkGrenzen: {},
    projekt: { einstellungen: {}, werte: {}, grenzen: {}, ansichten: [{ breite: 800, hoehe: 480, plaetze: [{ x: 0, y: 60, b: 100, h: 60, w: 'lua:strom' }] }] }, schritt: (t) => schritte.push(t) })
  assert.ok(fs.existsSync(path.join(tmp, 'Extra.electric.lua')) && fs.existsSync(path.join(tmp, 'Extra.elektro.lua')))
  assert.ok(schritte.includes('alteDateiBleibt|Extra.elektro.lua'))
})

test('Vorlage «Original» (0.6.0): Electric mit Farben wie die eingebaute Anzeige, alle 6 Fenstergrössen, gültig', () => {
  const b = S.beschreibungenLaden(path.join(__dirname, '..', 'src', 'luas'))
  const p = S.presets(b.electric)
  assert.strictEqual(p[0].s, 'original')
  assert.deepStrictEqual(p[0].verworfen, [])
  assert.deepStrictEqual(p[0].ansichten.map((a) => `${a.breite}x${a.hoehe}`).sort(), ['472x210', '480x320', '630x258', '640x360', '784x316', '800x480'])
  for (const a of p[0].ansichten) {
    for (const q of a.plaetze) assert.ok(q.x >= 0 && q.y >= 0 && q.x + q.b <= a.breite && q.y + q.h <= a.hoehe)
    for (const q of a.plaetze) for (const r of a.plaetze) if (q !== r) assert.ok(!(q.x < r.x + r.b && r.x < q.x + q.b && q.y < r.y + r.h && r.y < q.y + q.h))
  }
  const akku = p[0].ansichten.find((a) => a.breite === 800).plaetze.find((q) => q.w === 'lua:akku_proz')
  assert.deepStrictEqual(akku.farbe, [64, 220, 110])
  // Datei mit der Vorlage besteht die Prüfung wie die Funke (Format 2, nur bekannte Felder)
  const d = S.dateiDaten({ einstellungen: {}, werte: {}, grenzen: {}, ansichten: p[0].ansichten.filter((a) => a.breite >= 784) }, { formate: [1, 2] })
  assert.strictEqual(F.pruefenWieFunke(F.dateiText(d)), null)
  // Luas ohne Original-Vorlage: unverändert
  assert.ok(S.presets(b.jet)[0].s === 'original' && S.presets(b.jet)[0].ansichten.length === 6, 'Jet hat ab 0.7.0 eine Vorlage «Original»')
  assert.ok(S.presets(b.heli)[0].s === 'original' && S.presets(b.heli)[0].ansichten.length === 6, 'Heli hat ab 0.7.2 eine Vorlage «Original»')
  assert.ok(S.presets(b.gas_ecu)[0].s === 'original' && S.presets(b.gas_carb)[0].s === 'original')
  // Neue Modelle beginnen mit der Vorlage «Original»
  const np = S.neuesProjekt(b.electric, S.vorbereitetInfo('M', b.electric, 'Neu'))
  assert.deepStrictEqual(np.ansichten.map((a) => a.plaetze.length > 0), [true, true])
})

test('Vorlagen «Original» von Electric, Jet und Heli: jede Grösse gültig (Rand, Überlappung, reservierte Flächen, Mindestgrössen, Funke)', () => {
  const b = S.beschreibungenLaden(path.join(__dirname, '..', 'src', 'luas'))
  const M = { zahl: [90, 50], ring: [110, 110], balken_w: [140, 40], balken_s: [50, 110], kurve: [180, 90], status: [120, 40], zylinder: [160, 220], tank: [160, 220] }
  for (const lua of ['electric', 'jet', 'heli', 'glider', 'gas_ecu', 'gas_carb']) {
    const o = S.presets(b[lua])[0]
    assert.strictEqual(o.s, 'original', lua)
    assert.deepStrictEqual(o.verworfen, [], lua)
    for (const a of o.ansichten) {
      const f = a.breite / 800
      const res = (b[lua].reserviert || []).filter((r) => r.breite === a.breite && r.hoehe === a.hoehe)
      const ue = (p, q) => p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h
      for (const p of a.plaetze) {
        const wo = `${lua} ${a.breite}x${a.hoehe} ${p.w}`
        const [mb, mh] = M[p.darstellung || 'zahl']
        assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.b <= a.breite && p.y + p.h <= a.hoehe, wo)
        assert.ok(p.b >= Math.round(mb * f) && p.h >= Math.round(mh * f), `${wo} zu klein`)
        assert.ok(!res.some((r) => ue(p, r)), `${wo} auf reservierter Fläche`)
        assert.ok(!a.plaetze.some((q) => q !== p && ue(p, q)), `${wo} überlappt`)
      }
      const d = S.dateiDaten({ einstellungen: {}, werte: {}, grenzen: {}, ansichten: [a] }, { formate: [1, 2], extra: S.extraDarstellungen(b[lua], b[lua].luaVersion) })
      assert.strictEqual(F.pruefenWieFunke(F.dateiText(d)), null, `${lua} ${a.breite}x${a.hoehe}`)
    }
  }
})

test('Darstellungen des Luas (Gas Engine 1.11.0 / 0.11.0 «zylinder», «tank»): nur mit darstellungenExtra; sonst sauber verworfen', () => {
  const b = S.beschreibungenLaden(path.join(__dirname, '..', 'src', 'luas'))
  assert.deepStrictEqual(Object.keys(b.gas_ecu.darstellungenExtra).filter((d) => !d.startsWith('_')).sort(), ['tank', 'zylinder'])
  const voll = S.presets(b.gas_ecu)[0].ansichten.find((a) => a.breite === 800)
  assert.ok(voll.plaetze.some((p) => p.darstellung === 'zylinder') && voll.plaetze.some((p) => p.darstellung === 'tank'))
  const projekt = { einstellungen: {}, werte: {}, grenzen: {}, ansichten: [{ breite: 800, hoehe: 480, plaetze: [{ x: 6, y: 90, b: 248, h: 300, w: 'lua:cht_max', darstellung: 'zylinder' }] }] }
  // Lua kennt die Darstellung (extra): bleibt; älteres Lua bzw. ohne extra: Darstellung fällt weg (Standard «zahl»)
  assert.strictEqual(S.dateiDaten(projekt, { formate: [1, 2], extra: ['zylinder', 'tank'] }).ansichten[0].plaetze[0].darstellung, 'zylinder')
  const r = S.dateiDatenMitInfo(projekt, { formate: [1, 2] })
  assert.strictEqual(r.daten.ansichten[0].plaetze[0].darstellung, undefined)
  assert.ok(r.verworfen.includes('darstellung'))
  // Lua auf der Funke älter als die Beschreibung (Gas ECU 1.10.0): keine Darstellungen des Luas; zweite gleiche Darstellung fällt weg
  assert.deepStrictEqual(S.extraDarstellungen(b.gas_ecu, '1.10.0'), [])
  assert.deepStrictEqual(S.extraDarstellungen(b.gas_ecu), [], 'ohne Version der Funke keine')
  assert.deepStrictEqual(S.extraDarstellungen(b.gas_ecu, '1.11.0').sort(), ['tank', 'zylinder'])
  const zwei = { ...projekt, ansichten: [{ breite: 800, hoehe: 480, plaetze: [projekt.ansichten[0].plaetze[0], { x: 300, y: 90, b: 248, h: 300, w: 'lua:cht_max', darstellung: 'zylinder' }] }] }
  assert.deepStrictEqual(S.dateiDaten(zwei, { extra: ['zylinder'] }).ansichten[0].plaetze.map((p) => p.darstellung), ['zylinder', undefined])
  assert.ok(S.presets(b.gas_carb)[0].ansichten.find((a) => a.breite === 800).plaetze.some((p) => p.darstellung === 'tank'))
  // Electric (ohne darstellungenExtra) bekommt keine Gas-Darstellung über eine Vorlage
  assert.ok(!S.presets(b.electric).some((x) => x.ansichten.some((a) => a.plaetze.some((p) => p.darstellung === 'zylinder'))))
})

test('Funke (0.8.2): Studio-Ordner dort, wo das Lua seine Info-Datei geschrieben hat (auch interner Speicher), sonst neben dem Lua-Ordner', async () => {
  const { funkenZiel } = require('../src/studio/ziel')
  const baum = { 'SD:/scripts': [{ name: 'electric', ordner: true }], 'RADIO:/scripts/studio': [{ name: 'Bobber.gas_carb.info.json', groesse: 300 }] }
  const funke = { dateien: async (o) => (baum[o] ? { status: 0, liste: baum[o] } : (o.startsWith('RADIO:') || o.startsWith('/') || o.startsWith('SD:') ? { status: -2, liste: [] } : (() => { throw new Error('x') })())) }
  assert.strictEqual(await funkenZiel(funke, 'gas_carb').basis(), 'RADIO:/scripts/studio')
  assert.strictEqual(await funkenZiel(funke, 'electric').basis(), 'SD:/scripts/studio')
  assert.strictEqual(await funkenZiel(funke, 'jet').basis(), '/scripts/studio')
  // Pfad, den die Funke nicht kennt (Fehler beim Lesen), wird übersprungen
  const wirft = { dateien: async (o) => { if (o.startsWith('RADIO:')) throw new Error('unbekannt'); return { status: -2, liste: [] } } }
  assert.strictEqual(await funkenZiel(wirft, 'gas_carb').basis(), '/scripts/studio')
})

test('Funke (0.8.3): Diagnose nennt durchsuchte Ordner, Status und Info-Dateien', async () => {
  const { funkenZiel } = require('../src/studio/ziel')
  const funke = { dateien: async (o) => (o === '/scripts/studio' ? { status: 0, liste: [{ name: 'A.gas_carb.info.json' }, { name: 'x.lua' }] } : { status: -2, liste: [] }) }
  const z = funkenZiel(funke, 'gas_carb')
  assert.strictEqual(await z.basis(), '/scripts/studio')
  const d = z.diagnose().join('\n')
  assert.match(d, /SD:\/scripts\/studio: Status -2/)
  assert.match(d, /\/scripts\/studio: Status 0, 2 Einträge, Info: A\.gas_carb\.info\.json/)
})
