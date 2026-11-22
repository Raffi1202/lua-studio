'use strict'
// Brücke für die Steuerschnittstelle (ab 0.10.0, src/main/steuerung.js). Der Hauptprozess ruft window.__steuerung.* nur auf,
// wenn Lua-Studio mit --steuerung gestartet wurde. Alle Befehle nutzen dieselben Funktionen wie die Knöpfe der Oberfläche.
// Nutzt Globale aus app.js (zustand, statusWert, info, spracheSetzen, verbindenKnopf, anschluesseSuchen) und studio.js (st, …).

;(() => {
  const text = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : '' }
  const liste = (id) => [...document.querySelectorAll(`#${id} li`)].map((l) => ({ stufe: l.className || '', text: l.textContent }))
  const anschluss = (v) => String(v || '').replace(/(usbmodem|usbserial-?|wchusbserial|SLAB_USBtoUART|serial-?)[0-9A-Za-z_-]{4,}$/i, '$1…')
  const reiterAktiv = () => { const r = document.querySelector('[data-reiter].aktiv'); return r ? r.dataset.reiter : null }
  const unterAktiv = () => { const u = document.querySelector('[data-unter].aktiv'); return u ? u.dataset.unter : null }
  const warte = (ms) => new Promise((r) => setTimeout(r, ms))

  function platzDaten(p, i) {
    return { index: i, x: p.x, y: p.y, b: p.b, h: p.h, w: p.w, darstellung: p.darstellung || 'zahl', titel: p.titel, symbol: p.symbol, symbolPx: p.symbolPx, zusatz: p.zusatz, farbe: p.farbe }
  }

  function zustandDaten() {
    const a = st.projekt ? ansichtAktuell() : null
    return {
      sprache,
      verbindung: { zustand, status: statusWert, funke: info && (info.board || info.funke) || null, anschluss: anschluss(document.getElementById('ziel').value) },
      quelle: st.quelle ? { art: st.quelle.art, text: st.quelle.text } : null,
      modelle: (st.modelle || []).map((m) => ({ kennung: m.kennung, lua: m.lua, modell: m.info && m.info.modell, vorbereitet: !!m.vorbereitet, studioDatei: !!m.studioDatei, altLua: m.altLua || null })),
      offen: st.m ? { kennung: st.m.kennung, lua: st.m.lua, vorbereitet: !!st.m.vorbereitet, luaVersion: st.m.info && st.m.info.luaVersion, funke: funkeAnzeige(st.m.info && st.m.info.funke) } : null,
      reiter: reiterAktiv(),
      unterreiter: unterAktiv(),
      ansicht: a ? { index: st.ansicht, breite: a.breite, hoehe: a.hoehe } : null,
      ansichten: st.projekt ? st.projekt.ansichten.map((x) => ({ breite: x.breite, hoehe: x.hoehe, plaetze: x.plaetze.length })) : [],
      plaetze: a ? a.plaetze.map(platzDaten) : [],
      vorlagen: (st.presets || []).map((p) => ({ s: p.s, name: name(p.name) })),
      grenzen: st.projekt ? st.projekt.grenzen : {},
      warnungen: [text('anordnungMeldung'), text('quelleMeldung'), text('motorAusBand')].filter(Boolean),
      waechter: text('waechter'),
      schritte: liste('schritte'),
      schnelltest: liste('schnelltestListe'),
      ziele: st.exportZiele ? st.exportZiele.map((z) => z.text) : [],
    }
  }

  function vorschauDaten() {
    if (!st.projekt) return { ok: false, fehler: 'keinModell' }
    const a = ansichtAktuell()
    const probleme = anordnungPruefen(a)
    return { ok: true, breite: a.breite, hoehe: a.hoehe, plaetze: a.plaetze.map(platzDaten), probleme: [...probleme.entries()].map(([i, grund]) => ({ index: i, grund })),
      reserviert: reserviert(a).map((r) => ({ x: r.x, y: r.y, b: r.b, h: r.h, was: name(r.was || r.name) })), deko: (a.deko || []).length }
  }

  // Befehle: dieselben Abläufe wie die Knöpfe; Rückfragen (confirm) gelten als «ja», Meldungen (alert) kommen zurück
  // Nur Felder, die die Eigenschaften-Felder der Oberfläche auch setzen (kein __proto__ o. ä.)
  const PLATZ_FELDER = ['x', 'y', 'b', 'h', 'w', 'darstellung', 'titel', 'min', 'max', 'farbe', 'farbeWarn', 'farbeAlarm', 'hintergrund', 'stufen', 'einheitZeigen', 'zusatz']
  const GRENZ_FELDER = ['richtung', 'warnung', 'alarm', 'ansage', 'vibration', 'aus', 'beiMotorAus']
  const BEFEHLE = {
    async anschluesseSuchen() { await anschluesseSuchen(); return { ziele: [...document.getElementById('ziel').options].map((o) => o.value).filter(Boolean) } },
    async verbinden({ ziel }) {
      if (ziel !== undefined) { document.getElementById('ziel').value = ziel; zielGeaendert() }
      if (zustand !== 'verbunden') await verbindenKnopf()
      for (let i = 0; i < 40 && !['verbunden', 'getrennt', 'fehler'].includes(zustand); i++) await warte(250)
      return { zustand }
    },
    async trennen() { await api.trennen(); return { zustand } },
    async sprache({ wert }) { await spracheSetzen(wert); return { sprache } },
    async reiter({ name: n }) {
      const k = document.querySelector(`[data-reiter="${n}"]`) || document.querySelector(`[data-unter="${n}"]`)
      if (!k) throw new Error('reiter')
      k.click(); await warte(300); return { reiter: reiterAktiv(), unterreiter: unterAktiv() }
    },
    async quelle({ index, text: t2 }) {
      document.querySelector('[data-reiter="studio"]').click(); await warte(300)
      const sel = document.getElementById('quelle')
      const o = [...sel.options].find((x, i) => (index !== undefined ? i === index : x.textContent.includes(t2)))
      if (!o) throw new Error('quelle')
      sel.value = o.value; sel.dispatchEvent(new Event('change')); await warte(200); return { quelle: st.quelle && st.quelle.text }
    },
    async modelleLaden() {
      const q = st.quellen[Number(document.getElementById('quelle').value)]
      if (q && q.art === 'ordner' && !q.pfad) throw new Error('quelle: zuerst «ordner» mit Pfad wählen')
      await modelleLaden(); return { modelle: st.modelle.length, meldung: text('quelleMeldung') } },
    async modellOeffnen({ kennung, lua }) {
      const m = (st.modelle || []).find((x) => x.kennung === kennung && (!lua || x.lua === lua))
      if (!m) throw new Error('modell')
      await modellOeffnen(m); await warte(300); return { offen: st.m && st.m.kennung }
    },
    async vorbereiten({ gruppe = 'L', lua, name: n }) {
      document.querySelector('[data-reiter="studio"]').click(); await warte(200)
      const r = await api.studio('vorbereitetNeu', { gruppe, lua, modellname: n })
      if (!r.ok) return r
      // wie «+ Vorbereiten»: Quelle «Vorbereitet» wählen, dann laden (sonst fragte «Modelle laden» nach einem Ordner)
      await quellenSuchen()
      document.getElementById('quelle').value = String(st.quellen.findIndex((q) => q.art === 'vorbereitet'))
      await modelleLaden()
      const m = st.modelle.find((x) => x.kennung === r.modell.kennung && x.lua === r.modell.lua && x.info.funke === r.modell.info.funke)
      if (m) await modellOeffnen(m)
      await warte(300); return { ok: true, kennung: r.modell.kennung }
    },
    async ansicht({ index, breite, hoehe }) {
      const i = index !== undefined ? index : st.projekt.ansichten.findIndex((a) => a.breite === breite && a.hoehe === hoehe)
      if (i < 0 || !st.projekt.ansichten[i]) throw new Error('ansicht')
      const sel = document.getElementById('ansicht'); sel.value = String(i); sel.dispatchEvent(new Event('change'))   // wie die Auswahl
      return { ansicht: i }
    },
    async tour({ schritt }) {   // Tutorial-Tour: Schritt 0–7 zeigen; ohne Schritt beenden (Übungsmodell löschen)
      if (schritt === undefined) { await window.tourEnde(true); return { ende: true } }
      await window.tourSchritt(Number(schritt)); await warte(300); return { schritt: Number(schritt) }
    },
    async rueckgaengig() { rueckgaengig(); await warte(100); return { plaetze: ansichtAktuell().plaetze.map(platzDaten), titel: $('rueckgaengig').title, wiederholen: $('wiederholen').title } },
    async wiederholen() { wiederholen(); await warte(100); return { plaetze: ansichtAktuell().plaetze.map(platzDaten), titel: $('rueckgaengig').title } },
    async vorlage({ s }) { document.getElementById('presetWahl').value = 'p:' + s; await presetAnwenden(); await warte(300); return { plaetze: ansichtAktuell().plaetze.length } },
    async anordnen({ art = 'gleich', abstand }) {
      document.getElementById('anordnenArt').value = art
      if (abstand !== undefined) document.getElementById('abstandG').value = String(abstand)
      await anordnenStart(); return { meldung: text('anordnungMeldung'), plaetze: ansichtAktuell().plaetze.map(platzDaten) }
    },
    // Kästchen wählen wie ein Klick; gibt die Kennungen der Eigenschaften-Felder zurück
    async waehle({ index }) {
      if (!ansichtAktuell().plaetze[index]) throw new Error('platz')
      st.gewaehlt = index; st.gewaehltDeko = -1; flaecheZeigen(); eigenschaftenZeigen()
      return { felder: [...document.querySelectorAll('[id^="eig-"]')].map((e) => ({ id: e.id, name: e.getAttribute('name'), label: e.getAttribute('aria-label'), art: e.tagName.toLowerCase() })) }
    },
    async platzNeu() { platzNeu(); return { anzahl: ansichtAktuell().plaetze.length } },
    async platzWeg({ index }) { st.gewaehlt = index; st.gewaehltDeko = -1; platzWeg(); return { anzahl: ansichtAktuell().plaetze.length } },
    async platz({ index, ...werte }) {
      const p = ansichtAktuell().plaetze[index]
      if (!p) throw new Error('platz')
      for (const [k, v] of Object.entries(werte)) {
        if (!PLATZ_FELDER.includes(k)) throw new Error(`feld ${k}`)
        if (v === null) delete p[k]; else p[k] = v
      }
      allesZeigen(); geaendert(); return platzDaten(p, index)
    },
    async grenze({ wert, ...felder }) {
      const b = beschreibung() || {}
      const werk = ((b.standard && b.standard.grenzen) || {})[wert] || {}
      const neu = { ...(st.projekt.grenzen[wert] || werk) }
      if (!wertInfo(wert) && !st.projekt.grenzen[wert]) throw new Error('wert')
      for (const [k, v] of Object.entries(felder)) {
        if (!GRENZ_FELDER.includes(k)) throw new Error(`feld ${k}`)
        if (v === null) delete neu[k]; else neu[k] = v
      }
      st.projekt.grenzen[wert] = neu; geaendert(); grenzenZeigen(); return { [wert]: neu }
    },
    // Export-Ziel wie «Ordner wählen …» (dieselbe Funktion; der Pfad ersetzt den Dialog)
    async ordner({ pfad }) {
      if (!pfad) throw new Error('pfad')
      const p = await api.studio('ordnerWaehlen', String(pfad))
      st.exportSpec = p ? { art: 'ordner', pfad: p, text: `${t('quelleOrdner')}: ${p}` } : null
      await exportZieleZeigen(); uebertragenZeigen(); return { ziel: st.exportSpec && st.exportSpec.text }
    },
    async uebertragen() {
      document.querySelector('[data-unter="uebertragen"]').click(); await warte(300)
      await uebertragenStart(); await warte(500); return { schritte: liste('schritte') }
    },
    async speichernDatei({ pfad, fuerAlle: alle }) {   // fuerAlle: true = «Für alle Modelle (Standard)»
      if (!pfad) throw new Error('pfad')
      document.querySelector('[data-unter="uebertragen"]').click(); await warte(300)
      if (alle !== undefined) { $('fuerAlle').value = alle ? 'alle' : 'modell'; fuerAlleZeigen() }
      await exportDatei(String(pfad)); await warte(200)
      return { schritte: liste('schritte'), kennung: zielKennung(), hinweis: $('fuerAlleHinweis').textContent }
    },
    async schnelltest() { await schnelltest(); return { punkte: liste('schnelltestListe') } },
  }

  async function ausfuehren({ name: n, args }) {
    const f = BEFEHLE[n]
    if (!f) return { ok: false, fehler: 'befehl', befehle: Object.keys(BEFEHLE) }
    const meldungen = []
    const c = window.confirm, a = window.alert
    window.confirm = (m) => { meldungen.push(String(m)); return true }
    window.alert = (m) => { meldungen.push(String(m)) }
    try { return { ok: true, ...(await f(args || {})), meldungen } } catch (e) { return { ok: false, fehler: String(e && e.message || e), meldungen } } finally { window.confirm = c; window.alert = a }
  }

  window.__steuerung = { zustand: zustandDaten, vorschau: vorschauDaten, ausfuehren }
})()
