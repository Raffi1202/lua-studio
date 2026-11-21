'use strict'
// Vorschau wie im Lua (ab 0.6.0): die Zeichenregeln der Luas (ansicht.lua / zeichnen.lua der veröffentlichten Versionen)
// in SVG nachgebaut. Masse, Abstände und Farben wie im Lua; die Zeilenhöhen der Ethos-Schriften sind aus Simulatorbildern
// der X18RS abgeleitet (Annäherung, Text kann 1–2 px abweichen). Ohne passenden Stil zeichnet studio.js die einfache Vorschau.
// Schnittstelle: LUA_VORSCHAU.stil(lua) -> null oder { hintergrund, flaeche(svg, a, kontext), platz(svg, b, h, info, kontext) }

;(() => {
  const NS = 'http://www.w3.org/2000/svg'
  // Zeilenhöhe der Ethos-Schriften XXS … XXL am X18RS in px (angenähert)
  const SCHRIFT = [12, 14, 17, 20, 25, 34, 42]
  const FAMILIE = "'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', sans-serif"
  const messer = document.createElement('canvas').getContext('2d')
  const em = (h) => Math.round(h * 0.95)
  const textBreite = (t, h) => { messer.font = `${em(h)}px ${FAMILIE}`; return messer.measureText(String(t)).width }
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('')
  const { floor, max, min } = Math

  // Layout wie Z.layout der Luas (Kompaktfenster: Massstab 0,72)
  function layout(W, H, kopfVoll = 56, kopfKompakt = 47) {
    const kompakt = H < W * 0.5 || W < 400 || H < 250
    const s = kompakt ? min(W / 784, H / 316) * 0.72 : min(W / 800, H / 480)
    return { W, H, s, kompakt, kh: floor((kompakt ? kopfKompakt : kopfVoll) * s) }
  }

  // Zeichenwerkzeug auf einem SVG, gleiche Aufrufe wie Z.* in den Luas
  function zeichner(svg, L) {
    const neu = (tag, attr) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v); svg.appendChild(e); return e }
    const Z = {
      L,
      rechteck(x, y, b, h, f) { if (b < 1 || h < 1) return; neu('rect', { x: floor(x), y: floor(y), width: floor(b + 0.5), height: floor(h + 0.5), fill: f }) },
      rund(x, y, b, h, r, f) {
        x = floor(x); y = floor(y); b = floor(b); h = floor(h); r = floor(r)
        if (b < 1 || h < 1) return
        if (r * 2 + 1 > h) r = floor((h - 1) / 2)
        if (r * 2 + 1 > b) r = floor((b - 1) / 2)
        neu('rect', { x, y, width: b, height: h, rx: max(0, r), fill: f })
      },
      // Winkel in Grad, 0 = oben, im Uhrzeigersinn; Ring zwischen r1 und r2
      bogen(cx, cy, r1, r2, a0, a1, f) {
        if (a1 <= a0) return
        if (a1 - a0 >= 360) a1 = a0 + 359.9
        const p = (r, a) => { const w = (a - 90) * Math.PI / 180; return `${cx + r * Math.cos(w)} ${cy + r * Math.sin(w)}` }
        const gross = a1 - a0 > 180 ? 1 : 0
        neu('path', { d: `M ${p(r2, a0)} A ${r2} ${r2} 0 ${gross} 1 ${p(r2, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 ${gross} 0 ${p(r1, a0)} Z`, fill: f })
      },
      linie(x1, y1, x2, y2, f) { neu('line', { x1, y1, x2, y2, stroke: f, 'stroke-width': 1 }) },
      // Text mit senkrechter Mitte ym wie Z.text: Schrift nach gr × 1,25 × s, bei Bedarf kleiner bis maxB passt
      text(x, ym, t, gr, f, ausr = 'start', maxB, fett) {
        if (t === null || t === undefined || t === '') return [0, 0]
        t = String(t)
        const ziel = gr * 1.25 * L.s + 0.5
        let i = 0
        for (let k = 1; k < SCHRIFT.length; k++) if (SCHRIFT[k] <= ziel) i = k
        let b = textBreite(t, SCHRIFT[i])
        if (maxB) while (b > maxB && i > 0) { i--; b = textBreite(t, SCHRIFT[i]) }
        const h = SCHRIFT[i]
        const y = floor(ym - h / 2) + h * 0.8
        for (const dx of fett ? [0, 1] : [0]) {
          const e = neu('text', { x: floor(x) + dx, y, fill: f, 'font-size': em(h), 'font-family': FAMILIE, 'text-anchor': ausr })
          e.textContent = t
        }
        return [b, h]
      },
      breite(t, gr) {
        const ziel = gr * 1.25 * L.s + 0.5
        let i = 0
        for (let k = 1; k < SCHRIFT.length; k++) if (SCHRIFT[k] <= ziel) i = k
        return textBreite(t, SCHRIFT[i])
      },
    }
    return Z
  }

  // ---------- Electric 0.6.1 (src/electric/ansicht.lua, zeichnen.lua) ----------
  const ELECTRIC_C = {
    bg: [8, 16, 34], kachel: [21, 34, 62], rand: [44, 62, 100], linie: [36, 52, 88], weiss: [255, 255, 255], titel: [214, 222, 236],
    grau: [150, 164, 190], spur: [38, 82, 150], gelb: [245, 197, 24], hblau: [168, 212, 242], orange: [242, 140, 30], rot: [239, 60, 60],
    gruen: [64, 220, 110], dunkel: [0, 0, 0],
  }
  const C = Object.fromEntries(Object.entries(ELECTRIC_C).map(([k, v]) => [k, hex(v)]))

  function kachel(Z, b, h, hintergrund) {
    const s = Z.L.s
    const r = floor(6 * s)
    Z.rund(0, 0, b, h, r, C.rand)
    const d = max(1, floor(1.5 * s))
    Z.rund(d, d, b - 2 * d, h - 2 * d, r - d, hintergrund || C.kachel)
  }

  function pille(Z, x, ym, t, farbe, voll) {
    const s = Z.L.s
    const ph = max(18, floor(26 * s))
    const b = Z.breite(t, 13) + 18 * s
    Z.rund(x - b, ym - ph / 2, b, ph, ph / 2, farbe)
    if (!voll) Z.rund(x - b + 2, ym - ph / 2 + 2, b - 4, ph - 4, ph / 2 - 2, C.kachel)
    Z.text(x - b / 2, ym, t, 13, voll ? C.dunkel : farbe, 'middle', b, true)
    return b
  }

  // Kopfzeile (Z.kopf), Senderakku, Empfangsbalken und Motor-Pille; Demo-Zustand: Motor scharf, volle Werte
  function electricKopf(Z, k) {
    const { s, W, kh, kompakt } = Z.L
    Z.rechteck(0, 0, W, kh, C.bg)
    let zx, x
    if (kompakt) {
      const zb = Z.breite('00:00', 34) + 16 * s
      Z.text(12 * s, kh / 2, '4:26', 34, C.weiss, 'start', zb, true)
      zx = 12 * s + zb - 60 * s
      x = W - 12 * s
    } else {
      zx = W * 0.42
      Z.text(12 * s, kh / 2, k.modell, 30, C.weiss, 'start', zx - 60 * s - 12 * s, true)
      Z.text(zx, kh / 2, '4:26', 34, C.weiss, 'middle', 120 * s)
      x = W - 12 * s
      // Senderakku
      const bb = 22 * s, bh = 32 * s
      Z.rund(x - bb, kh / 2 - bh / 2 + 3 * s, bb, bh - 3 * s, 3 * s, C.gruen)
      Z.rund(x - bb + 2 * s, kh / 2 - bh / 2 + 5 * s, bb - 4 * s, bh - 7 * s, 2 * s, C.bg)
      Z.rechteck(x - bb / 2 - 5 * s, kh / 2 - bh / 2, 10 * s, 4 * s, C.gruen)
      const fh = (bh - 11 * s) * 0.8
      Z.rechteck(x - bb + 4 * s, kh / 2 + bh / 2 - 4 * s - fh, bb - 8 * s, fh, C.gruen)
      x = x - bb - 12 * s
    }
    for (let i = 4; i >= 1; i--) {
      const h = (6 + 5 * i) * s
      Z.rechteck(x - 7 * s, kh / 2 + 13 * s - h, 6 * s, h, C.gruen)
      x -= 9 * s
    }
    x -= 8 * s
    // Beispiel mit Motorschalter (scharf); wie auf der Funke nur, wenn die Pille neben der Flugzeit Platz hat
    const frei = x - (zx + 60 * s)
    if (Z.breite(k.T.scharf, 13) + 18 * s <= frei) pille(Z, x, kh / 2, k.T.scharf, C.gruen, true)
    Z.rechteck(0, kh, W, max(1, floor(2 * s)), C.linie)
  }

  function electricFlaeche(svg, a, k) {
    const L = layout(a.breite, a.hoehe)
    const Z = zeichner(svg, L)
    Z.rechteck(0, 0, a.breite, a.hoehe, C.bg)
    electricKopf(Z, k)
    // Feld «Flüge» nur im Vollbild 800 × 480 (A.zeichne)
    if (L.W === 800 && L.H === 480) {
      const g = 8, fh = 40, x = g, y = L.H - g - fh, b = 232
      const s = L.s, r = 6 * s
      Z.rund(x, y, b, fh, r, C.rand)
      const d = max(1, floor(1.5 * s))
      Z.rund(x + d, y + d, b - 2 * d, fh - 2 * d, r - d, C.kachel)
      Z.text(x + b / 2, y + fh / 2, k.T.fluege, 16, C.weiss, 'middle', b - 12, true)
    }
  }

  // Ein Platz wie zeichnePlatz (ansicht.lua) im eigenen Koordinatensystem (0, 0, b, h)
  function electricPlatz(svg, b, h, q, k) {
    const L = layout(k.ansicht.breite, k.ansicht.hoehe)
    const Z = zeichner(svg, L)
    const s = L.s
    const gr = (px) => max(6, px / (1.25 * s))
    const fg = q.farbeWert || C.hblau
    kachel(Z, b, h, q.hintergrund)
    if (q.leer) return
    const P = k.regeln || {}
    const th = min(18, max(P.thMin || 9, h * 0.2))
    const pad = max(4, floor(6 * s))
    // Symbolfarbe: bei Status die Farbe des Zustands (ansicht.lua: grün bzw. grau), sonst die Farbe des Werts
    const { ein, amWert } = k.symbol(svg, q, q.darstellung === 'status' ? (q.statusFarbe || C.gruen) : fg)
    const eh = amWert ? q.einheit : ''
    const tx = max(pad, ein)
    const tb = max(8, b - tx - pad)
    const tcx = (tx + b - pad) / 2
    const zahl = q.zeit ? q.zeitText : q.zahlText
    const wert = q.zeit ? zahl : (eh ? `${zahl} ${eh}` : zahl)
    const zt = q.zusatz && q.zusatz !== 'keine' ? `${{ min: 'MIN ', max: 'MAX ', mittel: 'Ø ' }[q.zusatz]}${wert}` : null
    const anteil = q.anteil
    const d = q.darstellung
    if (d === 'status') {
      Z.text(tx, pad + th / 2, q.titel, gr(th), C.titel, 'start', tb)
      Z.text(b / 2, (h + th) / 2 + pad / 2, q.statusText, gr(P.heli ? min(h * 0.45, 40) : min(h * 0.4, 34)), q.statusFarbe || C.gruen, 'middle', b - 2 * pad, true)
    } else if (d === 'ring') {
      Z.text(tcx, pad + th / 2, q.titel, gr(th), C.titel, 'middle', tb)
      const zh = zt ? th : 0
      const r = min(b * 0.42, (h - th - zh - 3 * pad) * 0.5)
      const cx = b / 2, cy = pad + th + pad + r
      const ri = max(2, r - max(4, r * 0.22))
      Z.bogen(cx, cy, ri, r, 225, 495, C.spur)
      if (anteil > 0) Z.bogen(cx, cy, ri, r, 225, 225 + anteil * 270, fg)
      Z.text(cx, cy - r * 0.08, zahl, gr(r * 0.62), C.weiss, 'middle', 2 * ri - 4, true)
      if (eh && !q.zeit) {
        if (P.heli) Z.text(cx, cy + r * 0.42, eh, gr(max(10, r * 0.22)), C.titel, 'middle', 2 * ri - 4)
        else Z.text(cx, cy + r * 0.38, eh, gr(max(8, r * 0.2)), C.titel, 'middle', 2 * ri - 4, true)
      }
      if (zt) Z.text(cx, h - pad - th / 2, zt, gr(th), C.gelb, 'middle', b - 2 * pad, true)
    } else if (d === 'balken_w') {
      Z.text(tx, pad + th / 2, q.titel, gr(th), C.titel, 'start', max(8, b * 0.5 - (tx - pad)))
      const bh = max(6, floor(h * 0.22))
      const by = h - pad - bh - (zt ? th : 0)
      const vh = by - (pad + th) - pad
      Z.text(b - pad, pad + th / 2 + max(0, vh - th) / 2, wert, gr(max(th, min(vh + th, 44))), fg, 'end', b * 0.55, true)
      Z.rund(pad, by, b - 2 * pad, bh, 3, C.spur)
      if (anteil > 0) Z.rund(pad, by, max(2, (b - 2 * pad) * anteil), bh, 3, fg)
      if (zt) Z.text(b - pad, h - pad - th / 2, zt, gr(th), C.gelb, 'end', b - 2 * pad)
    } else if (d === 'balken_s') {
      Z.text(tcx, pad + th / 2, q.titel, gr(th), C.titel, 'middle', tb)
      const vh = min(30, max(12, h * 0.16))
      const zh = zt ? th : 0
      const bt = 2 * pad + th
      const bhoch = h - pad - vh - zh - pad - bt
      const bb = min(b * 0.4, 40)
      const bx = (b - bb) / 2
      if (bhoch > 4) {
        Z.rund(bx, bt, bb, bhoch, 3, C.spur)
        if (anteil > 0) { const f = max(2, bhoch * anteil); Z.rund(bx, bt + bhoch - f, bb, f, 3, fg) }
      }
      Z.text(b / 2, h - pad - zh - vh / 2, wert, gr(vh), fg, 'middle', b - 2 * pad, true)
      if (zt) Z.text(b / 2, h - pad - th / 2, zt, gr(th), C.gelb, 'middle', b - 2 * pad)
    } else if (d === 'kurve') {
      Z.text(tx, pad + th / 2, q.titel, gr(th), C.titel, 'start', max(8, b * 0.5 - (tx - pad)))
      Z.text(b - pad, pad + th / 2, wert, gr(th * 1.3), fg, 'end', b * 0.48, true)
      const px = pad, py = 2 * pad + th, pb = b - 2 * pad, ph = h - 3 * pad - th - (zt ? th : 0)
      if (ph > 4) {
        Z.rechteck(px, py + ph, pb, 1, C.linie)
        // Beispielverlauf (auf der Funke: die letzten 120 Werte)
        let vor = null
        for (let j = 0; j <= 60; j++) {
          const sx = px + pb * j / 60
          const sy = py + ph - ph * (0.35 + 0.25 * Math.sin(j / 7) + 0.1 * Math.sin(j / 2.3))
          if (vor) Z.linie(vor[0], vor[1], sx, sy, fg)
          vor = [sx, sy]
        }
      }
      if (zt) Z.text(b - pad, h - pad - th / 2, zt, gr(th), C.gelb, 'end', b - 2 * pad)
    } else {
      Z.text(tx, pad + th / 2, q.titel, gr(th), C.titel, 'start', tb)
      const vy = pad + th + (h - 2 * pad - th - (zt ? th : 0)) / 2
      Z.text(b - pad, vy, wert, gr(min(h * 0.42, 52)), fg, 'end', b - 2 * pad, true)
      if (zt) Z.text(b - pad, h - pad - th / 2, zt, gr(th), C.gelb, 'end', b - 2 * pad)
    }
  }

  const STILE = {
    electric: { name: 'Electric 0.6.1', hintergrund: C.bg, flaeche: electricFlaeche, platz: electricPlatz, zahlKomma: true,
      texte: { de: { scharf: 'SCHARF', motorAus: 'MOTOR AUS', fluege: '8 Flüge' }, en: { scharf: 'ARMED', motorAus: 'MOTOR OFF', fluege: '8 flights' } } },
  }

  // Jet 0.4.0: ansicht.lua und zeichnen.lua wie Electric (gleiche Farben, Kacheln, Kopfzeile); anders sind die
  // Turbinen-Pille (Beispiel: läuft, grün), die Laufzeit statt Flugzeit und das Feld «Läufe» statt «Flüge»
  STILE.jet = { ...STILE.electric, name: 'Jet 0.4.0',
    texte: { de: { scharf: 'LÄUFT', fluege: '8 Läufe' }, en: { scharf: 'RUNNING', fluege: '8 runs' } } }

  // Heli 1.13.1 (src/heli/ansicht.lua, kern.lua): gleiche Farben und Kacheln; Titel mindestens 10 px, Einheit im Ring
  // tiefer (r·0,42) und nicht fett, Status-Wert grösser. Eigene Kopfzeile: Modellname, Uhrzeit, Profil/Rate, Empfang, Senderakku.
  function heliKopf(Z, k) {
    const { s, W, kompakt } = Z.L
    const hk = 56 * s
    Z.rechteck(0, 0, W, hk, C.bg)
    if (!kompakt) {
      const SCH = [12, 14, 17, 20, 25, 34, 42]
      const t = (x, ym, txt, i, f, ausr, fett, maxB) => Z.text(x, ym, txt, (SCH[i - 1] - 0.5) / (1.25 * s), f, ausr, maxB, fett)
      t(14 * s, hk / 2, k.modell, 6, C.weiss, 'start', true, 300 * s)
      t(W / 2, hk / 2, '17:18', 6, C.weiss, 'middle', false, 150 * s)
      let x = W - 14 * s
      const bb = 26 * s, bh = 34 * s
      Z.rund(x - bb, hk / 2 - bh / 2 + 3 * s, bb, bh - 3 * s, 3 * s, C.gruen)
      Z.rund(x - bb + 2 * s, hk / 2 - bh / 2 + 5 * s, bb - 4 * s, bh - 7 * s, 2 * s, C.bg)
      Z.rechteck(x - bb / 2 - 5 * s, hk / 2 - bh / 2, 10 * s, 4 * s, C.gruen)
      const fh = (bh - 11 * s) * 0.8
      Z.rechteck(x - bb + 4 * s, hk / 2 + bh / 2 - 4 * s - fh, bb - 8 * s, fh, C.gruen)
      x -= bb + 12 * s
      for (let i = 4; i >= 1; i--) { const h = (6 + 5 * i) * s; Z.rechteck(x - 7 * s, hk / 2 + 13 * s - h, 6 * s, h, C.gruen); x -= 9 * s }
      x -= 8 * s
      t(x, hk / 2, k.T.profil, 3, C.weiss, 'end', true, 200 * s)
    }
    if (kompakt) {
      // kompaktLeiste (kern.lua): Kachel über die Breite mit Flugzeit, Pille, Profil/Rate und Empfangsbalken
      const kk = min(W / 784, Z.L.H / 316)
      const rd = 6 * kk, hs = 30 * kk, y0 = 2 * kk, ym = y0 + hs / 2
      Z.rund(rd, y0, W - 2 * rd, hs, 6 * kk, C.rand)
      Z.rund(rd + 1, y0 + 1, W - 2 * rd - 2, hs - 2, 6 * kk - 1, C.kachel)
      Z.text(rd + 12 * kk, ym, '4:26', 20 * kk * 0.9 / (1.25 * s), C.weiss, 'start', 90 * kk, true)
      const pb = Z.breite(k.T.scharf, 13) + 22 * kk, ph = 24 * kk
      Z.rund(rd + 220 * kk - pb, ym - ph / 2, pb, ph, ph / 2, C.gruen)
      Z.text(rd + 220 * kk - pb / 2, ym, k.T.scharf, 13, C.bg, 'middle', pb, true)
      Z.text(rd + 236 * kk, ym, k.T.profil, 14 * kk / (1.25 * s), C.weiss, 'start', 240 * kk, true)
      let xb = W - rd - 14 * kk
      for (let i = 4; i >= 1; i--) { const h = (4 + 4 * i) * kk; Z.rechteck(xb - 5 * kk, ym + 10 * kk - h, max(2, floor(5 * kk)), h, C.gruen); xb -= 8 * kk }
      return
    }
    Z.rechteck(0, floor(hk), W, max(1, floor(2 * s)), C.linie)
  }
  STILE.heli = { ...STILE.electric, name: 'Heli 1.13.1', regeln: { thMin: 10, heli: true },
    flaeche(svg, a, k) {
      const L = layout(a.breite, a.hoehe)
      L.kh = Math.max(...((k.reserviert || []).filter((r) => r.y <= 0 && r.b >= a.breite).map((r) => r.h)), 0) || L.kh
      const Z = zeichner(svg, L)
      Z.rechteck(0, 0, a.breite, a.hoehe, C.bg)
      heliKopf(Z, k)
    },
    texte: { de: { scharf: 'SCHARF', profil: 'Profil 1 / Rate 1' }, en: { scharf: 'ARMED', profil: 'Profile 1 / Rate 1' } } }

  // ---------- Glider 0.5.0 (src/glider/platz.lua, zeichnen.lua): eigene Palette, eckige Kacheln, Titel grau und mittig ----------
  const G = Object.fromEntries(Object.entries({
    bg: [14, 17, 22], panel: [22, 27, 34], rand: [48, 54, 61], text: [230, 237, 243], dim: [139, 148, 158], grau: [75, 85, 99],
    blau: [59, 130, 246], gruen: [34, 197, 94], orange: [245, 158, 11], rot: [239, 68, 68], dunkel: [11, 13, 16], hblau: [96, 165, 250],
  }).map(([k, v]) => [k, hex(v)]))

  function gliderFlaeche(svg, a, k) {
    const L = layout(a.breite, a.hoehe)
    const Z = zeichner(svg, L)
    const band = Math.max(0, ...((k.reserviert || []).filter((r) => r.y <= 0 && r.b >= a.breite).map((r) => r.h)))
    Z.rechteck(0, 0, a.breite, a.hoehe, G.bg)
    if (!band) return
    // Kopfzeile wie im Simulatorbild: umrandete Pillen links (Flugphase, Motor), rechts Empfang und Flug (Beispielzustand)
    const kh = Math.min(band, Math.round(44 * L.s / (L.kompakt ? 0.72 : 1) * (L.kompakt ? 0.8 : 1)))
    const ph = Math.max(16, Math.round(26 * L.s)), ym = kh / 2
    let x = 6 * L.s
    for (const [t, f] of [[k.T.phase, G.blau], [k.T.motorAus, G.gruen]]) {
      const b = Z.breite(t, 13) + 22 * L.s
      Z.rund(x, ym - ph / 2, b, ph, ph / 2, f)
      Z.rund(x + 2, ym - ph / 2 + 2, b - 4, ph - 4, ph / 2 - 2, G.bg)
      Z.text(x + b / 2, ym, t, 13, f, 'middle', b)
      x += b + 6 * L.s
    }
    Z.text(a.breite - 8 * L.s, ym, k.T.rechts, 14, G.text, 'end', a.breite / 3)
  }

  function gliderPlatz(svg, b, h, q, k) {
    const L = layout(k.ansicht.breite, k.ansicht.hoehe)
    const Z = zeichner(svg, L)
    const gr = (px) => px / (1.25 * L.s)
    Z.rechteck(0, 0, b, h, G.rand)
    Z.rechteck(1, 1, b - 2, h - 2, q.hintergrund || G.panel)
    if (q.leer) return
    const fb = q.farbeWert || G.hblau
    const wert = q.zeit ? q.zeitText : (q.einheit ? `${q.zahlText} ${q.einheit}` : q.zahlText)
    const zt = q.zusatz && q.zusatz !== 'keine' ? `${k.T[{ min: 'zMin', max: 'zMax', mittel: 'zMittel' }[q.zusatz]]} ${wert}` : null
    k.symbol(svg, q, q.darstellung === 'status' ? (q.statusFarbe || G.text) : fb)
    const d = q.darstellung
    if (d === 'ring') {
      const tg = min(16, max(11, h * 0.12))
      Z.text(b / 2, tg * 0.75 + 2, q.titel, gr(tg), G.dim, 'middle', b - 8)
      const oben = tg + 6
      const r2 = min(b * 0.4, (h - oben - 4) * 0.56)
      const r1 = r2 - max(5, floor(r2 * 0.16))
      const cx = b / 2, cy = oben + r2 + 2
      Z.bogen(cx, cy, r1, r2, 225, 495, G.rand)
      if (q.anteil > 0) Z.bogen(cx, cy, r1, r2, 225, 225 + 270 * q.anteil, q.farbeWert || G.hblau)
      Z.text(cx, cy - 2, wert, gr(min(34, r1 * 0.55)), G.text, 'middle', r1 * 1.8)
      if (zt) Z.text(cx, cy + r1 * 0.55, zt, gr(12), G.dim, 'middle', r1 * 1.6)
    } else if (d === 'balken_w' || d === 'kurve') {
      const tg = min(16, max(11, h * (d === 'kurve' ? 0.16 : 0.28)))
      Z.text(6, tg * 0.75 + 2, q.titel, gr(tg), G.dim, 'start', b * 0.5)
      Z.text(b - 6, tg * 0.75 + 2, wert, gr(tg * 1.15), G.text, 'end', b * 0.48)
      if (d === 'balken_w') {
        const by = tg + 6, bh = max(6, h - by - 6)
        Z.rechteck(6, by, b - 12, bh, G.rand); Z.rechteck(7, by + 1, b - 14, bh - 2, G.dunkel)
        if (q.anteil > 0) Z.rechteck(8, by + 2, (b - 16) * q.anteil, bh - 4, fb)
      } else {
        const gx = 6, gy = tg + 8, gb = b - 12, gh = h - gy - 6
        if (gh >= 8) {
          Z.rechteck(gx, gy + gh, gb, 1, G.rand)
          let vor = null
          for (let j = 0; j <= 60; j++) {
            const sx = gx + gb * j / 60, sy = gy + gh - gh * (0.35 + 0.25 * Math.sin(j / 7) + 0.1 * Math.sin(j / 2.3))
            if (vor) Z.linie(vor[0], vor[1], sx, sy, fb)
            vor = [sx, sy]
          }
        }
      }
    } else if (d === 'balken_s') {
      const tg = min(16, max(11, b * 0.14)), vt = tg * 1.2
      Z.text(b / 2, tg * 0.75 + 2, q.titel, gr(tg), G.dim, 'middle', b - 6)
      const by = tg + 6, bh = max(10, h - by - vt - 6), bb = min(b - 12, max(14, b * 0.4)), bx = (b - bb) / 2
      Z.rechteck(bx, by, bb, bh, G.rand); Z.rechteck(bx + 1, by + 1, bb - 2, bh - 2, G.dunkel)
      if (q.anteil > 0) Z.rechteck(bx + 2, by + 2 + (bh - 4) * (1 - q.anteil), bb - 4, (bh - 4) * q.anteil, fb)
      Z.text(b / 2, h - vt * 0.6 - 2, wert, gr(vt), G.text, 'middle', b - 6)
    } else if (d === 'status') {
      const tg = min(16, max(11, h * 0.22))
      Z.text(b / 2, tg * 0.75 + 2, q.titel, gr(tg), G.dim, 'middle', b - 8)
      Z.text(b / 2, tg + 4 + (h - tg - 4) / 2, q.statusText, gr(min(40, (h - tg) * 0.55)), q.statusFarbe || G.text, 'middle', b - 10)
    } else {
      const tg = min(16, max(11, h * 0.2))
      Z.text(b / 2, tg * 0.75 + 2, q.titel, gr(tg), G.dim, 'middle', b - 8)
      const unten = zt && h >= 70 ? tg : 0
      const vh = min(64, (h - tg - unten) * 0.62)
      Z.text(b / 2, tg + 4 + (h - tg - unten - 4) / 2, wert, gr(vh), q.farbeWert || G.text, 'middle', b - 10)
      if (unten) Z.text(b / 2, h - tg * 0.7, zt, gr(tg * 0.85), G.dim, 'middle', b - 8)
    }
  }
  STILE.glider = { name: 'Glider 0.5.0', hintergrund: G.bg, flaeche: gliderFlaeche, platz: gliderPlatz, zahlKomma: true,
    texte: { de: { phase: 'STANDARD-FLUGPHASE', motorAus: 'MOTOR AUS', rechts: 'Empfang 92 %   Flug 1/3', zMin: 'Min', zMax: 'Max', zMittel: 'Ø' },
      en: { phase: 'STANDARD FLIGHT MODE', motorAus: 'MOTOR OFF', rechts: 'Signal 92 %   Flight 1/3', zMin: 'Min', zMax: 'Max', zMittel: 'Ø' } } }

  // ---------- Gas Engine ECU 1.10.0 / Carb 0.10.0 (src/gas_ecu/ansicht.lua, gleich für Carb): Palette wie Glider, runde Kacheln ----------
  function gasPlatz(svg, b, h, q, k) {
    const L = layout(k.ansicht.breite, k.ansicht.hoehe)
    const Z = zeichner(svg, L)
    const s = L.s
    Z.rund(0, 0, b, h, 6 * s, G.rand)
    Z.rund(1, 1, b - 2, h - 2, 6 * s - 1, q.hintergrund || G.panel)
    if (q.leer) return
    const fb = q.farbeWert || G.hblau
    const wf = G.text
    const wert = q.zeit ? q.zeitText : (q.einheit ? `${q.zahlText} ${q.einheit}` : q.zahlText)
    const zl = q.zusatz && q.zusatz !== 'keine' ? `${{ min: 'min', max: 'max', mittel: 'Ø' }[q.zusatz]} ${q.zahlText}` : null
    k.symbol(svg, q, q.darstellung === 'status' ? (q.statusFarbe || wf) : fb)
    const th = max(15, 16 * s)
    const d = q.darstellung
    if (d === 'zahl' || d === 'status') {
      Z.text(b / 2, th * 0.6 + 2 * s, q.titel, 13, G.dim, 'middle', b - 8 * s)
      const ym = (h + th) / 2 - (zl ? 6 * s : 0)
      Z.text(b / 2, ym, d === 'status' ? q.statusText : wert, d === 'status' ? 20 : 24, d === 'status' ? (q.statusFarbe || wf) : wf, 'middle', b - 8 * s, true)
      if (zl) Z.text(b / 2, h - 9 * s, zl, 12, G.dim, 'middle', b - 8 * s)
    } else if (d === 'ring') {
      Z.text(b / 2, 4 * s + th / 2, q.titel, 13, G.dim, 'middle', b - 10 * s)
      const oben = 6 * s + th
      const r2 = min(b * 0.36, (h - oben - 4 * s) * 0.56)
      const r1 = r2 - max(5, floor(r2 * 0.16))
      const cx = b / 2, cy = oben + r2 + 2 * s
      Z.bogen(cx, cy, r1, r2, 225, 495, G.rand)
      if (q.anteil > 0) Z.bogen(cx, cy, r1, r2, 225, 225 + 270 * q.anteil, fb)
      Z.text(cx, cy - 2 * s, wert, 22, wf, 'middle', r1 * 1.8, true)
      if (zl) Z.text(cx, cy + r1 * 0.55, zl, 12, G.dim, 'middle', r1 * 1.6)
    } else if (d === 'balken_w' || d === 'kurve') {
      Z.text(8 * s, th * 0.6 + 2 * s, q.titel, 13, G.dim, 'start', b * 0.5)
      Z.text(b - 8 * s, th * 0.6 + 2 * s, wert, 16, wf, 'end', b * 0.5, true)
      if (d === 'balken_w') {
        const by = th + 6 * s, bh = max(6, h - th - 12 * s - (zl ? 12 * s : 0))
        Z.rund(8 * s, by, b - 16 * s, bh, 3 * s, G.grau); Z.rund(8 * s + 1, by + 1, b - 16 * s - 2, bh - 2, 3 * s - 1, G.dunkel)
        if (q.anteil > 0) Z.rechteck(8 * s + 2, by + 2, (b - 16 * s - 4) * q.anteil, bh - 4, fb)
        if (zl) Z.text(b / 2, h - 8 * s, zl, 12, G.dim, 'middle', b - 8 * s)
      } else {
        const gx = 8 * s, gy = th + 6 * s, gb = b - 16 * s, gh = h - th - 12 * s
        let vor = null
        for (let j = 0; j <= 60; j++) {
          const sx = gx + gb * j / 60, sy = gy + gh * (1 - (0.35 + 0.25 * Math.sin(j / 7) + 0.1 * Math.sin(j / 2.3)))
          if (vor) Z.linie(vor[0], vor[1], sx, sy, fb)
          vor = [sx, sy]
        }
      }
    } else if (d === 'balken_s') {
      Z.text(b / 2, th * 0.6 + 2 * s, q.titel, 13, G.dim, 'middle', b - 6 * s)
      const unten = 18 * s + (zl ? 12 * s : 0)
      const bw = min(b * 0.5, 40 * s), by = th + 6 * s, bh = max(6, h - th - 10 * s - unten)
      Z.rund((b - bw) / 2, by, bw, bh, 3 * s, G.grau); Z.rund((b - bw) / 2 + 1, by + 1, bw - 2, bh - 2, 3 * s - 1, G.dunkel)
      if (q.anteil > 0) Z.rechteck((b - bw) / 2 + 2, by + 2 + (bh - 4) * (1 - q.anteil), bw - 4, (bh - 4) * q.anteil, fb)
      Z.text(b / 2, by + bh + 9 * s, wert, 15, wf, 'middle', b - 6 * s, true)
      if (zl) Z.text(b / 2, h - 7 * s, zl, 12, G.dim, 'middle', b - 6 * s)
    }
  }
  // Kopfzeile wie im Simulatorbild (Beispielzustand): Pillen links, Modell und Motor rechts
  function gasFlaeche(svg, a, k) {
    const L = layout(a.breite, a.hoehe)
    const Z = zeichner(svg, L)
    Z.rechteck(0, 0, a.breite, a.hoehe, G.bg)
    const band = Math.max(0, ...((k.reserviert || []).filter((r) => r.y <= 0 && r.b >= a.breite).map((r) => r.h)))
    if (!band) return
    // Kopfband in panel (zeichnen.lua); Zustandspille gefüllt mit dunkler Schrift, weitere Pillen nur mit Rand (innen panel)
    if (!L.kompakt) Z.rechteck(0, 0, a.breite, band, G.panel)
    const ym = min(band, 44 * L.s) / 2, ph = max(22, floor(28 * L.s)), d = max(1, floor(2 * L.s))
    let x = 6 * L.s
    k.T.pillen.forEach(([t, f], i) => {
      const fa = f === 'gruen' ? G.gruen : G.rot
      const b = Z.breite(t, 15) + 22 * L.s
      Z.rund(x, ym - ph / 2, b, ph, ph / 2, fa)
      if (i > 0) Z.rund(x + d, ym - ph / 2 + d, b - 2 * d, ph - 2 * d, ph / 2 - d, G.panel)
      Z.text(x + b / 2, ym, t, 15, i === 0 ? G.dunkel : fa, 'middle', b)
      x += b + 6 * L.s
    })
    Z.text(a.breite - 8 * L.s, ym, k.T.rechts, 14, G.text, 'end', a.breite * 0.4)
  }
  const GAS = { hintergrund: G.bg, flaeche: gasFlaeche, platz: gasPlatz, zahlKomma: true }
  STILE.gas_ecu = { ...GAS, name: 'Gas Engine ECU 1.10.0',
    texte: { de: { pillen: [['LÄUFT', 'gruen'], ['ZÜNDUNG EIN', 'rot']], rechts: 'ECU 15,2 V   Motor 1/3' }, en: { pillen: [['RUNNING', 'gruen'], ['IGNITION ON', 'rot']], rechts: 'ECU 15.2 V   Motor 1/3' } } }
  STILE.gas_carb = { ...GAS, name: 'Gas Engine Carb 0.10.0',
    texte: { de: { pillen: [['LÄUFT', 'gruen'], ['ZÜNDUNG EIN', 'rot']], rechts: 'Motor 1/3' }, en: { pillen: [['RUNNING', 'gruen'], ['IGNITION ON', 'rot']], rechts: 'Motor 1/3' } } }

  window.LUA_VORSCHAU = { stil: (lua) => STILE[lua] || null, layout }
})()
