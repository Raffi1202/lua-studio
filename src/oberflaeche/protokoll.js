'use strict'
// Hilfe-Menü und Fenster «Fehlerprotokoll»: anzeigen, Stufe, Ordner öffnen, ZIP für den Support, löschen.
// Nutzt $, api und T aus app.js.

;(() => {
  const fenster = $('protokollFenster')
  const liste = $('hilfeListe')
  const meldung = (t) => { $('protokollMeldung').textContent = t || '' }
  const text = (k, w = {}) => String(T[k] || k).replace(/\{(\w+)\}/g, (_, n) => (w[n] !== undefined ? w[n] : ''))

  async function laden() {
    const r = await api.protokoll('lesen')
    const pre = $('protokollText')
    pre.textContent = r.text || text('protokollLeer')
    pre.scrollTop = pre.scrollHeight
    $('protokollStufe').value = r.stufe
    $('protokollOrdner').textContent = r.ordner
    meldung(r.stufe === 'aus' ? text('protokollAusHinweis') : '')
  }

  async function zeigen() {
    liste.hidden = true
    if (!fenster.open) fenster.showModal()
    meldung('')
    await laden()
  }

  $('hilfeKnopf').addEventListener('click', (e) => { e.stopPropagation(); liste.hidden = !liste.hidden })
  document.addEventListener('click', () => { liste.hidden = true })
  $('protokollAuf').addEventListener('click', zeigen)
  api.beiProtokollZeigen(zeigen)
  $('protokollZu').addEventListener('click', () => fenster.close())
  $('protokollNeu').addEventListener('click', laden)
  $('protokollStufe').addEventListener('change', async (e) => { await api.protokoll('stufe', e.target.value); await laden() })
  $('protokollOrdnerAuf').addEventListener('click', () => api.protokoll('ordner'))
  $('protokollLoeschen').addEventListener('click', async () => {
    if (!window.confirm(text('protokollLoeschenFrage'))) return
    await api.protokoll('loeschen')
    await laden()
  })
  $('protokollSupport').addEventListener('click', async () => {
    const knopf = $('protokollSupport')
    knopf.disabled = true
    try {
      const r = await api.protokoll('support')
      await laden().catch(() => {})
      if (!r.ok && !r.abgebrochen) meldung(text('protokollFehler', { f: r.fehler }))
      if (r.ok) meldung(text('protokollGespeichert', { pfad: r.pfad, n: r.dateien, i: r.infos }))
    } finally { knopf.disabled = false }
  })

  // Reiterwechsel (ausführlich); die Sprache meldet app.js beim Setzen
  document.querySelectorAll('[data-reiter]').forEach((b) => b.addEventListener('click', () => api.protokoll('melden', { art: 'ausfuehrlich', text: `Reiter ${b.dataset.reiter}` })))
})()
