'use strict'
// Steuerschnittstelle für Tests und Automatisierung (ab 0.10.0). Standardmässig AUS; nur mit Startparameter --steuerung oder
// LUA_STUDIO_STEUERUNG=1. Erreichbar nur über 127.0.0.1 auf einem zufälligen Port, jede Anfrage braucht den Zufallsschlüssel
// dieses Starts (Kopf «Authorization: Bearer <Schlüssel>»). Port und Schlüssel stehen in <App-Daten>/steuerung.json
// (nur für den eigenen Benutzer lesbar, wird beim Beenden gelöscht).
// Die Befehle laufen über dieselben Funktionen wie die Oberfläche (window.__steuerung in src/oberflaeche/steuerung.js).

const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

function aktiv(argv = process.argv, env = process.env) {
  return argv.includes('--steuerung') || env.LUA_STUDIO_STEUERUNG === '1'
}

// d: { ordner, fenster(), P (Fehlerprotokoll), version, supportZip(pfad) }
function starten(d) {
  const schluessel = crypto.randomBytes(24).toString('hex')
  const datei = path.join(d.ordner, 'steuerung.json')
  const js = (code) => d.fenster().webContents.executeJavaScript(code)
  const brueckeAufruf = (name, args) => js(`window.__steuerung.${name}(${JSON.stringify(args === undefined ? null : args)})`)

  async function behandeln(weg, anfrage) {
    if (weg === '/zustand') return { ...(await brueckeAufruf('zustand')), version: d.version }
    if (weg === '/vorschau') {
      const v = await brueckeAufruf('vorschau')
      if (anfrage && anfrage.png) {
        const r = await js("JSON.stringify(document.getElementById('flaeche').getBoundingClientRect())").then(JSON.parse)
        const bild = await d.fenster().webContents.capturePage({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) })
        if (anfrage.pfad) { fs.writeFileSync(anfrage.pfad, bild.toPNG()); v.png = anfrage.pfad } else v.pngBase64 = bild.toPNG().toString('base64')
      }
      return v
    }
    if (weg === '/protokoll') {
      const zeilen = d.P.lesen().split('\n')
      const ab = Math.max(0, Number((anfrage && anfrage.ab) || 0))
      return { zeilen: zeilen.slice(ab), naechste: zeilen.length }
    }
    if (weg === '/befehl') {
      const name = String((anfrage && anfrage.name) || '')
      const args = (anfrage && anfrage.args) || {}
      d.P.info('steuerung', `Befehl ${name}`)
      // Befehle des Hauptprozesses (Pfade ohne Dialog)
      if (name === 'supportZip') { if (!args.pfad) return { ok: false, fehler: 'pfad' }; return d.supportZip(String(args.pfad)) }
      if (name === 'bild') {   // Bild des Fensters bzw. eines Elements (nur auf ausdrücklichen Befehl)
        if (!args.pfad) return { ok: false, fehler: 'pfad' }
        const w = d.fenster().webContents
        let rect
        if (args.element) { const r = JSON.parse(await js(`JSON.stringify((document.getElementById(${JSON.stringify(String(args.element))}) || document.body).getBoundingClientRect())`)); rect = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } }
        const bild = await w.capturePage(rect)
        fs.writeFileSync(String(args.pfad), bild.toPNG()); return { ok: true, pfad: String(args.pfad) }
      }
      return brueckeAufruf('ausfuehren', { name, args })
    }
    return { ok: false, fehler: 'unbekannt' }
  }

  const server = http.createServer((req, res) => {
    const antwort = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)) }
    const kopf = String(req.headers.authorization || '')
    const soll = `Bearer ${schluessel}`
    if (kopf.length !== soll.length || !crypto.timingSafeEqual(Buffer.from(kopf), Buffer.from(soll))) return antwort(401, { ok: false, fehler: 'schluessel' })
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', async () => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1')
        const anfrage = body ? JSON.parse(body) : Object.fromEntries(u.searchParams)
        antwort(200, await behandeln(u.pathname, anfrage))
      } catch (e) { d.P.fehler('steuerung', e); antwort(500, { ok: false, fehler: String(e && e.message || e) }) }
    })
  })
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    fs.mkdirSync(d.ordner, { recursive: true })
    fs.writeFileSync(datei, JSON.stringify({ port, schluessel, pid: process.pid }), { mode: 0o600 })
    try { fs.chmodSync(datei, 0o600) } catch { /* Windows: Benutzerordner genügt */ }
    console.log(`Lua-Studio Steuerung: http://127.0.0.1:${port} (Schlüssel in ${datei})`)
    d.P.info('steuerung', `aktiv auf 127.0.0.1:${port} (Schlüssel in steuerung.json im App-Datenordner)`)
  })
  // alte Datei eines abgestürzten Starts zuerst weg (sie wird gleich neu geschrieben)
  try { fs.unlinkSync(datei) } catch { /* keine */ }
  const aufraeumen = () => { try { fs.unlinkSync(datei) } catch { /* schon weg */ } try { server.close() } catch { /* zu */ } }
  // Beenden per Signal (kill, Ctrl+C): Datei löschen, dann normal beenden
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(sig, () => { aufraeumen(); process.exit(0) })
  return { aufraeumen, datei }
}

module.exports = { aktiv, starten }
