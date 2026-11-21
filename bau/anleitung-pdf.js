'use strict'
// Anleitung DE/EN als PDF (A4) aus docs/anleitung/*.html. Aufruf: npm run anleitung
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const DOCS = path.join(__dirname, '..', 'docs')
const DATEIEN = ['Lua-Studio - Anleitung', 'Lua-Studio - Manual']

// Nicht beenden, wenn zwischen zwei Dateien kein Fenster offen ist
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  for (const name of DATEIEN) {
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    await w.loadFile(path.join(DOCS, 'anleitung', `${name}.html`))
    const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } })
    fs.writeFileSync(path.join(DOCS, `${name}.pdf`), pdf)
    console.log(`${name}.pdf: ${pdf.length} Byte`)
    w.destroy()
  }
  app.quit()
})
