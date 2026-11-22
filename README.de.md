<img src="bau/logo/lua-studio-logo.svg" alt="Lua-Studio-Logo" width="96" align="right">

# Lua-Studio

🇬🇧 [English](README.md) · 🇩🇪 Deutsch · Dokumentation: [Wiki (Deutsch)](wiki/Home.md#deutsch)

> **Vorabversion / öffentliche Beta.** Am echten Sender nur an der X18RS getestet. Nutzung auf eigene Verantwortung.

Programm für Mac und Windows zu unseren Ethos-Luas (Electric, Heli, Jet, Glider, Gas Engine, DLG). Grundsatz: **Der PC denkt, die Funke zeigt an.**

**Funke live:** Das Display deiner FrSky-Funke erscheint am Computer, und du bedienst die Funke mit Maus und Tastatur
über USB im Serialmodus. **Modelle** (ab 0.2.0): je Modell Kästchen, Grenzwerte und Einstellungen der Luas am PC
einstellen und auf die Funke übertragen. Später: Flüge auswerten.

![Lua-Studio mit dem Display der Funke](docs/bilder/Funke%20live.png)

*Bild aus dem Ethos-Simulator.*


> **Umbenannt am 21.11.2026:** Elektro → Electric, Segler → Glider, Motoren ECU/Vergaser → Gas Engine ECU/Carb, Heli RF → Heli. Lua-Studio 0.5.0 zieht deine Projekte am PC auf die neuen Namen um und erkennt alte Studio-Dateien auf der Funke.

## Für welche Sender

| Sender | Stand |
|---|---|
| X18RS, Ethos 26.2.0, am Mac | am echten Sender getestet |
| andere Ethos-Sender ab 26.2 mit Farbdisplay | nicht getestet, sollte gleich funktionieren (gleiches Protokoll) |
| Verbindung unter Windows | Programm startet und läuft, Verbindung mit echter Funke noch nicht getestet |
| Ablehnen der Fernsteuerung am Sender | nur mit nachgespielter Funke getestet |

## Schnellstart

1. Datei aus dem neusten Release laden: `…-mac-arm64.dmg` (Mac mit Apple-Chip), `…-mac-x64.dmg` (Mac mit Intel) oder `…-win-x64.exe` (Windows).
2. Installieren bzw. starten. Die Programme sind nicht signiert: Mac «Trotzdem öffnen», Windows «Trotzdem ausführen» (Anleitung Kapitel 3).
3. Funke einschalten, per USB anstecken, auf der Funke **Serial** wählen.
4. Im Studio die Funke (●) wählen und **Verbinden** klicken.
5. Auf der Funke die Fernsteuerung **erlauben**. Das Display erscheint im Studio.

**Anleitung:** [Deutsch (PDF)](docs/Lua-Studio%20-%20Anleitung.pdf) · [English (PDF)](docs/Lua-Studio%20-%20Manual.pdf) ·
**Testen:** [TESTLEITFADEN.md](TESTLEITFADEN.md) · **Fehler melden:** in der App Hilfe › Fehlerprotokoll › «Für Support speichern (ZIP)», die ZIP schicken oder an ein Issue › Fehler / Bug hängen

## Bedienung kurz

| Am PC | Auf der Funke |
|---|---|
| Klick | tippen |
| Rechtsklick oder lange halten | lange tippen |
| Ziehen | wischen |
| Mausrad, ↑ / ↓ | Drehrad |
| Enter · Esc · Tab | ENTER · RTN · PAGE |
| F1 · F2 · F3 | SYS · MDL · DISP |
| Umschalt + Taste | lange drücken |

Dazu: Knöpfe für alle Tasten, Textfeld für die Bildschirmtastatur, Bildschirmfoto als PNG, Lua-Log der Funke, Deutsch/Englisch.

## Tutorial, Rückgängig, Update-Hinweis (ab 0.13.0)

- **Tutorial:** geführte Tour mit 8 Schritten beim ersten Start und über Hilfe → Tutorial (siehe [Wiki](wiki/de/Erste-Schritte.md)).
- **Rückgängig / Wiederholen:** jede Änderung am Layout, Knöpfe ↶ ↷, Cmd/Ctrl+Z und Shift+Cmd/Ctrl+Z bzw. Ctrl+Y.
- **Hinweis auf neue Version:** Beim Start fragt Lua-Studio höchstens einmal am Tag die öffentliche GitHub-API nach neueren Releases (Pre-releases eingeschlossen) und zeigt eine Leiste mit Link auf die Release-Seite. Kein Download, keine Installation, keine persönlichen Daten (nur die normale Anfrage an api.github.com). Ausschalten über Hilfe → Nach Updates suchen.

## Ein Layout für alle Modelle (ab 0.14.0)

Übertragen oder «Als Datei speichern» mit «Für alle Modelle (Standard)»: Das Lua nimmt die Datei `Standard.<lua>.lua` für jedes Modell ohne eigene Studio-Datei (braucht eine neue Version des Luas). Änderungen am Sender bleiben je Modell.

## Modelle einstellen (ab 0.2.0)

Im Reiter **Modelle** stellst du je Modell ein, was das Lua zeigt: Kästchen frei anordnen (Zahl, Ring, Balken, Kurve,
Status), Beschriftung, Bereich, Farben und Farbstufen, Grenzwerte und Einstellungen, Vorlagen. **Auf die Funke übertragen**
prüft die Datei, sichert die alte, schreibt, liest zurück und vergleicht. Das braucht ein Lua mit Studio-Unterstützung
(Lua-Studio-Format v1). Siehe Anleitung Kapitel 6.

**Ab 0.3.0** (Lua-Studio-Format 2):
- Schmuck (Texte, Linien, Rahmen), Einheit am Wert oder keine; Symbole und fette Einheit **ab 0.11.0 entfernt**;
- Presets der Luas;
- ein Grössenwächter mit Ampel;
- **ohne Funke vorbereiten**: Modell anlegen, gestalten und als Datei auf SD-Karte oder in einen Ordner exportieren.

Schmuck braucht ein Lua, das Format 2 kann. Für ältere Luas schreibt das Studio Format 1 ohne ihn. Symbole sind ab 0.11.0 entfernt: alte Projekte werden ohne sie geladen (einmaliger Hinweis), alte Symbolbilder auf der Funke bietet Lua-Studio zum Löschen an.

## Bekannte Grenzen

- **Bildtempo:** Am Mac mit der X18RS gemessen rund 25 Bilder pro Sekunde (Antwort der Funke etwa 5–20 ms). Unter Windows ist die Verbindung mit echter Funke noch nicht gemessen.
- Am echten Sender getestet ist nur die X18RS am Mac. Siehe Tabelle oben.
- Die Programme sind nicht signiert (keine Zertifikate von Apple und Microsoft).
- «Modelle» schreibt nur in den Ordner `scripts/studio` der Funke (alte Dateien werden am PC gesichert) und braucht ein Lua mit Studio-Unterstützung. An der echten X18RS getestet mit Electric (damals Elektro 0.3.0) (Mac); die anderen Luas bisher nur im Simulator.

## Unterstützte Luas

| Lua | Studio-Unterstützung |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) 0.9.0 | format 2, «auch bei Motor aus» |
| [Heli](https://github.com/Raffi1202/heli-lua) 1.16.0 | format 2, «auch bei Motor aus» |
| [Jet](https://github.com/Raffi1202/jet-lua) 0.7.0 | format 2, «auch bei Motor aus» |
| [Glider](https://github.com/Raffi1202/glider-lua) 0.7.0 | format 1, «auch bei Motor aus» |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) 1.13.0 / 0.13.0 | format 1, «auch bei Motor aus» |
| [DLG](https://github.com/Raffi1202/dlg-lua) 0.3.0 (Wurfgleiter) | format 2, nur Seite FLUG; kein Motorschalter |

## Lizenz

GPL-3.0-or-later, siehe [LICENSE](LICENSE).

## Weitere Projekte

| Projekt | Wozu |
|---|---|
| [Electric](https://github.com/Raffi1202/electric-lua) | Ethos-Widget für Elektromodelle |
| [Heli](https://github.com/Raffi1202/heli-lua) | Ethos-Widget für Helis mit Telemetrie (jedes Flybarless-System) |
| [Jet](https://github.com/Raffi1202/jet-lua) | Ethos-Widget für Turbinen (mehrere ECU-Hersteller) |
| [Glider](https://github.com/Raffi1202/glider-lua) | Ethos-Widget für Segler (Vario, Thermik) |
| [DLG](https://github.com/Raffi1202/dlg-lua) | Ethos-Widget für Wurfgleiter (Wurfhöhe, F3K) |
| [Gas Engine ECU / Carb](https://github.com/Raffi1202/gas-engine-lua) | Ethos-Widgets für Verbrennungsmotoren |

## Automatisierung (für Entwickler)

Lua-Studio hat eine Steuerschnittstelle für Tests und Automatisierung: Zustand als JSON, Befehle über dieselben Funktionen wie die Oberfläche, Vorschau als Daten, Fehlerprotokoll ab einer Zeile, dazu ein MCP-Server für Claude Code. Sie ist **standardmässig aus** und startet nur mit `--steuerung` (oder `LUA_STUDIO_STEUERUNG=1`); erreichbar nur über 127.0.0.1 mit einem Zufallsschlüssel je Start. Einrichtung und Sicherheit: [tools/mcp/README.md](tools/mcp/README.md). Ablauftest: `npm run test:steuerung`.

## Entwickeln

```
npm install
npm start                     # Studio starten (ist ELECTRON_RUN_AS_NODE gesetzt: env -u ELECTRON_RUN_AS_NODE npm start)
npm test                      # Tests; Abgleich gegen radio_remote.py, wenn ETHOS_TOOLS_DIR auf das ethos-tools plugin zeigt
LUA_STUDIO_FORMAT=<Ordner> npm test   # zusätzlich Abgleich mit der Lua-Referenz des Formats (Ordner mit der Referenz und den Testdateien)
npm run test:simulator        # Ablauftest gegen einen eigenen Ethos-Simulator (Port 8981, ETHOS_TOOLS_DIR)
npm run bauen:mac             # Mac-App (.dmg) nach ~/Library/Caches/lua-studio-bau (nicht im iCloud-Desktop: Signatur)
npm run bauen:win             # Windows-EXE (portable) nach dist/
npm run anleitung             # Anleitung DE/EN als PDF aus docs/anleitung/*.html
```

Ohne Funke verbindet sich das Studio mit einem Ethos-Simulator («Ethos-Simulator (Test)», Port 8981). Diesen Eintrag
zeigt nur das aus dem Quelltext gestartete Studio oder eines mit Umgebungsvariable `LUA_STUDIO_ENTWICKLER=1`.
Dazu muss ein Simulator auf diesem Port laufen, z. B. mit `node test/simulator-ablauf.js --offen`. Der Test-Kanal
spielt dabei die Funke-Seite des Protokolls, damit derselbe Weg wie an der echten Funke geprüft wird.

GitHub Actions (`.github/workflows/bauen.yml`) baut bei jedem Tag `v*` die Windows-EXE und die Mac-DMGs und hängt sie
an den Release. Die Mac-App wird nach dem Setzen der Electron-Fuses ad hoc signiert (`bau/adhoc-signieren.js`).

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/geraet/rahmen.js` | Rahmen, CRC-16, Befehle des Ethos-Fernsteuerprotokolls (Protokoll 11) |
| `src/geraet/bild.js` | Bildschirm: Kacheln und QOI → RGB565 → RGBA |
| `src/geraet/funke.js` | Client: Verbinden mit Freigabe, Bildschirm, Tasten, Tippen, Wischen, Drehrad, Text, Log |
| `src/geraet/kanal-seriell.js` | USB-Serial (Paket `serialport`), Suche nach Ethos-Funken (USB 0483:5750) |
| `src/geraet/kanal-simulator.js` | Test-Kanal zum Ethos-Simulator (`run_wasm.js --serve`) |
| `src/main/` | Electron-Hauptprozess und Brücke zur Oberfläche |
| `src/oberflaeche/` | Fenster «Funke live» |
| `src/sprachen/` | Texte Deutsch und Englisch |
| `docs/` | Anleitung (HTML und PDF, DE/EN), Bilder |

Das Protokoll ist nach `radio_remote.py` aus dem Ethos-Plugin von FrSky nachgebaut (gleiche Befehle und Rahmen).
In dieses Repo kommen keine Modelle und keine Daten von der Funke.
