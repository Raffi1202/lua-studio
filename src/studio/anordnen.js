'use strict'
// «Automatisch anordnen» (ab 0.4.0, Konzeptblatt «Vorbereiten und Anordnen»): gleiche Abstände, Fläche füllen,
// Anordnung (was neben und unter was liegt) bleibt. Reine Funktionen, die Oberfläche ruft sie über IPC auf.
//
// anordnen({ ansicht, reserviert, G, art, mindest }) -> { ok, plaetze, hinweise } oder { ok: false, grund, index }
//   ansicht    { breite, hoehe, plaetze: [{ x, y, b, h, darstellung }] }
//   reserviert [{ x, y, b, h }] dieser Ansicht. Volle Bänder oben/unten werden abgezogen, andere bleiben feste Hindernisse.
//   G          Abstand zwischen Kästchen und zum Rand (px)
//   art        'gleich' (nebeneinander gleich breit, Zeilen im Höhenverhältnis), 'verhaeltnis' (alles im alten Verhältnis),
//              'verteilen' (Grössen bleiben, Lücken genau G, übriger Platz gleichmässig an die Ränder)
//   mindest    { darstellung: [b, h] } in px dieser Ansicht (schon umgerechnet); fehlt ein Eintrag, gilt 'zahl'
// raster({ ansicht, reserviert, G, mindest }) -> wie oben: alle Kästchen in Lesereihenfolge in ein gleichmässiges Raster.
//
// Gründe: 'leer', 'verschachtelt' (keine Zerlegung ohne Schnitt durch ein Kästchen), 'zuKlein' (index), 'zuEng',
// 'reserviert' (index; Kästchen liegt/läge auf einer reservierten Fläche), 'ueberlappt' (index, index2), 'rasterPasstNicht'.

function flaeche(a, reserviert) {
  let oben = 0, unten = a.hoehe
  const hindernisse = []
  for (const r of reserviert || []) {
    if (r.x <= 0 && r.x + r.b >= a.breite && r.y <= 0) oben = Math.max(oben, r.y + r.h)
    else if (r.x <= 0 && r.x + r.b >= a.breite && r.y + r.h >= a.hoehe) unten = Math.min(unten, r.y)
    else hindernisse.push({ x: r.x, y: r.y, b: r.b, h: r.h, fest: true })
  }
  return { oben, unten, hindernisse }
}

const ueberlappt = (p, q) => p.x < q.x + q.b && q.x < p.x + p.b && p.y < q.y + q.h && q.y < p.y + p.h

// Ganze Pixel: Grössen abrunden, Rest der Reihe nach an die grössten Nachkommastellen (Abstände bleiben genau)
function ganzePixel(werte, summe) {
  const ganz = werte.map(Math.floor)
  let rest = summe - ganz.reduce((n, v) => n + v, 0)
  const reihe = werte.map((v, k) => [v - Math.floor(v), k]).sort((p, q) => q[0] - p[0] || p[1] - q[1])
  for (let i = 0; rest > 0 && reihe.length; i = (i + 1) % reihe.length) { ganz[reihe[i][1]]++; rest-- }
  return ganz
}

// Gruppen entlang einer Achse: neue Gruppe, wenn ein Kästchen nach dem Ende aller bisherigen beginnt (1 px Toleranz)
function gruppieren(liste, lo, gr) {
  const s = [...liste].sort((p, q) => p[lo] - q[lo] || p[lo] + p[gr] - q[lo] - q[gr])
  const gruppen = []
  let g = [s[0]], ende = s[0][lo] + s[0][gr]
  for (const p of s.slice(1)) {
    if (p[lo] >= ende - 1) { gruppen.push(g); g = [p] } else g.push(p)
    ende = Math.max(ende, p[lo] + p[gr])
  }
  gruppen.push(g)
  return gruppen.map((g) => ({ g, a0: Math.min(...g.map((p) => p[lo])), a1: Math.max(...g.map((p) => p[lo] + p[gr])), fest: g.some((p) => p.fest) }))
}

// Vorprüfung: Kästchen auf einer reservierten Fläche oder Kästchen, die sich überlappen, lassen sich nicht zerlegen
function vorpruefen(a, reserviert) {
  for (let i = 0; i < a.plaetze.length; i++) {
    const p = a.plaetze[i]
    if ((reserviert || []).some((r) => ueberlappt(p, r))) return { ok: false, grund: 'reserviert', index: i }
    for (let j = i + 1; j < a.plaetze.length; j++) if (ueberlappt(p, a.plaetze[j])) return { ok: false, grund: 'ueberlappt', index: i, index2: j }
  }
  return null
}

// «Nur verteilen»: Grössen bleiben, alle Lücken zwischen Kästchen genau G. Der übrige freie Platz geht gleichmässig an
// beide Ränder (Inhalt mittig). Neben einer reservierten Fläche liegt der Abschnitt bündig im Abstand G an ihr.
function nurVerteilen(items, r, G) {
  // gepackte Grösse einer Liste entlang gr (Kästchen in ihrer Grösse, Lücken G)
  function gepackt(liste, gr) {
    if (liste.length === 1) return liste[0][gr]
    for (const lo of ['y', 'x']) {
      const g2 = lo === 'x' ? 'b' : 'h'
      const gruppen = gruppieren(liste, lo, g2)
      if (gruppen.length < 2) continue
      const m = gruppen.map((x) => (x.fest && g2 === gr ? x.a1 - x.a0 : gepackt(x.g, gr)))
      return g2 === gr ? m.reduce((n, v) => n + v, 0) + G * (gruppen.length - 1) : Math.max(...m)
    }
    return null
  }
  let fehler = null
  // legt liste in die Zelle r: entlang jeder Achse mittig, ausser an festen Flächen
  function rek(liste, r) {
    if (fehler) return true
    if (liste.length === 1) {
      const p = liste[0]
      if (!p.fest) { p.x = Math.round(r.x + (r.b - p.b) / 2); p.y = Math.round(r.y + (r.h - p.h) / 2) }
      return true
    }
    for (const lo of ['y', 'x']) {
      const gr = lo === 'x' ? 'b' : 'h'
      const gruppen = gruppieren(liste, lo, gr)
      if (gruppen.length < 2) continue
      const groesse = gruppen.map((x) => (x.fest ? x.a1 - x.a0 : gepackt(x.g, gr)))
      if (groesse.some((v) => v === null)) return false
      const lagen = new Array(gruppen.length)
      let abschnitt = [], von = r[lo], festDavor = false
      const lege = (bis, festDanach) => {
        if (!abschnitt.length) return
        const summe = abschnitt.reduce((n, k) => n + groesse[k], 0) + G * (abschnitt.length - 1)
        const frei = bis - von - summe - (festDavor ? G : 0) - (festDanach ? G : 0)
        if (frei < 0) { fehler = { grund: 'zuEng' }; return }
        let pos = von + (festDavor ? G : festDanach ? frei : frei / 2)
        for (const k of abschnitt) { lagen[k] = Math.round(pos); pos += groesse[k] + G }
      }
      gruppen.forEach((x, k) => {
        if (!x.fest) { abschnitt.push(k); return }
        lege(x.a0, true); abschnitt = []; lagen[k] = x.a0; von = x.a1; festDavor = true
      })
      lege(r[lo] + r[gr], false)
      if (fehler) return true
      gruppen.forEach((x, k) => {
        const rr = { ...r }; rr[lo] = lagen[k]; rr[gr] = groesse[k]
        if (!x.fest) rek(x.g, rr)
        else if (x.g.length > 1) rek(x.g, { ...rr, [lo]: x.a0, [gr]: x.a1 - x.a0 })
      })
      return true
    }
    return false
  }
  const ok = rek(items, r)
  return fehler ? { fehler } : { ok }
}

function anordnen({ ansicht, reserviert, G, art = 'gleich', mindest = {} }) {
  const a = ansicht
  if (!a || !Array.isArray(a.plaetze) || !a.plaetze.length) return { ok: false, grund: 'leer' }
  const vor = vorpruefen(a, reserviert)
  if (vor) return vor
  G = Math.max(0, Math.round(Number(G) || 0))
  const { oben, unten, hindernisse } = flaeche(a, reserviert)
  const items = a.plaetze.map((p, i) => ({ x: p.x, y: p.y, b: p.b, h: p.h, i, d: p.darstellung || 'zahl' })).concat(hindernisse)
  if (art === 'verteilen') {
    // Passt der Abstand nicht (Kästchen liegen enger), den grössten kleineren nehmen, der passt, und das melden
    for (let g = G; g >= 0; g--) {
      const kopie = items.map((p) => ({ ...p }))
      const r = nurVerteilen(kopie, { x: g, y: oben + g, b: a.breite - 2 * g, h: unten - oben - 2 * g }, g)
      if (!r.fehler && !r.ok) return { ok: false, grund: 'verschachtelt' }
      if (r.fehler) continue
      const lagen = []
      for (const p of kopie) if (!p.fest) lagen[p.i] = { x: p.x, y: p.y, b: p.b, h: p.h }
      const e = pruefen(a, lagen, reserviert, mindest, g < G ? ['abstandKleiner'] : [])
      if (e.ok) e.abstand = g
      return e
    }
    return { ok: false, grund: 'zuEng' }
  }
  // Kleinste Ausdehnung einer Gruppe entlang einer Achse (Mindestgrössen und Abstände der Kästchen darin)
  const mind = (p, gr) => p.fest ? p[gr] : ((mindest[p.d] || mindest.zahl || [1, 1])[gr === 'b' ? 0 : 1])
  function kleinste(liste, gr) {
    if (liste.length === 1) return mind(liste[0], gr)
    for (const lo of ['y', 'x']) {
      const g2 = lo === 'x' ? 'b' : 'h'
      const gruppen = gruppieren(liste, lo, g2)
      if (gruppen.length < 2) continue
      const m = gruppen.map((x) => kleinste(x.g, gr))
      return g2 === gr ? m.reduce((n, v) => n + v, 0) + G * (gruppen.length - 1) : Math.max(...m)
    }
    return Math.max(...liste.map((p) => mind(p, gr)))
  }
  const start = { x: G, y: oben + G, b: a.breite - 2 * G, h: unten - oben - 2 * G }
  const out = []
  const hinweise = new Set()
  let fehler = null

  function teile(liste, r) {
    if (fehler) return true
    if (liste.length === 1) {
      const p = liste[0]
      if (!p.fest) out[p.i] = { ...r }
      return true
    }
    for (const lo of ['y', 'x']) {
      const gr = lo === 'x' ? 'b' : 'h'
      const gruppen = gruppieren(liste, lo, gr)
      if (gruppen.length < 2) continue
      if (lo === 'x' && gruppen.some((x) => x.fest)) hinweise.add('festeSpalte')
      // Abschnitte zwischen festen Gruppen: feste Gruppen bleiben an ihrer Stelle und in ihrer Grösse
      const lagen = new Array(gruppen.length)
      let abschnitt = [], von = r[lo]
      const abschnittVerteilen = (bis) => {
        if (!abschnitt.length) return
        const n = abschnitt.length
        const ausdehnung = abschnitt.map((k) => gruppen[k].a1 - gruppen[k].a0)
        const laenge = bis - von
        const verfuegbar = laenge - G * (n - 1)
        if (verfuegbar < n) { fehler = { grund: 'zuEng' }; return }
        // Gewichte: gleich breit bzw. altes Verhältnis; Kästchen an ihrer Mindestgrösse festhalten, Rest auf die anderen
        const gewicht = art === 'gleich' && lo === 'x' ? ausdehnung.map(() => 1) : ausdehnung.map((v) => Math.max(v, 1))
        const unten = abschnitt.map((k) => kleinste(gruppen[k].g, gr))
        const roh = new Array(n).fill(0)
        const fix = new Array(n).fill(false)
        for (let runde = 0; runde <= n; runde++) {
          const rest = verfuegbar - unten.reduce((s, v, j) => s + (fix[j] ? v : 0), 0)
          const gw = gewicht.reduce((s, v, j) => s + (fix[j] ? 0 : v), 0) || 1
          let neu = false
          for (let j = 0; j < n; j++) {
            roh[j] = fix[j] ? unten[j] : (gewicht[j] * rest) / gw
            if (!fix[j] && roh[j] < unten[j]) { fix[j] = true; neu = true }
          }
          if (!neu) break
        }
        // Reicht der Platz nicht einmal für die Mindestgrössen: das erste Kästchen des Abschnitts nennen
        if (unten.reduce((s2, v) => s2 + v, 0) > verfuegbar || roh.some((v) => v < 0)) {
          const p = gruppen[abschnitt[0]].g.find((q) => !q.fest)
          fehler = p ? { grund: 'zuKlein', index: p.i, mindest: mindest[p.d] || mindest.zahl || [1, 1] } : { grund: 'zuEng' }
          return
        }
        const ganz = ganzePixel(roh, verfuegbar)
        let pos = von
        abschnitt.forEach((k, j) => { lagen[k] = [pos, ganz[j]]; pos += ganz[j] + G })
      }
      gruppen.forEach((x, k) => {
        if (!x.fest) { abschnitt.push(k); return }
        abschnittVerteilen(x.a0 - G)
        abschnitt = []
        lagen[k] = [x.a0, x.a1 - x.a0]
        von = x.a1 + G
      })
      abschnittVerteilen(r[lo] + r[gr])
      if (fehler) return true
      gruppen.forEach((x, k) => { const rr = { ...r }; rr[lo] = lagen[k][0]; rr[gr] = lagen[k][1]; teile(x.g, rr) })
      return true
    }
    return false
  }

  if (!teile(items, start)) return { ok: false, grund: 'verschachtelt' }
  if (fehler) return { ok: false, ...fehler }
  const e = pruefen(a, out, reserviert, mindest, [...hinweise])
  if (e.ok) e.abstand = G
  return e
}

// Mindestgrössen, Rand und reservierte Flächen prüfen; plaetze = neue Lagen in der Reihenfolge der Ansicht
function pruefen(a, lagen, reserviert, mindest, hinweise) {
  for (let i = 0; i < a.plaetze.length; i++) {
    const q = lagen[i]
    if (!q) return { ok: false, grund: 'verschachtelt' }
    const [mb, mh] = mindest[a.plaetze[i].darstellung || 'zahl'] || mindest.zahl || [1, 1]
    // Nur sperren, wenn das Kästchen kleiner wird als erlaubt (war es schon vorher zu klein und wird nicht kleiner, bleibt es)
    const p = a.plaetze[i]
    if ((q.b < mb && q.b < p.b) || (q.h < mh && q.h < p.h)) return { ok: false, grund: 'zuKlein', index: i, mindest: [mb, mh] }
    if (q.x < 0 || q.y < 0 || q.x + q.b > a.breite || q.y + q.h > a.hoehe) return { ok: false, grund: 'zuEng', index: i }
    if ((reserviert || []).some((r) => ueberlappt(q, r))) return { ok: false, grund: 'reserviert', index: i }
  }
  return { ok: true, plaetze: a.plaetze.map((p, i) => ({ ...p, ...lagen[i] })), hinweise }
}

// «Neu im Raster»: Lesereihenfolge (Zeilen von oben, darin von links), Spaltenzahl so, dass alle Mindestgrössen
// mit möglichst viel Reserve passen; Zellen auf festen Hindernissen bleiben leer.
function raster({ ansicht, reserviert, G, mindest = {} }) {
  const a = ansicht
  if (!a || !Array.isArray(a.plaetze) || !a.plaetze.length) return { ok: false, grund: 'leer' }
  G = Math.max(0, Math.round(Number(G) || 0))
  const { oben, unten, hindernisse } = flaeche(a, reserviert)
  const n = a.plaetze.length
  const reihenfolge = a.plaetze.map((p, i) => ({ p, i })).sort((u, v) => (u.p.y + u.p.h / 2) - (v.p.y + v.p.h / 2) || u.p.x - v.p.x)
  // Zeilen erkennen: Mittelpunkte, die in der Höhe überlappen, gehören zur selben Zeile; darin nach x
  const zeilen = []
  for (const e of reihenfolge) {
    const m = e.p.y + e.p.h / 2
    const z = zeilen.find((z) => m >= z.oben && m <= z.unten)
    if (z) z.k.push(e); else zeilen.push({ oben: e.p.y, unten: e.p.y + e.p.h, k: [e] })
  }
  const folge = zeilen.flatMap((z) => z.k.sort((u, v) => u.p.x - v.p.x))
  const mind = (p) => mindest[p.darstellung || 'zahl'] || mindest.zahl || [1, 1]
  let best = null
  for (let sp = 1; sp <= n; sp++) {
    for (let ze = Math.ceil(n / sp); ze <= n + hindernisse.length * 2; ze++) {
      const b = (a.breite - (sp + 1) * G) / sp, h = (unten - oben - (ze + 1) * G) / ze
      if (b < 1 || h < 1) break
      const bs = ganzePixel(new Array(sp).fill(b), a.breite - (sp + 1) * G)
      const hs = ganzePixel(new Array(ze).fill(h), unten - oben - (ze + 1) * G)
      const zellen = []
      let y = oben + G
      for (let r = 0; r < ze; r++) {
        let x = G
        for (let c = 0; c < sp; c++) { const z = { x, y, b: bs[c], h: hs[r] }; if (!hindernisse.some((o) => ueberlappt(z, o))) zellen.push(z); x += bs[c] + G }
        y += hs[r] + G
      }
      if (zellen.length < n) continue
      let reserve = Infinity
      folge.forEach((e, k) => { const [mb, mh] = mind(e.p); reserve = Math.min(reserve, zellen[k].b / mb, zellen[k].h / mh) })
      if (reserve >= 1 && (!best || reserve > best.reserve + 1e-9)) best = { reserve, zellen }
      break // mehr Zeilen machen die Zellen nur flacher
    }
  }
  if (!best) return { ok: false, grund: 'rasterPasstNicht' }
  const lagen = []
  folge.forEach((e, k) => { lagen[e.i] = best.zellen[k] })
  const r = pruefen(a, lagen, reserviert, mindest, [])
  // Letzte Zeile unvollständig (weniger Kästchen als Zellen, z. B. neben einer reservierten Fläche): ihre Kästchen
  // über den freien Platz dieser Zeile verteilen. Passt das nicht (Mindestgrösse), bleibt das gleichmässige Raster.
  if (!r.ok) return r
  const breiter = letzteZeileFuellen(a, best.zellen.slice(0, n), hindernisse, G)
  if (!breiter) return r
  const lagen2 = []
  folge.forEach((e, k) => { lagen2[e.i] = breiter[k] })
  const r2 = pruefen(a, lagen2, reserviert, mindest, [])
  return r2.ok ? r2 : r
}

// Zellen der letzten belegten Zeile neu: freie Abschnitte der Zeile (ohne Hindernisse, Abstand G) bestimmen, die Kästchen
// nach Länge auf die Abschnitte verteilen (grösste Reste zuerst) und darin gleich breit setzen. null = nichts zu tun.
function letzteZeileFuellen(a, benutzt, hindernisse, G) {
  const y = benutzt[benutzt.length - 1].y
  const k = benutzt.filter((z) => z.y === y).length
  const h = benutzt[benutzt.length - 1].h
  const band = { y, h }
  // freie Abschnitte von G bis breite − G, Hindernisse in der Höhe der Zeile mit Abstand G ausgespart
  let frei = [[G, a.breite - G]]
  for (const o of hindernisse) {
    if (!(o.y < band.y + band.h && band.y < o.y + o.h)) continue
    const von = o.x - G, bis = o.x + o.b + G
    frei = frei.flatMap(([x0, x1]) => [[x0, Math.min(x1, von)], [Math.max(x0, bis), x1]].filter(([u, v]) => v - u > 0))
  }
  const laenge = (f) => f[1] - f[0]
  const gesamt = frei.reduce((t, f) => t + laenge(f), 0)
  if (!frei.length || gesamt <= 0) return null
  // Anzahl je Abschnitt nach Länge (grösste Reste), jeder Abschnitt nur so viele, wie hineinpassen
  const roh = frei.map((f) => (k * laenge(f)) / gesamt)
  const anz = roh.map(Math.floor)
  let rest = k - anz.reduce((t, v) => t + v, 0)
  roh.map((v, i) => [v - Math.floor(v), i]).sort((p, q) => q[0] - p[0] || p[1] - q[1]).forEach(([, i]) => { if (rest > 0) { anz[i]++; rest-- } })
  const neu = []
  frei.forEach((f, i) => {
    if (!anz[i]) return
    const platz = laenge(f) - G * (anz[i] - 1)
    const bs = ganzePixel(new Array(anz[i]).fill(platz / anz[i]), platz)
    let x = f[0]
    for (const b of bs) { neu.push({ x, y, b, h }); x += b + G }
  })
  if (neu.length !== k || neu.some((z) => z.b < 1)) return null
  // Nichts gewonnen (volle Zeile ohne Hindernis): Raster bleibt
  const alt = benutzt.filter((z) => z.y === y)
  if (alt.every((z, i) => z.x === neu[i].x && z.b === neu[i].b)) return null
  return benutzt.filter((z) => z.y !== y).concat(neu)
}

module.exports = { anordnen, raster, flaeche, ganzePixel }
