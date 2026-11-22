'use strict'
// Hinweis auf neue Version (0.13.0): Vergleich, Auswahl der neuesten Version, ohne Internet still
const test = require('node:test')
const assert = require('node:assert')
const U = require('../src/main/update')

const antwort = (liste, ok = true) => async () => ({ ok, status: ok ? 200 : 403, json: async () => liste })

test('Update: Versionsvergleich und neueste Version inkl. Pre-release', async () => {
  assert.ok(U.neuer('0.13.0', '0.12.0')); assert.ok(U.neuer('v1.0.0', '0.99.9')); assert.ok(!U.neuer('0.12.0', '0.12.0')); assert.ok(!U.neuer('0.9.0', '0.10.0'))
  const liste = [{ tag_name: 'v0.12.0', html_url: 'https://github.com/Raffi1202/lua-studio/releases/tag/v0.12.0', prerelease: true },
    { tag_name: 'v0.13.1', html_url: 'https://github.com/Raffi1202/lua-studio/releases/tag/v0.13.1', prerelease: true },
    { tag_name: 'v0.14.0', html_url: 'https://github.com/x', draft: true }]
  assert.deepStrictEqual(await U.pruefen('0.13.0', antwort(liste)), { neu: true, version: '0.13.1', url: liste[1].html_url })
  assert.deepStrictEqual(await U.pruefen('0.13.1', antwort(liste)), { neu: false })
  assert.strictEqual((await U.pruefen('0.13.0', antwort([], false))).neu, false)
  assert.strictEqual((await U.pruefen('0.13.0', async () => { throw new Error('offline') })).fehler, 'offline')
  assert.deepStrictEqual(await U.pruefen('0.1.0', antwort([{ tag_name: 'v9.0.0', html_url: 'https://boese.example/x' }])), { neu: false }, 'nur Links auf github.com')
})

test('Update und Tour: Texte DE/EN vollständig, Tour mit 8 Schritten', () => {
  const de = require('../src/sprachen/de.json'), en = require('../src/sprachen/en.json')
  const quelle = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'oberflaeche', 'tour.js'), 'utf8')
  const keys = [...new Set([...quelle.matchAll(/text\('(\w+)'/g), ...quelle.matchAll(/\{ k: '(\w+)'/g)].map((m) => m[1]))]
  assert.strictEqual(keys.filter((k) => /^tour\d$/.test(k)).length, 8)
  for (const k of keys) { assert.ok(de[k], `de ${k}`); assert.ok(en[k], `en ${k}`) }
})
