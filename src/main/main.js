'use strict'
// Hauptprozess von Lua-Studio: Fenster, Verbindung zur Funke, Bildschleife.

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { Funke, statusText } = require('../geraet/funke')
const { anschluesseSuchen, seriellOeffnen } = require('../geraet/kanal-seriell')
const { simulatorOeffnen } = require('../geraet/kanal-simulator')
const { zuRgba } = require('../geraet/bild')
const S = require('../studio/studio')
const F = require('../format/format')
const { funkenZiel, ordnerZiel, laufwerkeSuchen } = require('../studio/ziel')
const Y = require('../studio/symbole')
const AN = require('../studio/anordnen')
const VERSION = require('../../package.json').version
const { Fehlerprotokoll, zipBauen, zeit, ohnePersoenliches, anschlussKurz } = require('./fehlerprotokoll')
const { BEFEHL } = require('../geraet/rahmen')

// Nur für Tests: eigener Datenordner, damit Selbsttests nichts in der echten Ablage anlegen (vor dem Protokoll setzen)
if (process.env.LUA_STUDIO_DATEN) app.setPath('userData', process.env.LUA_STUDIO_DATEN)

// ---------- Fehlerprotokoll (ab 0.3.3): Kopf je Start, Ereignisse, jeder Fehler mit Stack ----------
const P = new Fehlerprotokoll({ ordner: path.join(app.getPath('userData'), 'Protokoll') })
const BEFEHL_NAME = Object.fromEntries(Object.entries(BEFEHL).map(([k, v]) => [v, k]))
function kopfZeilen() {
  return [
    `Lua-Studio ${VERSION}${app.isPackaged ? '' : ' (Entwicklung)'}, Protokollstufe ${P.stufe}`,
    `System ${os.platform()} ${os.release()} ${os.arch()}${os.platform() === 'darwin' ? ` (macOS ${process.getSystemVersion ? process.getSystemVersion() : '?'})` : ''}`,
    `Electron ${process.versions.electron}, Node ${process.versions.node}, Chrome ${process.versions.chrome}`,
    `Sprache System ${app.isReady() ? app.getLocale() : '?'}, Speicher ${Math.round(os.totalmem() / 1048576)} MB`,
  ]
}
let absturzGezeigt = false
process.on('uncaughtException', (e) => {
  P.fehler('absturz', e, 'uncaughtException')
  // Hinweis nur einmal je Start: showErrorBox hält den Hauptprozess an, ein wiederholter Fehler würde die App blockieren
  if (absturzGezeigt) return
  absturzGezeigt = true
  try { if (app.isReady()) dialog.showErrorBox('Lua-Studio', `${e && e.message || e}\n\nHilfe → Fehlerprotokoll / Help → Error log`) } catch { /* weiter */ }
})
process.on('unhandledRejection', (e) => P.fehler('absturz', e instanceof Error ? e : new Error(String(e)), 'unhandledRejection'))
// Jeder IPC-Aufruf: Fehler mit Stack, Fehlerantworten als Warnung, ausführlich auch Dauer
{
  const handle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = (kanal, fn) => handle(kanal, async (e, d) => {
    const start = Date.now()
    try {
      const r = await fn(e, d)
      if (r && r.ok === false && r.fehler && !r.protokolliert) P.warnung(kanal, `Antwort ${r.fehler}`)
      else if (!kanal.startsWith('protokoll:') && kanal !== 'eingabe') P.ausfuehrlich(kanal, `${Date.now() - start} ms`)
      return r
    } catch (err) { P.fehler(kanal, err); throw err }
  })
}

const SPRACHEN = {
  de: require('../sprachen/de.json'),
  en: require('../sprachen/en.json'),
}

let fenster = null
let funke = null
let schleifeAn = false
let verbindungsNummer = 0

function melden(kanal, daten) {
  if (fenster && !fenster.isDestroyed()) fenster.webContents.send(kanal, daten)
}

function fensterOeffnen() {
  fenster = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Lua-Studio',
    backgroundColor: '#14161a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  fenster.removeMenu()
  fenster.loadFile(path.join(__dirname, '..', 'oberflaeche', 'index.html'))
  fenster.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  fenster.on('closed', () => { fenster = null })
  const wc = fenster.webContents
  wc.on('render-process-gone', (_e, d) => P.fehler('oberflaeche', new Error(`Oberfläche beendet: ${d.reason} (Code ${d.exitCode})`)))
  wc.on('unresponsive', () => P.warnung('oberflaeche', 'reagiert nicht'))
  wc.on('responsive', () => P.info('oberflaeche', 'reagiert wieder'))
  wc.on('preload-error', (_e, p, err) => P.fehler('oberflaeche', err, 'preload'))
  wc.on('did-fail-load', (_e, code, text) => P.fehler('oberflaeche', new Error(`Laden fehlgeschlagen: ${text} (${code})`)))
}

// Bildschleife: holt laufend den Bildschirm (nur geänderte Kacheln) und schickt ihn an die Oberfläche.
async function bildSchleife(nummer) {
  schleifeAn = true
  let bilder = 0, seit = Date.now(), fehler = 0
  while (funke && nummer === verbindungsNummer && !funke.getrennt) {
    const start = Date.now()
    if (fenster && !fenster.isDestroyed() && !fenster.isMinimized()) {
      const r = await funke.bildschirm()
      if (nummer !== verbindungsNummer) break
      if (r.status === 0) {
        if (fehler >= 5) P.info('bild', 'Bild wieder da')
        fehler = 0
        bilder++
        if (r.neu) melden('bild', { breite: r.bild.breite, hoehe: r.bild.hoehe, rgba: zuRgba(r.bild) })
      } else if (++fehler >= 5) {
        if (fehler === 5) P.warnung('bild', `5 Bildabfragen nacheinander fehlgeschlagen (Status ${r.status})`)
        melden('status', { zustand: 'fehler', text: 'bildFehler', wert: `s${r.status}` })
        await warten(1000)
      }
    }
    const jetzt = Date.now()
    if (jetzt - seit >= 2000) {
      melden('takt', { bilderProSekunde: Math.round((bilder * 10000) / (jetzt - seit)) / 10 })
      bilder = 0; seit = jetzt
    }
    // Funke nicht überfordern: höchstens etwa 25 Abfragen pro Sekunde
    await warten(Math.max(0, 40 - (Date.now() - start)))
  }
  schleifeAn = false
}

// Letzte Log-Zeilen der Funke mit Zeitstempel (für den Funken-Schnelltest)
const logPuffer = []
function warten(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function trennen() {
  verbindungsNummer++
  if (funke) { const f = funke; funke = null; P.info('verbindung', 'getrennt (vom Benutzer)'); f.trennen() }
  while (schleifeAn) await warten(20)
}

async function verbinden(ziel) {
  await trennen()
  const nummer = verbindungsNummer
  const wohin = ziel.art === 'simulator' ? `Simulator Port ${ziel.port}` : `Anschluss ${anschlussKurz(ziel.pfad)}`
  P.info('verbindung', `verbinden: ${wohin}`)
  melden('status', { zustand: 'verbinde', text: 'verbinde' })
  let kanal
  try {
    kanal = ziel.art === 'simulator'
      ? await simulatorOeffnen(Number(ziel.port))
      : await seriellOeffnen(ziel.pfad)
  } catch (e) {
    P.fehler('verbindung', e, `öffnen ${wohin}`)
    if (nummer === verbindungsNummer) melden('status', { zustand: 'fehler', text: 'verbindenFehler', wert: e.message })
    return { ok: false }
  }
  // Inzwischen getrennt oder neu verbunden: diesen Kanal gleich wieder schliessen
  if (nummer !== verbindungsNummer) { try { kanal.schliessen() } catch { /* zu */ } return { ok: false } }
  const f = new Funke(kanal)
  funke = f
  f.on('log', (zeile) => {
    melden('log', zeile); logPuffer.push({ t: Date.now(), z: zeile }); if (logPuffer.length > 400) logPuffer.shift()
    // Log der Funke: Fehlerzeilen immer, alles andere nur ausführlich
    if (/error|fehler|traceback|attempt to|stack|not enough memory|max instructions|panic/i.test(zeile)) P.warnungGezaehlt('funke-log', zeile)
    else P.ausfuehrlich('funke-log', zeile)
  })
  f.on('befehl', (b) => {
    // Bildabfragen laufen 25-mal je Sekunde: nur Fehler; alles andere ausführlich, Daten gekürzt
    if (b.befehl === BEFEHL.SCREENSHOT) { if (b.status !== 0) P.ausfuehrlich('befehl', `SCREENSHOT -> Status ${b.status}, ${b.ms} ms`); return }
    const text = () => `${BEFEHL_NAME[b.befehl] || '0x' + b.befehl.toString(16)} ${b.laenge} B${b.vorschau ? ` «${b.vorschau}»` : ''} -> Status ${b.status}, ${b.antwort} B, ${b.ms} ms`
    // Keine Warnung: Datei/Ordner fehlt beim Lesen (normal) und RESET_INACTIVITY_TIMER vor der Freigabe am Sender (-2)
    const erwartet = b.befehl === BEFEHL.LIST_FILES || b.befehl === BEFEHL.READ_FILE || b.befehl === BEFEHL.RESET_INACTIVITY_TIMER
    if (b.status !== 0 && b.status !== undefined && !erwartet) P.warnung('befehl', text())
    else P.ausfuehrlich('befehl', text)
  })
  f.on('warteAufFreigabe', () => { P.info('verbindung', 'wartet auf Freigabe an der Funke'); melden('status', { zustand: 'freigabe', text: 'freigabe' }) })
  f.on('getrennt', (grund) => {
    if (grund !== 'getrennt') P.warnung('verbindung', `Verbindung verloren: ${grund}`)
    if (funke === f) { funke = null; verbindungsNummer++ }
    if (grund !== 'getrennt') melden('status', { zustand: 'fehler', text: 'getrenntFehler', wert: grund })
  })
  try {
    const hallo = await f.verbinden(120000)
    if (nummer !== verbindungsNummer) { f.trennen(); return { ok: false } }
    await f.lichtAn()
    P.info('verbindung', `verbunden: ${wohin}, ${JSON.stringify(hallo)}`)
    melden('status', { zustand: 'verbunden', text: 'verbunden', info: { ...hallo, art: ziel.art } })
    bildSchleife(nummer)
    return { ok: true, info: hallo }
  } catch (e) {
    const aktuell = nummer === verbindungsNummer
    if (funke === f) funke = null
    f.trennen()
    P.fehler('verbindung', e, wohin)
    if (aktuell) melden('status', { zustand: 'fehler', text: 'verbindenFehler', wert: e.message })
    return { ok: false }
  }
}

ipcMain.handle('texte', (_e, sprache) => SPRACHEN[sprache] || SPRACHEN.de)
ipcMain.handle('entwickler', () => !app.isPackaged || process.env.LUA_STUDIO_ENTWICKLER === '1')
ipcMain.handle('systemSprache', () => (app.getLocale() || 'de').slice(0, 2))
ipcMain.handle('anschluesse', async () => {
  try { return await anschluesseSuchen() } catch (e) { return [] }
})
ipcMain.handle('verbinden', (_e, ziel) => verbinden(ziel))
ipcMain.handle('trennen', async () => { await trennen(); melden('status', { zustand: 'getrennt', text: 'getrennt' }); return true })

ipcMain.handle('eingabe', async (_e, e) => {
  if (!funke || funke.getrennt) return { status: -2 }
  let status
  switch (e.art) {
    case 'taste': status = await funke.taste(e.name, e.ms); break
    case 'tippen': status = await funke.tippen(e.x, e.y, e.ms); break
    case 'wischen': status = await funke.wischen(e.x1, e.y1, e.x2, e.y2); break
    case 'drehen': status = await funke.drehen(e.schritte); break
    case 'text': status = await funke.text(e.text); break
    case 'licht': status = await funke.lichtAn(); break
    default: status = -3
  }
  return { status, text: statusText(status) }
})

ipcMain.handle('fotoSpeichern', async (_e, { pngBase64, vorschlag }) => {
  const ziel = await dialog.showSaveDialog(fenster, {
    defaultPath: path.join(app.getPath('pictures'), vorschlag),
    filters: [{ name: 'PNG', extensions: ['png'] }],
  })
  if (ziel.canceled || !ziel.filePath) return { ok: false }
  fs.writeFileSync(ziel.filePath, Buffer.from(pngBase64, 'base64'))
  return { ok: true, pfad: ziel.filePath }
})

// ---------- Studio (Etappe B): Modelle, Einstellungen, Übertragen ----------
let ablage = null
function studioAblage() {
  if (!ablage) {
    const wurzel = path.join(app.getPath('userData'), 'Studio')
    // einmal: Projekte und Vorlagen mit alten Lua-Namen auf die neuen umziehen (Umbenennung 21.11.2026)
    try { const u = S.ablageUmziehen(wurzel, Object.keys(beschreibungen())); if (u.length) P.info('ablage', `auf neue Lua-Namen umgezogen: ${u.join(', ')}`) } catch (e) { P.fehler('ablage', e) }
    ablage = new S.Ablage(wurzel)
  }
  return ablage
}

// Beschreibungen der Luas: mitgeliefert in src/luas; beim Entwickeln zusätzlich die Test-Beschreibung
function beschreibungen() {
  const b = S.beschreibungenLaden(path.join(__dirname, '..', 'luas'))
  if (!app.isPackaged || process.env.LUA_STUDIO_ENTWICKLER === '1') Object.assign(b, S.beschreibungenLaden(path.join(__dirname, '..', '..', 'test', 'vorlagen')), b)
  return b
}

const NAME = /^[A-Za-z0-9_]{1,40}$/
const erlaubteOrdner = new Set()
function namePruefen(...namen) { for (const n of namen) if (!NAME.test(String(n))) throw new Error('nameUngueltig') }

function zielAus(spec, lua) {
  if (lua !== undefined) namePruefen(lua)
  if (spec.art !== 'funke') {
    const p = spec.art === 'laufwerk' ? spec.wurzel : spec.pfad
    if (!erlaubteOrdner.has(p) && !laufwerkeSuchen().includes(p)) throw new Error('ordnerUnbekannt')
  }
  if (spec.art === 'funke') {
    if (!funke || funke.getrennt) throw new Error('keineVerbindung')
    return funkenZiel(funke, lua || 'studio')
  }
  if (spec.art === 'laufwerk') return ordnerZiel('laufwerk', spec.wurzel)
  return ordnerZiel('ordner', spec.pfad)
}

// Fehler an die Oberfläche; der Stack kommt ins Protokoll (Bereich = Aufrufer aus dem Stack)
function fehlerAntwort(e) { P.fehler('studio', e); return { ok: false, fehler: String(e && e.message || e), protokolliert: true } }

ipcMain.handle('studio:beschreibungen', () => beschreibungen())
ipcMain.handle('studio:ziele', () => ({ funke: !!(funke && !funke.getrennt), funkeName: funke && funke.hallo ? funke.hallo.board : null, laufwerke: laufwerkeSuchen() }))
// pfad: nur über die Steuerschnittstelle (statt Dialog), sonst wird er nicht beachtet
ipcMain.handle('studio:ordnerWaehlen', async (_e, pfad) => {
  P.info('ordner', 'Ordner wählen geöffnet')
  const r = steuerung && typeof pfad === 'string' && pfad ? { canceled: false, filePaths: [pfad] } : await dialog.showOpenDialog(fenster && !fenster.isDestroyed() ? fenster : undefined, { properties: ['openDirectory', 'createDirectory'] })
  P.info('ordner', r.canceled ? 'Ordner wählen abgebrochen' : `Ordner gewählt: ${r.filePaths[0]}`)
  if (r.canceled) return null
  erlaubteOrdner.add(r.filePaths[0])
  return r.filePaths[0]
})
// Notlösung (0.8.2): Studio-Datei per Speichern-Dialog als Datei sichern; danach von Hand nach SD:/scripts/studio kopieren
ipcMain.handle('studio:exportDatei', async (_e, a) => {
  try {
    namePruefen(a.lua, a.kennung)
    const b = beschreibungen()[a.lua] || {}
    const gebaut = S.bauenMitWaechter(a.projekt, { ...(a.meta || {}), studioVersion: VERSION, immerAlarm: immerAlarm(a.lua), werk: werkEinstellungen(a.lua), extra: S.extraDarstellungen(b, (a.meta || {}).luaVersion) })
    if (gebaut.fehler.length) return { ok: false, fehler: `pruefen|${gebaut.fehler.join('; ')}` }
    const r = steuerung && a.pfad ? { canceled: false, filePath: String(a.pfad) } : await dialog.showSaveDialog(fenster && !fenster.isDestroyed() ? fenster : undefined, { defaultPath: `${a.kennung}.${a.lua}.lua`, filters: [{ name: 'Lua-Studio', extensions: ['lua'] }] })
    if (r.canceled || !r.filePath) { P.info('export', 'Als Datei speichern abgebrochen'); return { ok: false, abgebrochen: true } }
    fs.writeFileSync(r.filePath, gebaut.text, 'utf8')
    P.info('export', `Datei gespeichert: ${r.filePath} (${gebaut.zaehlung.byte} Byte, Format ${gebaut.daten.format}, ${(gebaut.daten.symbole || []).length} Symbole)`)
    return { ok: true, pfad: r.filePath, symbole: (gebaut.daten.symbole || []).length }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:modelle', async (_e, spec) => {
  try {
    const luas = beschreibungen()
    const modelle = []
    // Für jedes bekannte Lua den Ordner lesen (bei der Funke liegt er neben dem Lua-Ordner)
    const gesehen = new Set()
    const gelesen = new Set()
    for (const lua of Object.keys(luas).length ? Object.keys(luas) : ['studio']) {
      const ziel = zielAus(spec, lua)
      // Jeden Studio-Ordner nur einmal lesen (mehrere Luas teilen sich einen Ordner)
      if (spec.art === 'funke') { const b = await ziel.basis(); P.info('modelle', `${lua}: Studio-Ordner ${require('../studio/ziel').ortName(b)} (${ziel.diagnose().join(' | ')})`); if (gelesen.has(b)) continue; gelesen.add(b) }
      for (const m0 of await S.modelleLesen(ziel)) {
        // Info-Datei unter altem Lua-Namen (Lua auf der Funke noch nicht umbenannt): dem neuen Lua zuordnen, Hinweis «aktualisieren»
        const neu = !luas[m0.lua] && S.ALIAS[m0.lua] && luas[S.ALIAS[m0.lua]] ? S.ALIAS[m0.lua] : null
        const m = neu ? { ...m0, lua: neu, altLua: m0.lua } : m0
        const k = `${m.kennung}.${m.lua}`
        if (gesehen.has(k)) continue
        gesehen.add(k)
        modelle.push({ ...m, bekannt: !!luas[m.lua] })
      }
      if (spec.art !== 'funke') break // Laufwerk/Ordner: ein Ordner für alle
    }
    P.info('modelle', `geladen von ${spec.art}: ${modelle.length} Modelle (${modelle.map((m) => `${m.kennung}.${m.lua}${m.bekannt ? '' : ' unbekannt'}`).join(', ').slice(0, 1500)})`)
    return { ok: true, modelle }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:projekt', async (_e, { funkeName, lua, kennung, info }) => {
  try { namePruefen(lua, kennung) } catch (e) { return fehlerAntwort(e) }
  const b = beschreibungen()[lua]
  if (!b) return { ok: false, fehler: 'luaUnbekannt' }
  const vorhanden = studioAblage().projektLesen(funkeName, lua, kennung)
  P.info('modell', `geöffnet: ${kennung}.${lua} auf «${funkeName}», ${vorhanden ? 'gespeichertes Projekt' : 'neu'}${info && info.fenster ? `, Fenster ${JSON.stringify(info.fenster)}` : ''}`)
  return { ok: true, projekt: vorhanden || S.neuesProjekt(b, info), neu: !vorhanden }
})
ipcMain.handle('studio:speichern', (_e, { funkeName, lua, kennung, projekt }) => {
  try {
    namePruefen(lua, kennung)
    // Vorbereitete Modelle: die Angaben zum Modell (Name, Kennung, Gruppe) gehören zur Datei und werden nie ersetzt
    if (String(funkeName).startsWith(S.VORBEREITET)) {
      const alt = studioAblage().projektLesen(funkeName, lua, kennung)
      if (alt && alt.vorbereitetInfo) projekt = { ...projekt, vorbereitetInfo: alt.vorbereitetInfo }
    } else if (projekt && projekt.vorbereitetInfo) { projekt = { ...projekt }; delete projekt.vorbereitetInfo }
    studioAblage().projektSpeichern(funkeName, lua, kennung, projekt)
    return { ok: true }
  } catch (e) { return fehlerAntwort(e) }
})
let letzteSperre = ''
ipcMain.handle('studio:pruefen', (_e, { projekt, meta }) => {
  try {
    const r = S.bauenMitWaechter(projekt, { ...meta, studioVersion: VERSION })
    // Wächter-Sperren nur bei Änderung ins Protokoll (die Prüfung läuft bei jeder Eingabe)
    const sperre = ((r.waechter && r.waechter.gesperrt) || []).join(', ')
    if (sperre !== letzteSperre) { if (sperre) P.warnung('waechter', `gesperrt: ${sperre}`); else if (letzteSperre) P.info('waechter', 'Sperre aufgehoben'); letzteSperre = sperre }
    return { ok: true, zaehlung: r.zaehlung, fehler: r.fehler, grenze: F.GRENZE_STUDIO, waechter: r.waechter, wegfall: r.wegfall, verworfen: r.verworfen,
      format: r.daten.format, symbole: r.daten.symbole || [] }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:funkeDatei', async (_e, { spec, lua, kennung }) => {
  try {
    namePruefen(kennung)
    const roh = await zielAus(spec, lua).lesen(`${kennung}.${lua}.funke.lua`)
    if (!roh) return { ok: true, daten: null }
    try { return { ok: true, daten: F.lesen(roh.toString('utf8')) } } catch { return { ok: true, daten: null, kaputt: true } }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:uebertragen', async (_e, a) => {
  try {
    namePruefen(a.lua, a.kennung)
    const ziel = zielAus(a.spec, a.lua)
    const nSym = Object.keys(a.symbole || {}).length
    P.info('uebertragen', `Start: ${a.kennung}.${a.lua} nach ${a.spec.art}${a.spec.art === 'funke' ? '' : ' ' + (a.spec.wurzel || a.spec.pfad)}, Format ${JSON.stringify((a.meta || {}).formate || null)}, ${nSym} Symboldateien${a.funkeUebernehmen ? ', Änderungen der Funke übernehmen' : ''}`)
    const r = await S.uebertragen({ ziel, ablage: studioAblage(), funkeName: a.funkeName, kennung: a.kennung, lua: a.lua, projekt: a.projekt,
      meta: { ...a.meta, studioVersion: VERSION, immerAlarm: immerAlarm(a.lua), werk: werkEinstellungen(a.lua), extra: S.extraDarstellungen(beschreibungen()[a.lua], (a.meta || {}).luaVersion) }, funkeUebernehmen: a.funkeUebernehmen,
      werkGrenzen: ((beschreibungen()[a.lua] || {}).standard || {}).grenzen || {}, schritt: (t, ok) => { (ok ? P.info : P.warnung).call(P, 'uebertragen', `${ok ? 'Schritt' : 'Abbruch'}: ${t}`); melden('studio:schritt', { t, ok }) },
      symbolDateien: symbolePuffer(a.symbole), symboleLoeschen: symbolNamen(a.symboleLoeschen) })
    if (a.funkeUebernehmen) studioAblage().projektSpeichern(a.funkeName, a.lua, a.kennung, { einstellungen: r.daten.einstellungen, werte: r.daten.werte, grenzen: r.daten.grenzen, ansichten: r.daten.ansichten })
    P.info('uebertragen', `fertig: ${a.kennung}.${a.lua}${r.sicherung ? ', Sicherung ' + r.sicherung : ''}`)
    return { ok: true, sicherung: r.sicherung, projekt: r.daten }
  } catch (e) { return fehlerAntwort(e) }
})
// Werte mit immerAlarm (Abschaltgründe, Format 2 §3.5) eines Luas
// Werkwerte der Einstellungen eines Luas (für einstellungenSchreiben)
function werkEinstellungen(lua) { return Object.fromEntries(((beschreibungen()[lua] || {}).einstellungen || []).filter((e) => e && e.s).map((e) => [e.s, e.werk])) }
function immerAlarm(lua) { return ((beschreibungen()[lua] || {}).werte || []).filter((w) => w && w.immerAlarm).map((w) => `lua:${w.s}`) }
// Freigegebene Symbolnamen aus der Oberfläche: nur gültige Dateinamen
function symbolNamen(roh) { return Array.isArray(roh) ? roh.filter((n) => typeof n === 'string' && Y.DATEI.test(n)).slice(0, 2000) : [] }
// Vor dem Übertragen: welche Symbol-Dateien wären danach unbenutzt (Ankündigung, gelöscht wird nur nach Haken)
ipcMain.handle('studio:symboleUnbenutzt', async (_e, a) => {
  try {
    namePruefen(a.lua, a.kennung)
    if (!a.spec || a.spec.art === 'ordner') return { ok: true, namen: [] }
    const ziel = zielAus(a.spec, a.lua)
    if (ziel.art === 'ordner') return { ok: true, namen: [] }
    const d = S.dateiDaten(a.projekt, { ...(a.meta || {}), immerAlarm: immerAlarm(a.lua), werk: werkEinstellungen(a.lua), extra: S.extraDarstellungen(beschreibungen()[a.lua], (a.meta || {}).luaVersion) })
    const r = await S.symboleUnbenutzt(ziel, `${a.kennung}.${a.lua}.lua`, d.format === 2 ? d.symbole || [] : [])
    return { ok: true, ...r }
  } catch (e) { return fehlerAntwort(e) }
})
// Symbol-Masken aus der Oberfläche: { 'akku_48.png': base64 der Grauwerte (Kante × Kante) } -> Graustufen-PNG.
// Nur gültige Dateinamen, höchstens 20 Dateien, Kante bis 64 px.
function symbolePuffer(roh) {
  const r = {}
  if (!roh || typeof roh !== 'object') return r
  for (const [datei, b64] of Object.entries(roh).slice(0, Y.MAX_SYMBOLE)) {
    if (!Y.DATEI.test(datei) || typeof b64 !== 'string' || b64.length > 8192) continue
    const grau = Buffer.from(b64, 'base64')
    const k = Math.round(Math.sqrt(grau.length))
    if (k < 1 || k > 64 || k * k !== grau.length) continue
    r[datei] = Y.pngGrau(k, grau)
  }
  return r
}

// Symbolsatz: Katalog und SVG-Quellen (die Oberfläche rechnet daraus die Masken)
let symbolCache = null
ipcMain.handle('studio:symbole', () => {
  if (!symbolCache) {
    const o = path.join(__dirname, '..', 'symbole', 'svg')
    symbolCache = { katalog: Y.KATALOG, svg: Object.fromEntries(Y.KATALOG.map((k) => [k.name, fs.readFileSync(path.join(o, `${k.name}.svg`), 'utf8')])) }
  }
  return symbolCache
})
ipcMain.handle('studio:presets', (_e, lua) => S.presets(beschreibungen()[lua]))
ipcMain.handle('studio:presetAnwenden', (_e, { lua, s, projekt, fenster }) => {
  const p = S.presets(beschreibungen()[lua]).find((x) => x.s === s)
  return p ? { ok: true, projekt: S.presetAnwenden(projekt, p, fenster) } : { ok: false, fehler: 'presetUnbekannt' }
})
// Automatisch anordnen (0.4.0): art gleich|verhaeltnis|verteilen|raster
ipcMain.handle('studio:anordnen', (_e, d) => {
  const r = d && d.art === 'raster' ? AN.raster(d) : AN.anordnen(d || {})
  P.info('anordnen', `${d && d.art} G=${d && d.G} ${d && d.ansicht ? d.ansicht.breite + '×' + d.ansicht.hoehe : ''}: ${r.ok ? 'ok' + (r.hinweise.length ? ' (' + r.hinweise.join(', ') + ')' : '') : r.grund + (r.index !== undefined ? ' Kästchen ' + (r.index + 1) : '')}`)
  return r
})

// Ohne Funke vorbereiten: Projekte unter «Vorbereitet <Gruppe>», Info im Projekt mitgespeichert
ipcMain.handle('studio:gruppen', () => S.GRUPPEN)
ipcMain.handle('studio:vorbereitetNeu', (_e, { gruppe, lua, modellname }) => {
  try {
    namePruefen(lua)
    const b = beschreibungen()[lua]
    if (!b) throw new Error('luaUnbekannt')
    const info = S.vorbereitetInfo(gruppe, b, modellname)
    if (studioAblage().projektLesen(info.funke, lua, info.kennung)) throw new Error('vorbereitetDoppelt')
    const projekt = { ...S.neuesProjekt(b, info), vorbereitetInfo: info }
    studioAblage().projektSpeichern(info.funke, lua, info.kennung, projekt)
    P.info('vorbereiten', `neu: ${info.kennung}.${lua} in «${info.funke}», Modell «${info.modellname || modellname}»`)
    return { ok: true, modell: { kennung: info.kennung, lua, info, vorbereitet: true, bekannt: true } }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:vorbereitete', () => {
  const luas = beschreibungen()
  const r = []
  for (const g of Object.keys(S.GRUPPEN)) {
    for (const p of studioAblage().projekte(S.VORBEREITET + g)) {
      const d = studioAblage().projektLesen(S.VORBEREITET + g, p.lua, p.kennung)
      if (!d || !d.vorbereitetInfo) continue
      r.push({ kennung: p.kennung, lua: p.lua, info: d.vorbereitetInfo, vorbereitet: true, bekannt: !!luas[p.lua] })
    }
  }
  return r
})
ipcMain.handle('studio:vorbereitetLoeschen', async (_e, { gruppe, lua, kennung }) => {
  try {
    namePruefen(lua, kennung)
    if (!S.GRUPPEN[gruppe]) throw new Error('gruppe')
    const p = studioAblage().pfadProjekt(S.VORBEREITET + gruppe, lua, kennung)
    if (fs.existsSync(p)) await shell.trashItem(p)
    P.info('vorbereiten', `gelöscht (Papierkorb): ${kennung}.${lua} in Gruppe ${gruppe}`)
    return { ok: true }
  } catch (e) { return fehlerAntwort(e) }
})

// Funken-Schnelltest: Info-Datei lesen und Log-Zeilen seit «seit» (ms, Date.now() der Oberfläche) auswerten
ipcMain.handle('studio:schnelltest', async (_e, { spec, lua, kennung, format, vorher, seit, groessen }) => {
  try {
    namePruefen(lua, kennung)
    const ziel = zielAus(spec, lua)
    const logZeilen = spec.art === 'funke' ? logPuffer.filter((x) => x.t >= (Number(seit) || 0)).map((x) => x.z) : null
    const g = Array.isArray(groessen) ? groessen.filter((x) => x && Number.isInteger(x.breite) && Number.isInteger(x.hoehe)).slice(0, 2) : null
    const r = await S.schnelltest({ ziel, kennung, lua, format, vorher, logZeilen, groessen: g })
    const kurz = (r.punkte || []).map((x) => `${x.stufe} ${x.k}${x.wert !== undefined ? ' ' + JSON.stringify(x.wert) : ''}`).join('; ')
    ;(r.ok ? P.info : P.warnung).call(P, 'schnelltest', `${kennung}.${lua}: ${r.ok ? 'bestanden' : r.unsicher ? 'unsicher' : 'Befund'} – ${kurz}`.slice(0, 3000))
    return { ok: true, ...r }
  } catch (e) { return fehlerAntwort(e) }
})
ipcMain.handle('studio:infoText', async (_e, { spec, lua, kennung }) => {
  try { namePruefen(lua, kennung); const r = await zielAus(spec, lua).lesen(`${kennung}.${lua}.info.json`); return r ? r.toString('utf8') : null } catch { return null }
})

ipcMain.handle('studio:vorlagen', (_e, lua) => (NAME.test(String(lua)) ? studioAblage().vorlagen(lua) : []))
ipcMain.handle('studio:vorlageLaden', (_e, { lua, name }) => { try { namePruefen(lua); return { ok: true, daten: studioAblage().vorlageLesen(lua, name) } } catch (e) { return fehlerAntwort(e) } })
ipcMain.handle('studio:vorlageSpeichern', (_e, { lua, name, projekt }) => { try { namePruefen(lua); studioAblage().vorlageSpeichern(lua, name, projekt); return { ok: true } } catch (e) { return fehlerAntwort(e) } })
ipcMain.handle('studio:projekte', (_e, funkeName) => studioAblage().projekte(funkeName))
ipcMain.handle('studio:projektLesen', (_e, { funkeName, lua, kennung }) => (NAME.test(String(lua)) && NAME.test(String(kennung)) ? studioAblage().projektLesen(funkeName, lua, kennung) : null))

// ---------- Fehlerprotokoll: Anzeige, Stufe, Ordner, Support-ZIP, Löschen (Hilfe -> Fehlerprotokoll) ----------
ipcMain.handle('protokoll:lesen', () => ({ text: P.lesen(), stufe: P.stufe, ordner: P.ordner.split(os.homedir()).join('~') }))
ipcMain.handle('protokoll:stufe', (_e, s) => ({ ok: P.stufeSetzen(String(s)), stufe: P.stufe }))
ipcMain.handle('protokoll:ordner', async () => {
  fs.mkdirSync(P.ordner, { recursive: true })
  const r = fs.existsSync(P.datei) ? (shell.showItemInFolder(P.datei), '') : await shell.openPath(P.ordner)
  return { ok: !r }
})
ipcMain.handle('protokoll:loeschen', () => { P.loeschen(); P.kopf(kopfZeilen()); return { ok: true } })
// Meldungen der Oberfläche: Fehler (window.onerror, unhandledrejection) mit Stack, sonst Ereignisse (Sprache, Reiter …)
ipcMain.handle('protokoll:melden', (_e, m) => {
  if (!m || typeof m !== 'object') return false
  const text = String(m.text || '').slice(0, 2000)
  if (m.art === 'fehler') { const e = new Error(text); e.stack = `${text}\n${String(m.stack || '').slice(0, 4000)}`; P.fehler('oberflaeche', e, m.wo ? String(m.wo).slice(0, 200) : undefined) }
  else if (m.art === 'ausfuehrlich') P.ausfuehrlich('oberflaeche', text)
  else P.info('oberflaeche', text)
  return true
})
// ZIP für den Support: Protokolldateien, Systemangaben, Log der Funke (letzte 400 Zeilen) und die Info-Dateien der Funke
// (Format v1 §14, enthalten höchstens Modellnamen). Keine Studio-Projekte, keine Pfade mit Benutzername.
ipcMain.handle('protokoll:support', async () => {
  P.info('protokoll', 'Support-ZIP wird erstellt')
  const stempel = zeit().slice(0, 16).replace(':', '-')
  const ziel = await dialog.showSaveDialog(fenster, {
    defaultPath: path.join(app.getPath('desktop'), `Lua-Studio Fehlerprotokoll ${stempel}.zip`),
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  })
  if (ziel.canceled || !ziel.filePath) return { ok: false, abgebrochen: true }
  const r = await supportZip(ziel.filePath)
  if (r.ok) shell.showItemInFolder(ziel.filePath)
  return r
})
async function supportZip(zielPfad) {
  const dateien = []
  for (const [d, n] of [[P.alt, 'lua-studio-alt.log'], [P.datei, 'lua-studio.log']]) {
    try { dateien.push({ name: n, daten: fs.readFileSync(d) }) } catch { /* fehlt */ }
  }
  const sys = [...kopfZeilen(), `Erstellt ${zeit()}`, `Verbindung: ${funke && !funke.getrennt ? JSON.stringify(funke.hallo) : 'keine'}`]
  const infos = []
  if (funke && !funke.getrennt) {
    const log = logPuffer.map((x) => `${zeit(new Date(x.t))} ${x.z}`).join('\n')
    dateien.push({ name: 'funke-log.txt', daten: ohnePersoenliches(log) })
    // Info-Dateien aus jedem Studio-Ordner (SD:/scripts/studio bzw. /scripts/studio), je höchstens 64 KB, zusammen höchstens 60
    const gelesen = new Set()
    for (const lua of Object.keys(beschreibungen())) {
      try {
        const z = funkenZiel(funke, lua)
        const b = await z.basis()
        if (gelesen.has(b)) continue
        gelesen.add(b)
        for (const e of await z.liste()) {
          if (!/\.info\.json$/.test(e.name) || infos.length >= 60 || e.groesse > 65536) continue
          const roh = await z.lesen(e.name)
          if (roh) { infos.push(e.name); dateien.push({ name: `funke-info/${b.replace(/[:/]+/g, '_')}/${e.name}`, daten: roh }) }
        }
      } catch (e) { sys.push(`Info-Dateien ${lua}: ${e.message}`) }
    }
  } else sys.push('Keine Funke verbunden: ohne Log und Info-Dateien der Funke')
  sys.push(`Info-Dateien: ${infos.length}`)
  dateien.push({ name: 'system.txt', daten: ohnePersoenliches(sys.join('\n') + '\n') })
  try {
    fs.writeFileSync(zielPfad, zipBauen(dateien))
  } catch (e) { P.fehler('protokoll', e, 'Support-ZIP schreiben'); return { ok: false, fehler: e.message } }
  P.info('protokoll', `Support-ZIP gespeichert: ${dateien.length} Dateien, ${infos.length} Info-Dateien`)
  return { ok: true, pfad: zielPfad.split(os.homedir()).join('~'), dateien: dateien.length, infos: infos.length }
}

// Menü: auf dem Mac die Menüleiste mit «Hilfe → Fehlerprotokoll» (Windows: Knopf «Hilfe» oben in der App)
function menueSetzen() {
  if (process.platform !== 'darwin') return
  const en = !/^de/i.test(app.getLocale() || '')
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' },
    { role: 'help', label: en ? 'Help' : 'Hilfe', submenu: [{ label: en ? 'Error log …' : 'Fehlerprotokoll …', click: () => melden('protokoll:zeigen', true) }] },
  ]))
}

// Nur für Tests: LUA_STUDIO_SELBSTTEST=<simulator-port>;<bilddatei> verbindet mit dem Simulator,
// wartet, speichert ein Bild des ganzen Fensters und beendet das Programm.
async function selbsttest(wert) {
  const [port, datei, art, exportOrdner] = wert.split(';')
  await new Promise((r) => fenster.webContents.once('did-finish-load', r))
  const ok = art === 'vorbereitet' || art === 'anordnen' || art === 'symbole' || (art === 'protokoll' && !port) ? { ok: false } : await verbinden({ art: 'simulator', port })
  await warten(art === 'vorbereitet' ? 1500 : 4000)
  const foto = async (name) => fs.writeFileSync(name, (await fenster.webContents.capturePage()).toPNG())
  if (art === 'protokoll') {
    // Fehlerprotokoll: Fehler in der Oberfläche auslösen, Hilfe-Menü und Fenster zeigen, Support-ZIP schreiben
    const js = (code) => fenster.webContents.executeJavaScript(code)
    await js("setTimeout(() => { throw new Error('Selbsttest Oberflächenfehler') }, 0); Promise.reject(new Error('Selbsttest Ablehnung')); 0")
    await js("document.querySelector('[data-reiter=studio]').click(); 0"); await warten(1000)
    await js("document.getElementById('modelleLaden').click(); 0"); await warten(4000)
    await js("document.getElementById('hilfeKnopf').click(); 0"); await warten(300)
    await foto(datei.replace(/\.png$/, ' 0 Hilfe.png'))
    await js("document.getElementById('protokollAuf').click(); 0"); await warten(800)
    console.log('ZUSTAND', await js("JSON.stringify({ offen: document.getElementById('protokollFenster').open, studio: !document.getElementById('bereichStudio').hidden, text: document.getElementById('protokollText').textContent.length })"))
    await foto(datei.replace(/\.png$/, ' 1 Fenster.png'))
    const r = await supportZip(exportOrdner)
    console.log('SUPPORT', JSON.stringify(r))
    if (ok.ok) await trennen()
    app.quit()
    return
  }
  if (art === 'anordnen') {
    // 0.4.0: Startseite, «+ Vorbereiten» oben, Modell anlegen, Kästchen unordentlich setzen, jede Art anordnen
    const js = (code) => fenster.webContents.executeJavaScript(code)
    await js("window.confirm = () => true; window.alert = () => {}; 0")
    await js("document.querySelector('[data-reiter=studio]').click(); 0"); await warten(1200)
    await foto(datei.replace(/\.png$/, ' 0 Startseite.png'))
    await js("document.getElementById('vorbereitenOben').click(); 0"); await warten(1200)
    await js("document.getElementById('vLua').value = 'testlua'; document.getElementById('vName').value = 'Anordnen 1'; document.getElementById('vName').dispatchEvent(new Event('input')); 0"); await warten(300)
    await foto(datei.replace(/\.png$/, ' 1 Formular.png'))
    await js("document.getElementById('vAnlegen').click(); 0"); await warten(1500)
    await js(`st.ansicht = st.projekt.ansichten.findIndex((a) => a.breite === 784); if (st.ansicht < 0) st.ansicht = 0
      const a = st.projekt.ansichten[st.ansicht]
      a.plaetze = [{ x: 8, y: 40, b: 230, h: 150 }, { x: 250, y: 36, b: 180, h: 150 }, { x: 444, y: 44, b: 320, h: 140 },
        { x: 4, y: 200, b: 250, h: 100 }, { x: 268, y: 196, b: 230, h: 112 }, { x: 512, y: 204, b: 260, h: 96 }]
        .map((q, i) => Object.assign({}, a.plaetze[0] || {}, { wert: (a.plaetze[0] || {}).wert }, q))
      allesZeigen(); geaendert(); 0`); await warten(800)
    await foto(datei.replace(/\.png$/, ' 2 Vorher.png'))
    for (const art of ['gleich', 'verhaeltnis', 'verteilen', 'raster']) {
      await js(`document.getElementById('rueckgaengig').disabled || document.getElementById('rueckgaengig').click(); document.getElementById('anordnenArt').value = '${art}'; document.getElementById('anordnenKnopf').click(); 0`); await warten(800)
      console.log('ANORDNEN', art, await js("JSON.stringify({ m: document.getElementById('anordnungMeldung').textContent, p: ansichtAktuell().plaetze.map((p) => [p.x, p.y, p.b, p.h].join(',')) })"))
      await foto(datei.replace(/\.png$/, ` 3 ${art}.png`))
    }
    app.quit()
    return
  }
  if (art === 'symbole') {
    // 0.4.1: Ankündigung «n nicht mehr benutzte Symbole löschen» auf einer nachgebildeten SD-Karte (exportOrdner = Wurzel)
    erlaubteOrdner.add(exportOrdner)
    const js = (code) => fenster.webContents.executeJavaScript(code)
    const sd = path.join(exportOrdner, 'scripts', 'studio', 'symbole')
    const liste = () => fs.readdirSync(sd).sort().join(',')
    await js("window.confirm = () => true; window.alert = () => {}; 0")
    await js("document.querySelector('[data-reiter=studio]').click(); 0"); await warten(1200)
    await js("document.getElementById('vorbereitenOben').click(); 0"); await warten(1200)
    await js("document.getElementById('vLua').value = 'testlua'; document.getElementById('vName').value = 'Symbole 1'; document.getElementById('vName').dispatchEvent(new Event('input')); 0"); await warten(300)
    await js("document.getElementById('vAnlegen').click(); 0"); await warten(1500)
    await js("document.querySelector('[data-unter=uebertragen]').click(); 0"); await warten(600)
    await js(`st.exportSpec = { art: 'laufwerk', wurzel: ${JSON.stringify(exportOrdner)}, text: 'SD-Test' }; uebertragenZeigen(); 0`); await warten(1200)
    const zeile = async (n) => console.log('SYMBOLE', n, await js("JSON.stringify({ sichtbar: !document.getElementById('symboleLoeschenZeile').hidden, text: document.getElementById('symboleLoeschenText').textContent, haken: document.getElementById('symboleLoeschen').checked, namen: document.getElementById('symboleNamen').textContent.split(', ').length + ' Namen, Liste sichtbar: ' + !document.getElementById('symboleListe').hidden, schritte: [...document.querySelectorAll('#schritte li')].map((l) => l.textContent) })"), 'SD:', liste())
    await zeile('vorher'); await foto(datei.replace(/\.png$/, ' 0 Ankuendigung.png'))
    await js("document.getElementById('uebertragenKnopf').click(); 0"); await warten(3000)
    await zeile('ohne Haken'); await foto(datei.replace(/\.png$/, ' 1 Ohne Haken.png'))
    await js("uebertragenZeigen(); 0"); await warten(1200)
    await js("document.getElementById('symboleLoeschen').checked = true; document.getElementById('uebertragenKnopf').click(); 0"); await warten(3000)
    await zeile('mit Haken'); await foto(datei.replace(/\.png$/, ' 2 Mit Haken.png'))
    app.quit()
    return
  }
  if (art === 'vorbereitet') {
    // Ohne Funke: Modell vorbereiten, Symbol, fette Einheit, Schmuck, Export in einen Ordner (Format 2)
    erlaubteOrdner.add(exportOrdner)
    const js = (code) => fenster.webContents.executeJavaScript(code)
    await js("window.confirm = () => true; window.alert = () => {}; 0")
    await js("document.querySelector('[data-reiter=studio]').click()"); await warten(800)
    await js("const q = document.getElementById('quelle'); q.value = String(q.options.length - 1); document.getElementById('modelleLaden').click(); 0"); await warten(800)
    await js("document.getElementById('vorbereitenAuf').click(); document.getElementById('vLua').value = 'testlua'; document.getElementById('vName').value = 'Möwe 3S'; document.getElementById('vName').dispatchEvent(new Event('input')); 0"); await warten(300)
    await foto(datei.replace(/\.png$/, ' 0 Vorbereiten.png'))
    await js("document.getElementById('vAnlegen').click()"); await warten(1500)
    await js("document.getElementById('platzNeu').click(); document.getElementById('platzNeu').click(); 0"); await warten(400)
    await js(`const a = st.projekt.ansichten[0];
      Object.assign(a.plaetze[0], { symbol: 'akku', symbolPx: 48, einheitZeigen: 'fett', b: 240, h: 120 });
      Object.assign(a.plaetze[1], { symbol: 'temperatur', x: 300, b: 240, h: 120 });
      dekoNeu('symbol'); Object.assign(a.deko[0], { x: 600, y: 200, name: 'elektromotor', px: 64 });
      dekoNeu('text'); Object.assign(a.deko[1], { x: 300, y: 260, b: 200, h: 30, text: 'Motor 1', farbe: [255, 200, 0] });
      dekoNeu('rahmen'); Object.assign(a.deko[2], { x: 2, y: 2, b: 560, h: 150 });
      dekoNeu('linie'); Object.assign(a.deko[3], { x: 10, y: 300, b: 500, h: -100 });
      st.gewaehltDeko = -1; st.gewaehlt = 0; flaecheZeigen(); eigenschaftenZeigen(); geaendert(); 0`); await warten(1200)
    await foto(datei.replace(/\.png$/, ' 1 Symbole und Schmuck.png'))
    await js("document.querySelector('[data-unter=uebertragen]').click()"); await warten(800)
    await js(`st.exportSpec = { art: 'ordner', pfad: ${JSON.stringify(exportOrdner)}, text: 'Test' }; uebertragenZeigen(); 0`); await warten(500)
    await js("document.getElementById('uebertragenKnopf').click()"); await warten(3000)
    await foto(datei.replace(/\.png$/, ' 2 Export.png'))
    app.quit()
    return
  }
  if (art === 'studio') {
    // Ablauf im Reiter «Modelle»: Quelle Funke, Modelle laden, erstes Modell öffnen, Kästchen hinzufügen, drei Unterreiter, übertragen
    const js = (code) => fenster.webContents.executeJavaScript(code)
    await js("window.confirm = () => true; window.alert = () => {}; 0")
    await js("document.querySelector('[data-reiter=studio]').click()"); await warten(800)
    await js("document.getElementById('modelleLaden').click()"); await warten(3000)
    await js("document.querySelector('#modellListe li') && document.querySelector('#modellListe li').click()"); await warten(1500)
    await js("document.getElementById('platzNeu').click()"); await warten(600)
    await foto(datei.replace(/\.png$/, ' 1 Anordnung.png'))
    await js("document.getElementById('anordnenKnopf').click()"); await warten(600)
    await foto(datei.replace(/\.png$/, ' 1b Verteilt.png'))
    await js("document.querySelector('[data-unter=grenzen]').click()"); await warten(800)
    await foto(datei.replace(/\.png$/, ' 2 Grenzen.png'))
    await js("document.querySelector('[data-unter=uebertragen]').click()"); await warten(800)
    await js("document.getElementById('uebertragenKnopf').click()"); await warten(6000)
    await foto(datei.replace(/\.png$/, ' 3 Uebertragen.png'))
  } else {
    if (ok.ok) { await funke.taste('MDL'); await warten(2500) }
    await foto(datei)
  }
  await trennen()
  app.quit()
}

// Steuerschnittstelle (ab 0.10.0): nur mit --steuerung bzw. LUA_STUDIO_STEUERUNG=1
const STEUERUNG = require('./steuerung')
let steuerung = null
app.whenReady().then(() => {
  P.kopf(kopfZeilen())
  menueSetzen()
  fensterOeffnen()
  if (STEUERUNG.aktiv()) steuerung = STEUERUNG.starten({ ordner: app.getPath('userData'), fenster: () => fenster, P, version: VERSION, supportZip })
  if (process.env.LUA_STUDIO_SELBSTTEST) selbsttest(process.env.LUA_STUDIO_SELBSTTEST)
})
app.on('will-quit', () => { if (steuerung) steuerung.aufraeumen() })
app.on('window-all-closed', async () => { await trennen(); P.info('start', 'beendet'); app.quit() })
