'use strict'
// Ablauftest «Funke live» ohne echte Funke: startet einen eigenen Ethos-Simulator (Plugin «ethos», run_wasm.js)
// und spricht ihn über den Test-Kanal mit dem vollen Fernsteuerprotokoll an.
// Aufruf: node test/simulator-ablauf.js [--port 8981] [--bilder <ordner>] [--offen]
//   --offen: Simulator nach dem Test laufen lassen (zum Ausprobieren der Oberfläche), sonst wird er beendet.

const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')
const { Funke } = require('../src/geraet/funke')
const { simulatorOeffnen } = require('../src/geraet/kanal-simulator')
const { zuRgba } = require('../src/geraet/bild')

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const PORT = Number(arg('--port', 8981))
const BILDER = arg('--bilder', path.join(__dirname, 'ausgabe'))
const OFFEN = process.argv.includes('--offen')
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms))
let befunde = 0
function pluginBasis() {
  // Ordner des «ethos-tools plugin» (enthält Versionsordner mit radio_remote.py bzw. run_wasm.js), über ETHOS_TOOLS_DIR
  const basis = process.env.ETHOS_TOOLS_DIR || ''
  if (!basis) console.log('Hinweis: ETHOS_TOOLS_DIR nicht gesetzt (Ordner des ethos-tools plugin) – Abgleich übersprungen')
  return basis
}
function pruefe(bedingung, text) { console.log(`${bedingung ? 'ok    ' : 'FEHLER'} ${text}`); if (!bedingung) befunde++ }

function runWasm() {
  const basis = pluginBasis()
  if (!basis) return null
  const v = fs.readdirSync(basis).filter((n) => fs.existsSync(path.join(basis, n, 'run_wasm.js'))).sort()
  if (!v.length) throw new Error('run_wasm.js nicht gefunden (Plugin «ethos»)')
  return path.join(basis, v[v.length - 1], 'run_wasm.js')
}

function get(befehl, werte = {}, zeit = 60000) {
  const qs = new URLSearchParams(werte).toString()
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: `/${befehl}${qs ? '?' + qs : ''}`, timeout: zeit }, (res) => {
      const t = []; res.on('data', (c) => t.push(c)); res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(t))) } catch (e) { reject(e) } })
    })
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Zeit')))
  })
}
async function laeuft() { try { await get('status', {}, 1500); return true } catch { return false } }

// Einfaches PNG aus RGBA (für die Kontrollbilder)
function pngSchreiben(datei, breite, hoehe, rgba) {
  const zlib = require('zlib')
  const crcTab = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = crcTab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }
  const stueck = (typ, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(typ), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
  const roh = Buffer.alloc(hoehe * (breite * 4 + 1))
  for (let y = 0; y < hoehe; y++) rgba.copy(roh, y * (breite * 4 + 1) + 1, y * breite * 4, (y + 1) * breite * 4)
  const kopf = Buffer.alloc(13); kopf.writeUInt32BE(breite); kopf.writeUInt32BE(hoehe, 4); kopf[8] = 8; kopf[9] = 6
  fs.writeFileSync(datei, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), stueck('IHDR', kopf), stueck('IDAT', zlib.deflateSync(roh)), stueck('IEND', Buffer.alloc(0))]))
}

async function main() {
  if (await laeuft()) throw new Error(`Port ${PORT} ist belegt (anderer Simulator?). Nie fremde Simulatoren benutzen.`)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lua-studio-root-'))
  // Neutrales leeres Modell aus dem Skill ethos-lua, falls vorhanden
  // leeres Modell (JSON) für den Simulator, über ETHOS_LEERES_MODELL
  const leerDatei = process.env.ETHOS_LEERES_MODELL || ''
  if (fs.existsSync(leerDatei)) {
    const leer = JSON.parse(fs.readFileSync(leerDatei, 'utf8'))
    for (const p in leer) {
      const z = path.join(root, p.replace(/^\/persist\/[^/]+\//, ''))
      fs.mkdirSync(path.dirname(z), { recursive: true }); fs.writeFileSync(z, Buffer.from(leer[p], 'base64'))
    }
  }
  fs.mkdirSync(BILDER, { recursive: true })
  console.log(`Simulator X18RS-EU 26.2.0 auf Port ${PORT}, Speicher ${root}`)
  const kind = spawn(process.execPath, [runWasm(), '--radio', 'X18RS-EU', '--release', '26.2.0', '--serve', '--port', String(PORT), '--root-directory', root, '--shots-dir', path.join(root, '..', path.basename(root) + '-bilder')], { stdio: OFFEN ? 'ignore' : ['ignore', 'pipe', 'pipe'], detached: OFFEN })
  // Mit --offen keine Pipes: sonst stirbt der Simulator beim ersten Schreiben, sobald dieses Skript beendet ist
  let aus = ''; if (!OFFEN) { kind.stdout.on('data', (d) => { aus += d }); kind.stderr.on('data', (d) => { aus += d }) }
  for (let i = 0; i < 480 && !(await laeuft()); i++) { if (kind.exitCode !== null) throw new Error('Simulator nicht gestartet:\n' + aus.slice(-1500)); await schlaf(250) }
  await get('wait', { ms: 1500 })

  try {
    const kanal = await simulatorOeffnen(PORT, { freigabeMs: 500 })
    const f = new Funke(kanal)
    const logZeilen = []
    f.on('log', (z) => logZeilen.push(z))
    let freigabe = false
    f.on('warteAufFreigabe', () => { freigabe = true })
    const h = await f.verbinden(10000)
    pruefe(h.protokoll === 11 && /X18/i.test(h.board), `HELLO: Protokoll ${h.protokoll}, ${h.board}, Ethos ${h.firmware}`)
    pruefe(freigabe, 'Wartet auf die Freigabe am Sender und geht danach weiter')

    let r = await f.bildschirm()
    pruefe(r.status === 0 && r.bild.breite === 800 && r.bild.hoehe === 480, `Ganzes Bild ${r.bild && r.bild.breite}×${r.bild && r.bild.hoehe}, ${r.bild && r.bild.geaendert} Kacheln`)
    pngSchreiben(path.join(BILDER, '1 Start.png'), r.bild.breite, r.bild.hoehe, zuRgba(r.bild))
    r = await f.bildschirm()
    pruefe(r.status === 0 && r.bild.geaendert === 0 && !r.neu, 'Zweites Bild ohne Änderung: 0 Kacheln')

    // Warnung der Checkliste mit «OK» schliessen (Tippen), dann Modellmenü
    pruefe(await f.tippen(707, 390, 20) === 0, 'Tippen auf OK der Checkliste')
    r = await f.bildschirm()
    pruefe(r.status === 0 && r.bild.geaendert > 50, `Nach OK: ${r.bild.geaendert} geänderte Kacheln`)
    pruefe(await f.taste('MDL') === 0, 'Taste MDL')
    r = await f.bildschirm()
    pruefe(r.status === 0 && r.neu && r.bild.geaendert > 0, `Nach MDL: ${r.bild.geaendert} geänderte Kacheln`)
    pngSchreiben(path.join(BILDER, '2 nach MDL.png'), 800, 480, zuRgba(r.bild))

    pruefe(await f.drehen(2) === 0, 'Drehrad +2')
    r = await f.bildschirm()
    pngSchreiben(path.join(BILDER, '3 nach Drehrad.png'), 800, 480, zuRgba(r.bild))
    pruefe(r.neu, `Nach Drehrad: ${r.bild.geaendert} geänderte Kacheln`)

    pruefe(await f.taste('RTN') === 0, 'Taste RTN')
    pruefe(await f.wischen(600, 240, 200, 240) === 0, 'Wischen')
    pruefe(await f.taste('XYZ') === -3, 'Unbekannte Taste wird abgelehnt (-3)')
    pruefe(await f.lichtAn() === 0, 'Licht an')

    // Log: Zeile per Makro im Simulator erzeugen
    await get('startMacro', { code: 'print("lua-studio-logtest")' })
    for (let i = 0; i < 30 && !logZeilen.some((z) => z.includes('lua-studio-logtest')); i++) await schlaf(100)
    pruefe(logZeilen.some((z) => z.includes('lua-studio-logtest')), 'Lua-Log kommt als Ereignis an')

    // Takt: Bilder pro Sekunde ohne Änderung (nur der Protokollweg, Simulator wartet je Bild kurz)
    const t0 = Date.now(); let n = 0
    while (Date.now() - t0 < 3000) { await f.bildschirm(); n++ }
    console.log(`Info   ${(n / 3).toFixed(1)} Bilder/s über den Test-Kanal (am Simulator, nicht die echte Funke)`)
    f.trennen()
    pruefe(f.getrennt, 'Trennen')
  } finally {
    if (OFFEN) {
      kind.unref()
      console.log(`Simulator läuft weiter auf Port ${PORT} (PID ${kind.pid}). Beenden: curl http://127.0.0.1:${PORT}/quit`)
    } else {
      try { await get('quit', {}, 3000) } catch { /* beendet sich */ }
      for (let i = 0; i < 20 && await laeuft(); i++) await schlaf(200)
      if (kind.exitCode === null) kind.kill()
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
  console.log(befunde ? `ERGEBNIS: ${befunde} Fehler` : 'ERGEBNIS: kein Fehler')
  process.exit(befunde ? 1 : 0)
}

main().catch((e) => { console.error('ABBRUCH:', e.message); process.exit(2) })
