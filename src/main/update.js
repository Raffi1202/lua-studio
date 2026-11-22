'use strict'
// Hinweis auf eine neue Version (ab 0.13.0): fragt einmal die öffentliche GitHub-API nach den Releases von Lua-Studio
// (Pre-releases eingeschlossen). Gesendet wird nur die normale Anfrage, keine persönlichen Daten. Kein Download, keine Installation.

const QUELLE = 'https://api.github.com/repos/Raffi1202/lua-studio/releases?per_page=10'

// «0.12.0» -> [0, 12, 0]; Zusätze nach «-» werden ignoriert
function teile(v) { return String(v || '').replace(/^v/, '').split('-')[0].split('.').map((x) => parseInt(x, 10) || 0) }
function neuer(a, b) {   // ist a neuer als b?
  const x = teile(a), y = teile(b)
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0)
  return false
}

// Neueste Version aus der Release-Liste (ohne Entwürfe)
function neueste(liste) {
  let best = null
  for (const r of Array.isArray(liste) ? liste : []) {
    if (!r || r.draft || !/^v?\d+\.\d+\.\d+/.test(String(r.tag_name))) continue
    if (!best || neuer(r.tag_name, best.tag_name)) best = r
  }
  return best && { version: String(best.tag_name).replace(/^v/, ''), url: String(best.html_url || '') }
}

// Ergebnis: { neu: true, version, url } oder { neu: false }; ohne Internet oder bei Fehler { neu: false, fehler }
async function pruefen(aktuell, holen = fetch) {
  try {
    const ac = new AbortController(); const zeit = setTimeout(() => ac.abort(), 8000)
    const r = await holen(QUELLE, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Lua-Studio' }, signal: ac.signal })
    clearTimeout(zeit)
    if (!r.ok) return { neu: false, fehler: `http ${r.status}` }
    const n = neueste(await r.json())
    if (!n || !n.url.startsWith('https://github.com/')) return { neu: false }
    return neuer(n.version, aktuell) ? { neu: true, version: n.version, url: n.url } : { neu: false }
  } catch (e) {
    return { neu: false, fehler: String(e && e.message || e) }
  }
}

module.exports = { pruefen, neuer, neueste, QUELLE }
