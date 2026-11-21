'use strict'
// Ziel für Studio-Dateien: verbundene Funke (Serial oder Simulator-Test), SD-Laufwerk der Funke oder ein Ordner (Export).
// Alle Ziele bieten dieselben Funktionen auf dem Ordner «scripts/studio»:
//   liste() -> [{ name, groesse }], lesen(name) -> Buffer|null, schreiben(name, Buffer), loeschen(name), modellLaden(pfad)

const fs = require('fs')
const path = require('path')

// Mögliche Studio-Ordner auf der Funke (SD-Karte, interner Speicher)
const KANDIDATEN = ['SD:/scripts/studio', '/scripts/studio', 'RADIO:/scripts/studio']

function funkenZiel(funke, lua) {
  let basis = null
  const diag = []   // für das Fehlerprotokoll: welche Ordner durchsucht wurden und was die Funke lieferte
  // Der Studio-Ordner liegt neben dem Ordner des Luas: SD:/scripts, wenn das Lua dort liegt, sonst /scripts
  async function ordner() {
    if (basis) return basis
    // 1. Der Ordner, in dem das Lua schon seine Info-Datei geschrieben hat (das Lua schreibt nach SCRIPTS:/studio, also an den
    //    Skript-Speicherort der Funke: SD-Karte oder interner Speicher, z. B. X20 Pro AW). Fehlerhafte Pfade überspringen.
    const gefunden = {}   // Kandidat -> Anzahl Studio-/Info-Dateien (für Schritt 3)
    for (const o of KANDIDATEN) {
      let r = null
      try { r = await funke.dateien(o) } catch (e) { r = null; diag.push(`${o}: Fehler ${e && e.message}`) }
      if (r) diag.push(`${o}: Status ${r.status}, ${r.status === 0 ? r.liste.length : 0} Einträge${r.status === 0 ? ', Info: ' + (r.liste.filter((e) => !e.ordner && e.name.endsWith('.info.json')).map((e) => e.name).join(' ') || '-') : ''}`)
      if (r && r.status === 0 && r.liste.some((e) => !e.ordner && e.name.endsWith(`.${lua}.info.json`))) { basis = o; return basis }
      if (r && r.status === 0) gefunden[o] = r.liste.filter((e) => !e.ordner && /\.(info\.json|lua)$/.test(e.name)).length
    }
    // 2. sonst neben dem Ordner des Luas
    const hatLua = async (o) => { try { const r = await funke.dateien(o); return r.status === 0 && r.liste.some((e) => e.ordner && e.name === lua) } catch { return false } }
    const sdLua = await hatLua('SD:/scripts')
    diag.push(`SD:/scripts: Lua-Ordner ${lua} ${sdLua ? 'da' : 'fehlt'}`)
    if (sdLua) { basis = 'SD:/scripts/studio'; return basis }
    if (await hatLua('/scripts')) { diag.push(`/scripts: Lua-Ordner ${lua} da`); basis = '/scripts/studio'; return basis }
    // 3. kein Lua-Ordner gefunden: der erste Ordner, in dem schon Studio- oder Info-Dateien liegen (Befund Windows-Test 22.11.)
    const voll = KANDIDATEN.find((o) => gefunden[o] > 0)
    basis = voll || '/scripts/studio'
    return basis
  }
  // Ordner nur zum Schreiben anlegen, nie beim Lesen
  async function ordnerSicher() {
    const o = await ordner()
    if ((await funke.dateien(o)).status !== 0) {
      const s = await funke.ordnerAnlegen(o)
      if (s !== 0) throw new Error(`ordnerAnlegen|${o}`)
    }
    return o
  }
  return {
    art: 'funke',
    beschreibung: () => basis || 'Funke',
    basis: async () => ordner(),
    diagnose: () => diag.slice(),
    async liste() {
      const o = await ordner()
      const r = await funke.dateien(o)
      if (r.status) return [] // Ordner fehlt: noch keine Studio-Dateien
      return r.liste.filter((e) => !e.ordner).map((e) => ({ name: e.name, groesse: e.groesse }))
    },
    // null nur, wenn die Datei nachweislich fehlt; sonst Fehler (dann wird nichts ersetzt)
    async lesen(name) {
      const r = await funke.lesen(`${await ordner()}/${name}`)
      if (r.status === 0) return r.daten
      const da = (await this.liste()).some((e) => e.name === name)
      if (da) throw new Error(`lesen|s${r.status}`)
      return null
    },
    async schreiben(name, daten) {
      const o = await ordnerSicher()
      // Vorher löschen: Ob die Funke beim Schreiben ab Position 0 eine längere alte Datei kürzt, ist nicht belegt
      // (die alte Datei ist zu diesem Zeitpunkt am PC gesichert)
      await funke.loeschen(`${o}/${name}`)
      const s = await funke.schreiben(`${o}/${name}`, daten)
      if (s) throw new Error(`schreiben|s${s}`)
    },
    async loeschen(name) { await funke.loeschen(`${await ordner()}/${name}`) },
    async modellLaden(pfad) { return pfad ? funke.modellLaden(pfad) : -1 },
    // Symbol-Dateien im Unterordner «symbole» (Format 2 §4)
    async symbolListe() {
      const r = await funke.dateien(`${await ordner()}/symbole`)
      if (r.status) return []
      return r.liste.filter((e) => !e.ordner).map((e) => ({ name: e.name, groesse: e.groesse }))
    },
    async symbolLesen(name) {
      const r = await funke.lesen(`${await ordner()}/symbole/${name}`)
      return r.status === 0 ? r.daten : null
    },
    async symbolSchreiben(name, daten) {
      const o = `${await ordnerSicher()}/symbole`
      if ((await funke.dateien(o)).status !== 0) {
        const s = await funke.ordnerAnlegen(o)
        if (s !== 0) throw new Error(`ordnerAnlegen|${o}`)
      }
      await funke.loeschen(`${o}/${name}`)
      const s = await funke.schreiben(`${o}/${name}`, daten)
      if (s) throw new Error(`schreiben|s${s}`)
    },
    async symbolLoeschen(name) { await funke.loeschen(`${await ordner()}/symbole/${name}`) },
  }
}

// SD-Laufwerk (USB-Speicher) oder Export-Ordner. Beim Laufwerk liegt der Ordner unter <wurzel>/scripts/studio.
function ordnerZiel(art, wurzel) {
  const o = art === 'laufwerk' ? path.join(wurzel, 'scripts', 'studio') : wurzel
  return {
    art,
    beschreibung: () => o,
    async liste() {
      if (!fs.existsSync(o)) return []
      return fs.readdirSync(o, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => ({ name: e.name, groesse: fs.statSync(path.join(o, e.name)).size }))
    },
    async lesen(name) { const p = path.join(o, name); return fs.existsSync(p) ? fs.readFileSync(p) : null },
    async schreiben(name, daten) { fs.mkdirSync(o, { recursive: true }); fs.writeFileSync(path.join(o, name), daten) },
    async loeschen(name) { const p = path.join(o, name); if (fs.existsSync(p)) fs.rmSync(p) },
    async modellLaden() { return -1 },
    async symbolListe() {
      const so = path.join(o, 'symbole')
      if (!fs.existsSync(so)) return []
      return fs.readdirSync(so, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => ({ name: e.name, groesse: fs.statSync(path.join(so, e.name)).size }))
    },
    async symbolLesen(name) { const p = path.join(o, 'symbole', name); return fs.existsSync(p) ? fs.readFileSync(p) : null },
    async symbolSchreiben(name, daten) { fs.mkdirSync(path.join(o, 'symbole'), { recursive: true }); fs.writeFileSync(path.join(o, 'symbole', name), daten) },
    async symbolLoeschen(name) { const p = path.join(o, 'symbole', name); if (fs.existsSync(p)) fs.rmSync(p) },
  }
}

// Ethos-Laufwerke suchen (macOS /Volumes, Windows Laufwerksbuchstaben): Ordner mit «scripts» und «models» oder «audio»
function laufwerkeSuchen() {
  const kandidaten = []
  if (process.platform === 'darwin') {
    for (const n of fs.existsSync('/Volumes') ? fs.readdirSync('/Volumes') : []) kandidaten.push(path.join('/Volumes', n))
  } else if (process.platform === 'win32') {
    for (let c = 67; c <= 90; c++) kandidaten.push(`${String.fromCharCode(c)}:\\`)
  }
  return kandidaten.filter((p) => {
    try { return fs.existsSync(path.join(p, 'scripts')) && ['models', 'audio', 'bitmaps', 'logs', 'screenshots', 'firmware'].some((o) => fs.existsSync(path.join(p, o))) } catch { return false }
  })
}

module.exports = { funkenZiel, ordnerZiel, laufwerkeSuchen }
