# Lua-Studio

🇬🇧 English · 🇩🇪 [Deutsch](README.de.md) · Documentation: [Wiki (English)](wiki/Home.md#english)

> **Pre-release / public beta.** Tested on a real radio only on the X18RS. Use at your own risk.

A program for Mac and Windows that belongs to our FrSky Ethos Lua widgets (Electric, Heli, Jet, Glider, Gas Engine). Principle: **the PC thinks, the radio displays.**

**Radio live:** your FrSky radio's display appears on the computer and you operate the radio with mouse and keyboard, over USB in the radio's serial mode. **Models:** set up boxes, limits, symbols and settings of the Luas per model on the PC and transfer them to the radio – or prepare a model without the radio and export it to the SD card.

![Lua-Studio showing the radio display](docs/bilder/Funke%20live.png)

*Picture from the Ethos simulator.*


> **Renamed 21 Nov 2026:** Elektro → Electric, Segler → Glider, Motoren ECU/Vergaser → Gas Engine ECU/Carb, Heli RF → Heli. Lua-Studio 0.5.0 moves your projects on the PC to the new names and recognises old studio files on the radio.

## Radios

| Radio | Status |
|---|---|
| X18RS, Ethos 26.2.0, on a Mac | tested on the real radio |
| other Ethos radios from 26.2 with colour display | not tested, should work the same (same protocol) |
| connection on Windows | program starts and runs, connection with a real radio not yet tested |
| refusing remote control on the radio | tested with a simulated radio only |

## Quick start

1. Download from the latest release: `…-mac-arm64.dmg` (Mac with Apple silicon), `…-mac-x64.dmg` (Mac with Intel) or `…-win-x64.exe` (Windows).
2. Install or start it. The programs are not signed: Mac «Open anyway», Windows «Run anyway» (manual chapter 3).
3. Switch on the radio, connect it by USB, choose **Serial** on the radio.
4. In the studio choose the radio (●) and click **Connect**.
5. **Allow** remote control on the radio. The display appears in the studio.

**Manual:** [Wiki](wiki/Home.md#english) · [English (PDF)](docs/Lua-Studio%20-%20Manual.pdf) · [Deutsch (PDF)](docs/Lua-Studio%20-%20Anleitung.pdf) ·
**Report a problem:** in the app Help › Error log › «Save for support (ZIP)», attach the ZIP to an issue.

## Supported Luas

| Lua | Studio support |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) 0.7.0 | format 2, «also when motor off» |
| [Heli](https://github.com/Raffi1202/heli-lua) 1.14.0 | format 2, «also when motor off» |
| [Jet](https://github.com/Raffi1202/jet-lua) 0.5.0 | format 2, «also when motor off» |
| [Glider](https://github.com/Raffi1202/glider-lua) 0.6.0 | format 1, «also when motor off» |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) 1.12.0 / 0.12.0 | format 1, «also when motor off» |

Luas with format 2 also get symbols, bold units, decoration and templates; for format 1 the studio writes the file without them.

## Known limitations

- **Frame rate:** about 25 frames per second measured on a Mac with the X18RS (radio answers in about 5–20 ms). Not yet measured with a real radio on Windows.
- Tested on a real radio only with the X18RS on a Mac.
- The programs are not signed (no certificates from Apple or Microsoft).
- «Models» only writes to the radio folder `scripts/studio` (old files are backed up on the PC) and needs a Lua with studio support.

## License

GPL-3.0-or-later, see [LICENSE](LICENSE). Some symbols are based on Tabler Icons (MIT, © Paweł Kuna), list in [src/symbole/HERKUNFT.md](src/symbole/HERKUNFT.md).

## Related projects

| Project | What it does |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) | Ethos widget for electric models |
| [Heli](https://github.com/Raffi1202/heli-lua) | Ethos widget for helicopters with telemetry (any flybarless system) |
| [Jet](https://github.com/Raffi1202/jet-lua) | Ethos widget for turbines (several ECU brands) |
| [Glider](https://github.com/Raffi1202/glider-lua) | Ethos widget for gliders (vario, thermals) |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) | Ethos widgets for gas engines |

## Development

```
npm install
npm start                     # start the studio (if ELECTRON_RUN_AS_NODE is set: env -u ELECTRON_RUN_AS_NODE npm start)
npm test                      # tests; compares with radio_remote.py when ETHOS_TOOLS_DIR points to the ethos-tools plugin
LUA_STUDIO_FORMAT=<folder> npm test   # also compare with the Lua reference of the format (folder with reference and test files)
npm run test:simulator        # flow test against an own Ethos simulator (port 8981, ETHOS_TOOLS_DIR)
npm run bauen:mac             # Mac app (.dmg) into ~/Library/Caches/lua-studio-bau
npm run bauen:win             # Windows EXE (portable) into dist/
npm run anleitung             # manual DE/EN as PDF from docs/anleitung/*.html
```

Without a radio, the studio connects to an Ethos simulator («Ethos-Simulator (Test)», port 8981). Only the studio started from source or with `LUA_STUDIO_ENTWICKLER=1` shows this entry. GitHub Actions (`.github/workflows/bauen.yml`) builds the Windows EXE and the Mac DMGs for every tag `v*` and attaches them to the release. Source code, comments and the test guide ([TESTLEITFADEN.md](TESTLEITFADEN.md)) are in German.
