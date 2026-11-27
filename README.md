<img src="bau/logo/lua-studio-logo.svg" alt="Lua-Studio logo" width="96" align="right">

# Lua-Studio

🇬🇧 English · 🇩🇪 [Deutsch](README.de.md) · Documentation: [Wiki (English)](wiki/Home.md#english)

This project is open source and free. If you like it, you can support it with a donation:

<a href="https://paypal.me/RaphaelHunziker"><img src=".github/paypal-donate.png" alt="Donate with PayPal" width="200"></a>

> **Pre-release / public beta.** Tested on a real radio only on the X18RS. Use at your own risk.

A program for Mac and Windows that belongs to our FrSky Ethos Lua widgets (Electric, Heli, Jet, Glider, Gas Engine, DLG). Principle: **the PC thinks, the radio displays.**

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

## Tutorial, undo, update notice (from 0.13.0)

- **Tutorial:** a guided tour with 8 steps on the first start and via Help → Tutorial (see the [wiki](wiki/en/Tutorial.md)).
- **Undo / redo:** every layout change, buttons ↶ ↷, Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z or Ctrl+Y.
- **New version notice:** on start Lua-Studio asks the public GitHub API at most once a day for newer releases (pre-releases included) and shows a bar with a link to the release page. No download, no installation, no personal data sent (only the normal request to api.github.com). Off via Help → Check for updates.

## One layout for all models (from 0.14.0)

Transfer or «Save as file» with «All models (default)»: the file `Standard.<lua>.lua` is used by the Lua for every model without its own studio file (needs a new version of the Lua). Changes on the radio stay per model.

## Supported Luas

| Lua | Studio support |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) 0.10.2 | format 2, «also when motor off» |
| [Heli](https://github.com/Raffi1202/heli-lua) 1.16.0 | format 2, «also when motor off» |
| [Jet](https://github.com/Raffi1202/jet-lua) 0.7.1 | format 2, «also when motor off» |
| [Glider](https://github.com/Raffi1202/glider-lua) 0.7.4 | format 1, «also when motor off» |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) 1.14.0 / 0.14.0 | format 1, «also when motor off» |
| [DLG](https://github.com/Raffi1202/dlg-lua) 0.3.3 (discus launch glider) | format 2, FLIGHT page only; no motor switch |

Luas with format 2 also get decoration and templates; for format 1 the studio writes the file without them. Symbols and bold units are **removed from 0.11.0**: old projects load without them (one-time note), old symbol images on the radio are offered for deletion.

## Known limitations

- **Frame rate:** about 25 frames per second measured on a Mac with the X18RS (radio answers in about 5–20 ms). Not yet measured with a real radio on Windows.
- Tested on a real radio only with the X18RS on a Mac.
- The programs are not signed (no certificates from Apple or Microsoft).
- «Models» only writes to the radio folder `scripts/studio` (old files are backed up on the PC) and needs a Lua with studio support.

## License

GPL-3.0-or-later, see [LICENSE](LICENSE).

## Related projects

| Project | What it does |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) | Ethos widget for electric models |
| [Heli](https://github.com/Raffi1202/heli-lua) | Ethos widget for helicopters with telemetry (any flybarless system) |
| [Jet](https://github.com/Raffi1202/jet-lua) | Ethos widget for turbines (several ECU brands) |
| [Glider](https://github.com/Raffi1202/glider-lua) | Ethos widget for gliders (vario, thermals) |
| [DLG](https://github.com/Raffi1202/dlg-lua) | Ethos widget for discus launch gliders (launch height, F3K) |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) | Ethos widgets for gas engines |

## Automation (for developers)

Lua-Studio has a control interface for tests and automation: state as JSON, commands through the same functions as the user interface, preview as data, error log from a line number, plus an MCP server for Claude Code. It is **off by default** and only starts with `--steuerung` (or `LUA_STUDIO_STEUERUNG=1`); it listens on 127.0.0.1 with a random key per start. Setup and security notes: [tools/mcp/README.md](tools/mcp/README.md). Flow test: `npm run test:steuerung`.

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
