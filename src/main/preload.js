'use strict'
// Brücke zwischen Oberfläche und Hauptprozess (nur diese Funktionen sind in der Oberfläche sichtbar).

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('studio', {
  texte: (sprache) => ipcRenderer.invoke('texte', sprache),
  entwickler: () => ipcRenderer.invoke('entwickler'),
  startInfo: () => ipcRenderer.invoke('startInfo'),
  update: () => ipcRenderer.invoke('update'),
  systemSprache: () => ipcRenderer.invoke('systemSprache'),
  anschluesse: () => ipcRenderer.invoke('anschluesse'),
  verbinden: (ziel) => ipcRenderer.invoke('verbinden', ziel),
  trennen: () => ipcRenderer.invoke('trennen'),
  eingabe: (e) => ipcRenderer.invoke('eingabe', e),
  fotoSpeichern: (daten) => ipcRenderer.invoke('fotoSpeichern', daten),
  studio: (kanal, daten) => ipcRenderer.invoke('studio:' + kanal, daten),
  beiSchritt: (fn) => ipcRenderer.on('studio:schritt', (_e, d) => fn(d)),
  beiBild: (fn) => ipcRenderer.on('bild', (_e, d) => fn(d)),
  beiStatus: (fn) => ipcRenderer.on('status', (_e, d) => fn(d)),
  beiLog: (fn) => ipcRenderer.on('log', (_e, d) => fn(d)),
  beiTakt: (fn) => ipcRenderer.on('takt', (_e, d) => fn(d)),
  // Fehlerprotokoll (Hilfe -> Fehlerprotokoll)
  protokoll: (kanal, daten) => ipcRenderer.invoke('protokoll:' + kanal, daten),
  beiProtokollZeigen: (fn) => ipcRenderer.on('protokoll:zeigen', () => fn()),
  beiBearbeiten: (fn) => ipcRenderer.on('bearbeiten', (_e, art) => fn(art)),
})

