#!/usr/bin/env node
'use strict'
// MCP server (stdio) for the Lua-Studio control interface. No dependencies.
// Lua-Studio must run with --steuerung (or LUA_STUDIO_STEUERUNG=1). Port and key are read from steuerung.json in the
// Lua-Studio data folder (LUA_STUDIO_DATEN overrides it). Tools: lua_studio_state, lua_studio_do, lua_studio_preview, lua_studio_log.
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')

function datenOrdner() {
  if (process.env.LUA_STUDIO_DATEN) return process.env.LUA_STUDIO_DATEN
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Lua-Studio')
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Lua-Studio')
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'Lua-Studio')
}
function zugang() {
  const f = path.join(datenOrdner(), 'steuerung.json')
  if (!fs.existsSync(f)) throw new Error(`Lua-Studio control interface not running (no ${f}). Start Lua-Studio with --steuerung.`)
  const z = JSON.parse(fs.readFileSync(f, 'utf8'))
  try { process.kill(z.pid, 0) } catch (e) { if (e.code === 'ESRCH') throw new Error(`Stale ${f}: Lua-Studio (pid ${z.pid}) is no longer running. Start Lua-Studio with --steuerung again.`) }
  return z
}
function anfrage(weg, body) {
  const z = zugang()
  return new Promise((ok, nein) => {
    const d = body ? JSON.stringify(body) : ''
    const r = http.request({ host: '127.0.0.1', port: z.port, path: weg, method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${z.schluessel}`, 'Content-Type': 'application/json' } }, (res) => {
      let t = ''; res.on('data', (c) => { t += c }); res.on('end', () => { try { ok(JSON.parse(t)) } catch (e) { nein(e) } })
    })
    r.on('error', nein); r.end(d)
  })
}

const WERKZEUGE = [
  { name: 'lua_studio_state', description: 'Current state of Lua-Studio as JSON: version, language, connection, source, models, open model, tab, view, boxes, warnings, size guard, limits, targets.', inputSchema: { type: 'object', properties: {} } },
  { name: 'lua_studio_do', description: 'Run a command through the same functions as the user interface. Commands: anschluesseSuchen, verbinden {ziel}, trennen, sprache {wert}, reiter {name}, quelle {index|text}, modelleLaden, modellOeffnen {kennung, lua}, vorbereiten {gruppe, lua, name}, ansicht {index|breite,hoehe}, vorlage {s}, anordnen {art, abstand}, platzNeu, platzWeg {index}, platz {index, ...fields}, grenze {wert, ...fields}, ordner {pfad} (export target, like «Choose folder»), uebertragen, speichernDatei {pfad}, schnelltest, supportZip {pfad}, bild {pfad, element}. Confirmations are answered with yes.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, args: { type: 'object' } }, required: ['name'] } },
  { name: 'lua_studio_preview', description: 'Preview of the current view as data (boxes, problems such as overlaps or boxes too small, reserved areas). Set png true (optionally pfad) to also get a PNG.', inputSchema: { type: 'object', properties: { png: { type: 'boolean' }, pfad: { type: 'string' } } } },
  { name: 'lua_studio_log', description: 'Error log lines from line number ab (0 = all); returns the next line number.', inputSchema: { type: 'object', properties: { ab: { type: 'number' } } } },
]

async function aufruf(name, a = {}) {
  if (name === 'lua_studio_state') return anfrage('/zustand')
  if (name === 'lua_studio_do') return anfrage('/befehl', { name: a.name, args: a.args || {} })
  if (name === 'lua_studio_preview') return anfrage('/vorschau', { png: !!a.png, pfad: a.pfad })
  if (name === 'lua_studio_log') return anfrage('/protokoll', { ab: a.ab || 0 })
  throw new Error(`unknown tool ${name}`)
}

let puffer = ''
const senden = (o) => process.stdout.write(JSON.stringify(o) + '\n')
process.stdin.on('data', async (c) => {
  puffer += c
  let i
  while ((i = puffer.indexOf('\n')) >= 0) {
    const zeile = puffer.slice(0, i).trim(); puffer = puffer.slice(i + 1)
    if (!zeile) continue
    let m; try { m = JSON.parse(zeile) } catch { continue }
    if (m.id === undefined) continue // notification
    try {
      if (m.method === 'initialize') senden({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: (m.params && m.params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'lua-studio', version: '1.0.0' } } })
      else if (m.method === 'tools/list') senden({ jsonrpc: '2.0', id: m.id, result: { tools: WERKZEUGE } })
      else if (m.method === 'tools/call') {
        const r = await aufruf(m.params.name, m.params.arguments || {})
        const inhalt = [{ type: 'text', text: JSON.stringify({ ...r, pngBase64: undefined }, null, 1) }]
        if (r && r.pngBase64) inhalt.push({ type: 'image', data: r.pngBase64, mimeType: 'image/png' })
        senden({ jsonrpc: '2.0', id: m.id, result: { content: inhalt } })
      } else if (m.method === 'ping') senden({ jsonrpc: '2.0', id: m.id, result: {} })
      else senden({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'method not found' } })
    } catch (e) { senden({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: String(e && e.message || e) }], isError: true } }) }
  }
})
