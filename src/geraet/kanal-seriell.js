'use strict'
// Kanal über die USB-Serial-Schnittstelle der Funke (Serialmodus).

const ETHOS_VID = '0483'
const ETHOS_PID = '5750'

function serialport() {
  return require('serialport')
}

// Alle seriellen Anschlüsse; Ethos-Funken (USB-Kennung 0483:5750) zuerst und markiert.
async function anschluesseSuchen() {
  const liste = await serialport().SerialPort.list()
  return liste
    .map((p) => ({
      // macOS: /dev/cu.* statt /dev/tty.* (tty wartet beim Öffnen auf das Trägersignal)
      pfad: process.platform === 'darwin' ? p.path.replace(/^\/dev\/tty\./, '/dev/cu.') : p.path,
      name: [p.manufacturer, p.friendlyName || p.pnpId].filter(Boolean).join(' · ') || p.path,
      ethos: String(p.vendorId || '').toLowerCase() === ETHOS_VID && String(p.productId || '').toLowerCase() === ETHOS_PID,
    }))
    .sort((a, b) => Number(b.ethos) - Number(a.ethos))
}

// lesart: 'ereignis' = Daten-Ereignisse von serialport; 'abfrage' = selbst alle 5 ms vom Dateideskriptor lesen
// (wie pyserial in radio_remote.py). Auf dem Mac kamen die Ereignisse am X18RS stark verspätet (Antworten erst nach
// 1,9–8,1 s statt ~50 ms, gemessen 20.11.2026), darum dort Abfrage.
function seriellOeffnen(pfad, lesart = process.platform === 'darwin' ? 'abfrage' : 'ereignis') {
  const { SerialPort } = serialport()
  const fs = require('fs')
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: pfad, baudRate: 115200, autoOpen: false })
    port.open((err) => {
      if (err) return reject(new Error(`anschlussZu|${pfad}: ${err.message}`))
      // DTR/RTS wie pyserial
      port.set({ dtr: true, rts: true }, () => {})
      let endeFn = () => {}
      let datenFn = () => {}
      let uhr = null
      const ende = (grund) => {
        if (uhr) { clearInterval(uhr); uhr = null }
        // Bei «abfrage» schliesst serialport den Port nach einem Lesefehler nicht selbst
        if (lesart === 'abfrage' && port.isOpen) { try { port.close() } catch { /* schon zu */ } }
        endeFn(grund)
      }
      port.on('close', () => ende('kabelGetrennt'))
      port.on('error', (e) => ende(`schnittstelle|${e.message}`))
      if (lesart === 'abfrage') {
        const fd = port.port && port.port.fd
        const puffer = Buffer.alloc(16384)
        let liest = false
        uhr = setInterval(() => {
          if (liest || !port.isOpen) return
          liest = true
          fs.read(fd, puffer, 0, puffer.length, null, (e, n) => {
            liest = false
            if (e) { if (e.code !== 'EAGAIN' && e.code !== 'EWOULDBLOCK' && e.code !== 'EINTR') ende(`schnittstelle|${e.message}`); return }
            if (n > 0) datenFn(Buffer.from(puffer.subarray(0, n)))
          })
        }, 5)
      } else {
        port.on('data', (d) => datenFn(d))
      }
      resolve({
        lesart,
        schreiben: (buf) => port.write(buf),
        beiDaten: (fn) => { datenFn = fn },
        beiEnde: (fn) => { endeFn = fn },
        schliessen: () => { if (uhr) { clearInterval(uhr); uhr = null } if (port.isOpen) port.close() },
      })
    })
  })
}

module.exports = { anschluesseSuchen, seriellOeffnen, ETHOS_VID, ETHOS_PID }
