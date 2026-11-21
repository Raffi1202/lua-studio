'use strict'
// Holt die Beschreibungen der Luas (studio/beschreibung.json bzw. studio/<lua>/beschreibung.json) aus den Lua-Repos
// nach src/luas/<lua>.json, damit sie im Studio mitgeliefert werden. Aufruf: npm run beschreibungen [Ordner der Repos]
const fs = require('fs')
const os = require('os')
const path = require('path')

const repos = process.argv[2] || path.join(os.homedir(), 'Desktop', 'Git Repos')
const ziel = path.join(__dirname, '..', 'src', 'luas')
fs.mkdirSync(ziel, { recursive: true })
let n = 0
for (const repo of fs.readdirSync(repos)) {
  const studio = path.join(repos, repo, 'studio')
  if (!fs.existsSync(studio)) continue
  const kandidaten = [path.join(studio, 'beschreibung.json')]
  for (const u of fs.readdirSync(studio)) kandidaten.push(path.join(studio, u, 'beschreibung.json'))
  for (const k of kandidaten) {
    if (!fs.existsSync(k)) continue
    try {
      const b = JSON.parse(fs.readFileSync(k, 'utf8'))
      if (typeof b.lua !== 'string' || !/^[a-z0-9_]+$/.test(b.lua) || !Array.isArray(b.werte)) throw new Error('Aufbau')
      fs.writeFileSync(path.join(ziel, `${b.lua}.json`), JSON.stringify(b, null, 2) + '\n')
      console.log(`${b.lua} ${b.luaVersion || ''}: ${b.werte.length} Werte, ${(b.einstellungen || []).length} Einstellungen (aus ${repo})`)
      n++
    } catch (e) {
      console.error(`übersprungen: ${k} (${e.message})`)
    }
  }
}
console.log(`${n} Beschreibung(en) nach src/luas`)
