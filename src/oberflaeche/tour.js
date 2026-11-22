'use strict'
// Hinweis auf neue Version und Tutorial-Tour (ab 0.13.0). Nutzt $, api, T, speicherLesen/-Schreiben aus app.js und
// Funktionen aus studio.js (vorbereitenStart, quellenSuchen, modelleLaden, modellOeffnen, startSeiteZeigen, st).

;(() => {
  const text = (k, w = {}) => String(T[k] || k).replace(/\{(\w+)\}/g, (_, n) => (w[n] !== undefined ? w[n] : ''))
  const warte = (ms) => new Promise((r) => setTimeout(r, ms))
  const TAG = 24 * 3600 * 1000

  // ---------- Neue Version ----------
  const updateAn = () => speicherLesen('updateSuchen') !== 'aus'   // Standard: ein
  function schalterZeigen() { $('updateSchalter').textContent = (updateAn() ? '☑ ' : '☐ ') + text('updateSchalter') }
  async function updatePruefen(info) {
    if (info.steuerung || !updateAn()) return
    const zuletzt = Number(speicherLesen('updateZuletzt') || 0)
    if (Date.now() - zuletzt < TAG) {   // höchstens 1× pro Tag fragen; gemerkten Fund trotzdem zeigen
      const alt = speicherLesen('updateFund')
      if (alt) { try { leiste(JSON.parse(alt), info.version) } catch { /* egal */ } }
      return
    }
    const r = await api.update()
    if (r.fehler) return                // ohne Internet still, nächster Start fragt wieder
    speicherSchreiben('updateZuletzt', String(Date.now()))
    speicherSchreiben('updateFund', r.neu ? JSON.stringify({ version: r.version, url: r.url }) : '')
    if (r.neu) leiste(r, info.version)
  }
  function leiste(r, aktuell) {
    const teile = (v) => String(v).split('.').map(Number)
    const [a, b] = [teile(r.version), teile(aktuell)]
    if (!(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))))) return
    if (speicherLesen('updateWeg') === r.version) return
    const l = $('updateLeiste')
    l.querySelector('.u-text').textContent = text('updateNeu', { v: r.version })
    const link = l.querySelector('a'); link.href = r.url; link.textContent = text('updateLink')
    l.querySelector('button').onclick = () => { speicherSchreiben('updateWeg', r.version); l.hidden = true }
    l.hidden = false
  }
  $('updateSchalter').addEventListener('click', (e) => {
    e.stopPropagation()
    speicherSchreiben('updateSuchen', updateAn() ? 'aus' : 'an')
    if (!updateAn()) $('updateLeiste').hidden = true
    schalterZeigen()
  })

  // ---------- Tutorial ----------
  let uebung = null   // { lua, kennung } des Übungsmodells
  async function uebungAnlegen() {
    if (uebung) return
    const lua = ($('vLua') && $('vLua').value) || 'electric'
    $('vorbereitenForm').hidden = true
    const r = await api.studio('vorbereitetNeu', { gruppe: 'L', lua, modellname: text('tourModell') })
    if (!r.ok) return
    uebung = { lua: r.modell.lua, kennung: r.modell.kennung }
    await quellenSuchen()
    $('quelle').value = String(st.quellen.findIndex((q) => q.art === 'vorbereitet'))
    await modelleLaden()
    const m = st.modelle.find((x) => x.kennung === r.modell.kennung && x.lua === r.modell.lua)
    if (m) await modellOeffnen(m)
    await warte(300)
  }
  const SCHRITTE = [
    { k: 'tour1', ziel: null, vor: async () => { if (typeof startSeiteZeigen === 'function' && !uebung) startSeiteZeigen() } },
    { k: 'tour2', ziel: 'vLua', vor: async () => { await vorbereitenStart(); await warte(200) } },
    { k: 'tour3', ziel: 'vorbereitenForm' },
    { k: 'tour4', ziel: 'presetWahl', vor: uebungAnlegen },
    { k: 'tour5', ziel: 'flaecheRahmen', vor: async () => { const u = document.querySelector('[data-unter="anordnung"]'); if (u) u.click(); await warte(200) } },
    { k: 'tour6', ziel: 'unterGrenzen', vor: async () => { const u = document.querySelector('[data-unter="grenzen"]'); if (u) u.click(); await warte(200) } },
    { k: 'tour7', ziel: 'waechter', vor: async () => { const u = document.querySelector('[data-unter="anordnung"]'); if (u) u.click(); await warte(200) } },
    { k: 'tour8', ziel: 'unterUebertragen', vor: async () => { const u = document.querySelector('[data-unter="uebertragen"]'); if (u) u.click(); await warte(200) } },
  ]
  let i = -1, schicht = null
  function aufbauen() {
    schicht = document.createElement('div'); schicht.className = 'tour'
    schicht.innerHTML = '<div class="tour-loch"></div><div class="tour-karte" role="dialog"><div class="tour-zahl"></div><p class="tour-text"></p>' +
      '<div class="tour-knoepfe"><button class="tour-weg"></button><span></span><button class="tour-zurueck"></button><button class="tour-weiter"></button></div></div>'
    document.body.appendChild(schicht)
    schicht.querySelector('.tour-weg').onclick = () => ende()
    schicht.querySelector('.tour-zurueck').onclick = () => gehe(i - 1)
    schicht.querySelector('.tour-weiter').onclick = () => (i >= SCHRITTE.length - 1 ? ende() : gehe(i + 1))
  }
  function setzen() {
    const s = SCHRITTE[i], el = s.ziel && $(s.ziel)
    const loch = schicht.querySelector('.tour-loch'), karte = schicht.querySelector('.tour-karte')
    schicht.querySelector('.tour-zahl').textContent = text('tourSchritt', { n: i + 1, von: SCHRITTE.length })
    schicht.querySelector('.tour-text').textContent = text(s.k)
    schicht.querySelector('.tour-weg').textContent = text('tourUeberspringen')
    schicht.querySelector('.tour-zurueck').textContent = text('tourZurueck')
    schicht.querySelector('.tour-zurueck').disabled = i === 0
    schicht.querySelector('.tour-weiter').textContent = text(i >= SCHRITTE.length - 1 ? 'tourFertig' : 'tourWeiter')
    const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null
    if (r && r.width > 0) {
      const p = 6
      schicht.classList.remove('ohne-loch')
      Object.assign(loch.style, { display: 'block', left: `${r.left - p}px`, top: `${r.top - p}px`, width: `${r.width + 2 * p}px`, height: `${r.height + 2 * p}px` })
      const unten = r.bottom + 12 + 180 < innerHeight
      const kb = Math.min(380, innerWidth - 32)
      Object.assign(karte.style, { left: `${Math.max(16, Math.min(r.left, innerWidth - kb - 16))}px`, top: unten ? `${r.bottom + 12}px` : `${Math.max(16, r.top - 12 - karte.offsetHeight)}px`, transform: 'none' })
    } else {
      loch.style.display = 'none'; schicht.classList.add('ohne-loch')
      Object.assign(karte.style, { left: '50%', top: '40%', transform: 'translate(-50%, -50%)' })
    }
  }
  async function gehe(n) {
    if (n < 0 || n >= SCHRITTE.length) return
    i = n
    try { if (SCHRITTE[i].vor) await SCHRITTE[i].vor() } catch (e) { console.warn('Tour', e) }
    const el = SCHRITTE[i].ziel && $(SCHRITTE[i].ziel)
    if (el && el.scrollIntoView) { el.scrollIntoView({ block: 'center' }); await warte(150) }
    setzen(); setzen()   // zweimal: Kartenhöhe erst nach dem Text bekannt
  }
  async function ende(frage = true) {
    speicherSchreiben('tourGesehen', '1')
    if (schicht) { schicht.remove(); schicht = null }
    document.removeEventListener('keydown', taste)
    if (uebung) {
      const u = uebung; uebung = null
      if (frage === 'loeschen' || (frage === true && confirm(text('tourLoeschen')))) {
        await api.studio('vorbereitetLoeschen', { gruppe: 'L', lua: u.lua, kennung: u.kennung })
        if (st.m && st.m.kennung === u.kennung && st.m.lua === u.lua) { st.m = null; st.projekt = null; $('editor').hidden = true }
        await modelleLaden()
      }
    }
  }
  function taste(e) {
    if (e.key === 'Escape') ende()
    else if (e.key === 'ArrowRight') schicht.querySelector('.tour-weiter').click()
    else if (e.key === 'ArrowLeft' && i > 0) gehe(i - 1)
  }
  function tourStart() {
    $('hilfeListe').hidden = true
    if (schicht) return
    aufbauen(); document.addEventListener('keydown', taste)
    gehe(0)
  }
  addEventListener('resize', () => { if (schicht) setzen() })
  $('tutorialAuf').addEventListener('click', tourStart)

  // ---------- Start ----------
  ;(async () => {
    await warte(800)   // Texte und Startseite zuerst
    schalterZeigen()
    const info = await api.startInfo()
    updatePruefen(info)
    if (!info.steuerung && speicherLesen('tourGesehen') !== '1') tourStart()
  })()
  window.tourSprache = schalterZeigen
  // Für die Steuerschnittstelle (Bilder fürs Wiki, Tests): Schritt zeigen bzw. beenden ohne Rückfrage
  window.tourSchritt = async (n) => { if (!schicht) { aufbauen(); document.addEventListener('keydown', taste) } await gehe(n) }
  window.tourEnde = (loeschen) => ende(loeschen ? 'loeschen' : false)
})()
