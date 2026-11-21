'use strict'
// Steuerschnittstelle (0.10.0): ohne Parameter bzw. Variable aus; mit --steuerung oder LUA_STUDIO_STEUERUNG=1 an
const test = require('node:test')
const assert = require('node:assert')
const { aktiv } = require('../src/main/steuerung')

test('Steuerung nur mit --steuerung oder LUA_STUDIO_STEUERUNG=1', () => {
  assert.strictEqual(aktiv(['electron', '.'], {}), false)
  assert.strictEqual(aktiv(['electron', '.'], { LUA_STUDIO_STEUERUNG: '0' }), false)
  assert.strictEqual(aktiv(['electron', '.', '--steuerung'], {}), true)
  assert.strictEqual(aktiv(['electron', '.'], { LUA_STUDIO_STEUERUNG: '1' }), true)
})
