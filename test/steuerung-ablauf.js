'use strict'
// Ablauftest über die Steuerschnittstelle (ab 0.10.0, ersetzt den Bild-Selbsttest «motoraus»).
// Aufruf: node test/steuerung-ablauf.js  (startet Lua-Studio aus dem Quelltext mit eigenem Datenordner)
// 1. Ohne --steuerung: keine steuerung.json, kein Server.  2. Mit --steuerung: Zustand, Befehle, Vorschau, Datei speichern.
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const assert = require('assert')

const electron = require('electron')
const wurzel = path.join(__dirname, '..')
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms))

function start(daten, mitSteuerung) {
  const env = { ...process.env, LUA_STUDIO_DATEN: daten }
  delete env.ELECTRON_RUN_AS_NODE
  return spawn(electron, [wurzel, ...(mitSteuerung ? ['--steuerung'] : [])], { env, stdio: ['ignore', 'pipe', 'pipe'] })
}
function anfrage(z, weg, body) {
  return new Promise((ok, nein) => {
    const daten = body ? JSON.stringify(body) : ''
    const r = http.request({ host: '127.0.0.1', port: z.port, path: weg, method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${z.schluessel}`, 'Content-Type': 'application/json' } }, (res) => {
      let t = ''; res.on('data', (c) => { t += c }); res.on('end', () => { try { ok({ code: res.statusCode, ...JSON.parse(t) }) } catch (e) { nein(e) } })
    })
    r.on('error', nein); r.end(daten)
  })
}
const befehl = (z, name, args) => anfrage(z, '/befehl', { name, args })

;(async () => {
  const ausgabe = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'ls-steuerung-'))
  // 1. ohne Steuerung
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-aus-'))
  const p1 = start(d1, false)
  await schlaf(6000)
  assert.ok(!fs.existsSync(path.join(d1, 'steuerung.json')), 'ohne --steuerung keine steuerung.json')
  // kein Server: auch ein Port aus einer alten Datei wäre nicht erreichbar; hier prüfen wir, dass kein Lua-Studio-Prozess lauscht
  const lsof = require('child_process').spawnSync('lsof', ['-a', '-p', String(p1.pid), '-iTCP', '-sTCP:LISTEN'], { encoding: 'utf8' })
  assert.ok(!/LISTEN/.test(lsof.stdout || ''), 'ohne --steuerung kein offener Port')
  p1.kill(); console.log('ok: ohne --steuerung keine Schnittstelle')
  // 2. mit Steuerung
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-an-'))
  const p2 = start(d2, true)
  const datei = path.join(d2, 'steuerung.json')
  for (let i = 0; i < 60 && !fs.existsSync(datei); i++) await schlaf(500)
  const z = JSON.parse(fs.readFileSync(datei, 'utf8'))
  if (process.platform !== 'win32') assert.strictEqual(fs.statSync(datei).mode & 0o777, 0o600, 'steuerung.json nur für den Benutzer')
  await schlaf(2500)
  // falscher Schlüssel
  assert.strictEqual((await anfrage({ ...z, schluessel: 'falsch' }, '/zustand')).code, 401)
  let s = await anfrage(z, '/zustand')
  assert.ok(s.version && s.sprache, 'Zustand mit Version und Sprache')
  assert.ok((await befehl(z, 'sprache', { wert: 'en' })).ok)
  let r = await befehl(z, 'vorbereiten', { gruppe: 'L', lua: 'electric', name: 'Steuerung Test' })
  assert.ok(r.ok, JSON.stringify(r))
  s = await anfrage(z, '/zustand')
  assert.strictEqual(s.offen.lua, 'electric'); assert.ok(s.plaetze.length > 0, 'Vorlage «Original» als Start')
  // «auch bei Motor aus» (ersetzt den Selbsttest motoraus)
  r = await befehl(z, 'grenze', { wert: 'lua:strom', beiMotorAus: false })
  assert.strictEqual(r['lua:strom'].beiMotorAus, false)
  await befehl(z, 'reiter', { name: 'grenzen' })
  s = await anfrage(z, '/zustand')
  assert.ok(s.warnungen.some((w) => /motor switch|Motorschalter/.test(w)), 'Warnband «auch bei Motor aus»')
  // Felder im Kästchen-Editor mit fester Kennung (Bedienhilfen, Automatisierung)
  r = await befehl(z, 'waehle', { index: 0 })
  assert.ok(r.felder.some((f) => f.id === 'eig-wert') && r.felder.some((f) => f.id === 'eig-darstellung'), JSON.stringify(r.felder.map((f) => f.id)))
  console.log('Felder:', r.felder.map((f) => f.id).join(' '))
  // Rückgängig / Wiederholen (0.13.0): Verschieben -> Rückgängig -> Wiederholen, Vorlage -> Rückgängig
  await befehl(z, 'reiter', { name: 'anordnung' })
  s = await anfrage(z, '/zustand')
  const x0 = s.plaetze[0].x, vorVorlage = JSON.stringify(s.plaetze)
  r = await befehl(z, 'platz', { index: 0, x: x0 + 7 })
  assert.ok(r.ok, JSON.stringify(r))
  r = await befehl(z, 'rueckgaengig')
  assert.strictEqual(r.plaetze[0].x, x0, 'Rückgängig: alte Lage'); assert.ok(/moved|verschoben|changed|geändert/.test(r.wiederholen), r.wiederholen)
  r = await befehl(z, 'wiederholen')
  assert.strictEqual(r.plaetze[0].x, x0 + 7, 'Wiederholen: neue Lage')
  r = await befehl(z, 'rueckgaengig')
  assert.strictEqual(JSON.stringify(r.plaetze), vorVorlage)
  await befehl(z, 'vorlage', { s: 'original' }); await befehl(z, 'anordnen', { art: 'raster' })
  r = await befehl(z, 'rueckgaengig'); r = await befehl(z, 'rueckgaengig')
  assert.strictEqual(JSON.stringify(r.plaetze), vorVorlage, 'Vorlage und Anordnen rückgängig')
  console.log('Verlauf ok')
  // Anordnen und Vorschau als Daten
  r = await befehl(z, 'anordnen', { art: 'gleich' })
  assert.ok(r.ok, JSON.stringify(r))
  const v = await anfrage(z, '/vorschau')
  assert.ok(v.ok && v.plaetze.length && Array.isArray(v.probleme) && Array.isArray(v.reserviert))
  // Als Datei speichern ohne Dialog, mit Bild des Hinweises
  const ziel = path.join(ausgabe, 'Steuerung_Test.electric.lua')
  r = await befehl(z, 'speichernDatei', { pfad: ziel })
  assert.ok(fs.existsSync(ziel) && /^\s*return\s*\{/.test(fs.readFileSync(ziel, 'utf8')), 'Datei geschrieben')
  assert.ok(r.schritte.some((x) => /widget menu|Widget-Menü/.test(x.text)), 'kurzer Hinweis für neue Luas')
  assert.ok(r.kennung && r.kennung !== 'Standard', 'eigene Kennung')
  await befehl(z, 'bild', { pfad: path.join(ausgabe, 'Hinweis nach Save as file.png') })
  // Für alle Modelle (0.14.0): Datei Standard.<lua>.lua, Hinweis sichtbar; danach wieder «Nur dieses Modell»
  const zielStd = path.join(ausgabe, 'Standard.electric.lua')
  r = await befehl(z, 'speichernDatei', { pfad: zielStd, fuerAlle: true })
  assert.strictEqual(r.kennung, 'Standard'); assert.ok(/Standard\.electric\.lua/.test(r.hinweis), r.hinweis)
  assert.ok(fs.existsSync(zielStd), 'Standard-Datei geschrieben')
  r = await befehl(z, 'speichernDatei', { pfad: ziel, fuerAlle: false })
  assert.notStrictEqual(r.kennung, 'Standard')
  console.log('Standard ok')
  const pr = await anfrage(z, '/protokoll?ab=0')
  assert.ok(pr.zeilen.some((l) => /steuerung/.test(l)), 'Protokoll lesbar')
  // MCP-Server (tools/mcp) gegen die laufende App
  const mcp = spawn(process.execPath, [path.join(wurzel, 'tools', 'mcp', 'lua-studio-mcp.js')], { env: { ...process.env, LUA_STUDIO_DATEN: d2 } })
  let mcpAus = ''
  mcp.stdout.on('data', (c) => { mcpAus += c })
  mcp.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lua_studio_state","arguments":{}}}\n')
  for (let i = 0; i < 20 && !mcpAus.includes('"id":2'); i++) await schlaf(250)
  mcp.kill()
  assert.ok(/Steuerung Test|Steuerung_Test/.test(mcpAus), 'MCP liefert den Zustand')
  console.log('ok: MCP-Server lua_studio_state')
  p2.kill()
  await schlaf(1500)
  console.log('ok: Steuerung – Zustand, Vorbereiten, Grenze, Anordnen, Vorschau, Datei speichern, Protokoll; Ausgabe', ausgabe)
})().catch((e) => { console.error('FEHLER', e); process.exit(1) })
