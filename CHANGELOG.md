# Changelog

New entries in English. Older entries in German.

## 0.14.0 (22 Nov 2026)

- **One layout for all models:** «Applies to: This model only / All models (default)» when transferring and with «Save as file». «All» writes `Standard.<lua>.lua`, which the Luas use for every model without its own studio file (order: widget menu choice → model file → default → built-in). «Take over radio changes» is off for the default file, `.funke.lua` stays per model.
- Default project without a real model: «+ Prepare → Default for all models» (ID «Standard»).
- Quick test shows «(Standard)» when the Lua reads the default file (`studioWahl: "standard"`).
- Warning when the Lua on the radio is older than the version that knows the default file.
- Tutorial step 8 mentions «All models (default)»; manual, README and wiki.

## 0.13.0 (22 Nov 2026)

- **Tutorial:** guided tour with 8 steps (choose Lua → model and ID → template → click a field → limits and alarm → preview → transfer or «Save as file» → quick test), highlighted step by step, DE/EN, skippable (Esc), on the first start and via Help → «Tutorial …». Uses a practice model «Tutorial» and offers to delete it at the end. Wiki page «Tutorial» / «Erste Schritte» with pictures.
- **Undo / redo** for every layout change (move, resize, add, delete, value/display/title/colour, limits, template, arrange/align): buttons ↶ ↷ with tooltip («Undo: field moved»), Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y, Mac menu «Edit». One drag is one step; up to 100 steps per model; kept after a transfer. Replaces the one-step undo after arranging.
- **New version notice:** on start at most once a day one request to the public GitHub API (releases incl. pre-releases); if newer, a bar «New version x.y.z available – Download / see changes» links to the release page. No download, no installation, no personal data. Switch «Check for updates» in the Help menu (default on). Silent without internet.
- DLG: template «Current look» 784×316 with 39 px flight mode band (from DLG).
- Control interface: commands `tour`, `rueckgaengig`, `wiederholen`; window pictures are redrawn before capture.

## 0.12.0 (22 Nov 2026)

- **New Lua: DLG 0.2.0** (discus launch glider, Lua-Studio format 2, no symbols): description `src/luas/dlg.json`, studio files `.dlg.lua` in `scripts/studio`.
- **Preview like the Lua** for DLG (`src/dlg/ansicht.lua`): tiles without border, values light blue, flight mode band in the mode colour; status bar with «OK» pill and the page buttons FLIGHT / F3K / LAUNCHES drawn as reserved areas.
- **Template «Original (like the Lua)»** for DLG: FLIGHT page with the flight mode band on top, for all window sizes (converted sizes keep clear of the status bar and page buttons; the band gets its minimum height from the row below). DLG's own templates «Current look» and «F3K contest» are offered too.
- DLG has no motor switch: «also when motor off» is read but has no effect.

## 0.11.2 (22 Nov 2026)

- **Own logo** (user's choice: a stylised radio screen with header bar and coloured layout tiles): app icon for Mac (`.icns`), Windows (`.ico`) and Linux (`.png`), window and taskbar icon, logo in README and wiki. Own design, no third-party marks or icons. Source: `bau/logo/lua-studio-logo.svg`.

## 0.11.1 (22 Nov 2026)

Clean-up after removing the symbols:
- Templates «with symbols» of Heli and Jet removed (only «standard» is offered).
- Dead code removed: symbol editor for decoration, symbol drawing in the preview, symbol images (`src/symbole/`, 36 SVG files and the Tabler Icons licence; no icons are shipped any more), unused texts.
- README (EN/DE): symbols marked as removed from 0.11.0.
- Reference `studio_symbole.lua` (format 2) as in Electric 0.8.1 (decoration only).

## 0.11.0 (22 Nov 2026)

User decision: **symbols are removed completely.**
- No symbol choice in the box editor, no symbol decoration, no symbols in templates; no symbol images are transferred (also no 12/16 px masks). The switch «All symbols off» is gone.
- Old projects and studio files with symbols are loaded, the symbols dropped and the note «Symbols are no longer supported and were removed» is shown once; the layout stays.
- Old symbol images on the radio (studio/symbole) are offered for deletion with the tick «Delete symbols», as before.
- Size guard without the lines «Symbols» and «Image memory». Format 2: the symbol part is marked «dropped from 0.11.0».

## 0.10.7 (22 Nov 2026)

- **Preview like Electric 0.7.5 (32d26db):** the header symbol sits at x + margin, centred on the title line when its edge is not higher than the title (floor of the title height), otherwise top left as before. The reference `studio_symbole.lua` of format 2 is updated (small masks 12/16 px only by file name, one attempt each, not counted towards the 20 symbols).

## 0.10.6 (22 Nov 2026)

User decision «symbols as large as the text» (like Electric 0.7.5; Heli and Jet follow):
- **Box header:** the title keeps its normal size, with or without symbol. The symbol is the largest size not higher than the title (12 or 16 px, rarely 24), centred on the title line.
- **Small masks 12 and 16 px:** for every box symbol Lua-Studio also creates and transfers `name_12.png` and `name_16.png` (drawMask does not scale). They are not listed in `symbole` (the Lua limit of 20 entries stays; older Luas read the file unchanged) and do not count towards the 20 symbols of the size guard; the image memory includes them.
- **All symbols off** (per model, next to «Template»): no symbols in the studio file and no symbol images; the preview shows no symbols; the chosen symbols stay in the project. No new field in the format.

## 0.10.5 (22 Nov 2026)

- **Unit in the title only as a word of its own** (same rule as Electric 0.7.4 and Heli 1.14.3): before it the start, a space or a bracket, after it the end, a space, a bracket or «%». «Akku %», «Strom (A)», «Speed km/h» hide the unit at the value; «Höhe max» (m), «Akku Strom» (A), «Akku%» do not.
- Boxes that reach into the header the Lua draws itself are still reported in the preview («lies on an area the Lua draws itself»).

## 0.10.4 (22 Nov 2026)

Like Electric 0.7.3 (Heli 1.14.2 and Jet 0.5.2 follow), from the transmitter test:
- **No large bold unit any more:** the choice «bold top left» is removed from the box editor; old settings and the Heli/Jet templates count as «unit at the value» (small). Works the same with older Luas.
- **No double unit:** if the unit is already in the title (e.g. «Battery %», «Current A»), the preview shows it no more at the value, like the Lua.
- **Symbol not larger than the title:** in the preview the title is as high as the symbol, at most a third of the box, like the Lua.

## 0.10.3 (22 Nov 2026)

- **Glider 0.6.2 description:** 45 settings (Glider 0.6.0 listed 51). Glider models now stay below the size guard even when every setting is changed.

## 0.10.2 (22 Nov 2026)

- **Settings in the studio file:** only values that differ from the factory value of the Lua are written (the Lua uses its factory value for missing ones). A freshly prepared Glider model (Glider 0.6.0 lists 51 settings) is no longer blocked by the size guard («entries per list 51 / 48»); more than 48 changed settings are still blocked. Files for the other Luas only lose the unchanged settings.

## 0.10.1 (22 Nov 2026)

Findings from the transmitter test X18RS under Windows:
- **Quick test right after transferring:** the Lua reads the studio file only when the widget page is visible and no checklist (failsafe) is open. Lua-Studio now repeats the quick test up to 4 times every 8 s and then says clearly «show the widget page, then repeat».
- **«No sensors»:** the warning names the field (`sensoren` of the info file) and the likely cause on the Lua side (sensor list asked with a table instead of the number, format 2 §7.3).
- **Error log:** studio folders are named with their location («intern /scripts/studio», «SD:/…», «RADIO:/…»); a folder that cannot be read shows «not readable (status …)», an empty folder is fine.
- **Box editor:** fields have a fixed id/name (`eig-wert`, `eig-darstellung`, …) and an aria label, for accessibility and automation; new control command `waehle {index}`. Confirmations are answered automatically when a command runs over the control interface.

## 0.10.0 (22 Nov 2026)

- **Control interface for tests and automation** (off by default; only with `--steuerung` or `LUA_STUDIO_STEUERUNG=1`): 127.0.0.1 only, random port, random key per start, `steuerung.json` readable only by the user and deleted on quit. State as JSON, commands through the same functions as the user interface (connect, models, prepare, templates, arrange, boxes, limits, transfer, «Save as file» and support ZIP with a path instead of a dialog, quick test, language, tabs), preview as data (PNG only on request), error log from a line number.
- **MCP server** in `tools/mcp/` (no dependencies) with `lua_studio_state`, `lua_studio_do`, `lua_studio_preview`, `lua_studio_log`; setup for Claude Code on Mac and Windows.
- Flow test `npm run test:steuerung` over the interface (replaces the screenshot self-test «motoraus»), including a check that the interface is unreachable when off.
- **Glider:** second template «Original (pure glider)» with «signal» in the third ring instead of «drive battery».
- After «Save as file» newer Luas show only «Saved» plus the short hint.
- Heli 1.14.1 description included.

## 0.9.0 (22 Nov 2026)

- **Studio layout is always found** (with Electric 0.7.0, Heli 1.14.0, Jet 0.5.0, Glider 0.6.0, Gas Engine 1.12.0 / 0.12.0): the Luas look in all studio folders, offer «Studio layout» in the widget menu and scale a view that does not fit exactly. Descriptions of these versions included.
- Radio quick test shows the new info fields: studio file used (and whether chosen in the menu), view used or scaled, note from the Lua. It warns if the Lua on the radio is older and does not know the menu choice yet.
- After «Save as file», newer Luas get a short hint (copy to `scripts/studio`, otherwise choose it in the widget menu); older Luas keep the detailed hint.
- Info files under an old Lua name (e.g. `motoren_vergaser`) are assigned to the renamed Lua and marked «old Lua on the radio – please update».
- Studio folder on the radio: without an info file of this Lua and without a Lua folder, the first folder that already holds studio files is used (Windows test).
- Cylinders/tank stay available for Gas Engine 1.11.0 / 0.11.0 and newer (fixed minimum version, not the version of the included description).

## 0.8.4 (21 Nov 2026)

- Prepared models using cylinders/tank: a warning before saving or transferring that Gas Engine 1.11.0 / 0.11.0 or newer is needed on the radio (older versions show a number there).
- «Save as file»: after saving, Lua-Studio explains the file name (model name → id, shown for the model), the window sizes the file is made for, and that the model must be changed once.
- Prepare form: hint that a layout only works in the window sizes of the group (another widget zone needs its own view).

## 0.8.3 (21 Nov 2026)

- More detail in the error log for support (#1): which studio folders on the radio were searched, what the radio returned for each (status, number of entries, info files), the chosen folder or cancel in «Choose folder», and the path of «Save as file». The user folder is replaced by `~` as before.

## 0.8.2 (21 Nov 2026)

Fixes after the first user report (Windows, X20 Pro AW, COM3):
- **«Load models» stayed empty:** the Luas write their info file to `SCRIPTS:/studio`, i.e. where the radio keeps its scripts (SD card or internal storage). Lua-Studio now looks in `SD:/scripts/studio`, `/scripts/studio` and `RADIO:/scripts/studio` and uses the folder that holds the Lua's info files; otherwise, as before, the one next to the Lua folder. If no model is found, a hint says to load the model with the widget once on the radio.
- **«Choose folder» did nothing:** the target list started with «Choose folder …» already selected, so choosing it again fired no event (all systems when no SD card drive is found). The list now starts with «— choose target —».
- **New fallback «Save as file …»** in the «Transfer» tab: saves `<id>.<lua>.lua` with a save dialog; copy it by hand to `scripts/studio` on the radio (symbols are not included).
- Drive search also recognises radio drives with `bitmaps`, `logs`, `screenshots` or `firmware` next to `scripts`.

## 0.8.1 (21 Nov 2026)

- **Gas Engine ECU 1.11.0 / Carb 0.11.0:** descriptions included. New displays from the Lua (`darstellungenExtra`): **cylinders** (`lua:cht_max`) and **tank** (`lua:tank_proz`, with «REFUELLED»), at most once per view, minimum 160 × 220 at 800 px width. Offered only for Luas whose description lists them **and** whose version on the radio is at least that version (1.11.0 / 0.11.0); otherwise, and for a second one in the same view, the display is dropped when writing (default «number»).
- Preview draws cylinders and tank like the simulator picture (example values). Template «Original» for Gas Engine: full screen like page 1 (cylinders, RPM, tank, altitude/climb/speed); the hint no longer lists cylinders and tank as not adjustable.

## 0.8.0 (21 Nov 2026)

- **Gas Engine ECU 1.10.0 / Carb 0.10.0:** preview like the Lua (`ansicht.lua`: palette like Glider, rounded boxes, fixed font steps; top bar with pills – example state) and template «Original (like the Lua)» for all six window sizes; the full screen is scaled from the compact layout, so **Gas Engine no longer starts empty**. Cylinders, tank, RPM arc with colour zones and the «VOLLGETANKT» button exist only in the built-in display of Gas Engine; a studio file cannot show them (listed in the template hint).
- **Heli:** compact top bar (784 × 316) like `kompaktLeiste` (flight time, pill, profile/rate, signal).
- **Now all Luas** (Electric, Heli, Jet, Glider, Gas Engine ECU/Carb) have the preview like the Lua and the template «Original».

## 0.7.3 (21 Nov 2026)

- **Glider:** preview like the Lua (Glider 0.5.0 `platz.lua`: own dark palette, square boxes with 1 px frame, grey centred titles, thinner ring, small grey extra line; top bar with outlined pills for flight mode and motor, signal and flight on the right – example state) and template «Original (like the Lua)». Glider has only a compact layout in its description; the full-screen sizes are scaled from it below the top bar, so **Glider no longer starts empty in full screen**.
- Gas Engine ECU/Carb (cylinders and tank as fixed parts) and the compact top bar of Heli follow in a later version.

## 0.7.2 (21 Nov 2026)

- **Heli:** preview like the Lua (Heli 1.13.1: own top bar with model name, clock, profile/rate, signal and transmitter battery; title at least 10 px, unit in the ring lower and not bold, larger status value) and template «Original (like the Lua)» for all six window sizes. New Heli models start with it.
- Converting templates to X14/X18 sizes: a box that gets too low takes the missing height from the box above it (same column).
- Glider and Gas Engine follow in a later version; until then they keep the simple preview and still start with an empty full-screen view.

## 0.7.1 (21 Nov 2026)

- Description of Heli 1.13.1 included (help texts without naming a flight controller).

## 0.7.0 (21 Nov 2026)

- **«Start empty» removed** (decision of the user): the templates are well prepared, you rather delete or move boxes. New models now start with the template «Original» where Lua-Studio has one. «Remove box» stays.
- **Jet:** preview like the Lua and template «Original (like the Lua)» for all six window sizes, as for Electric (Jet 0.4.0 draws its studio file like Electric; pill «RUNNING», «8 runs» field). On X14/X18 sizes the «runs» field becomes a normal box.
- Heli, Glider and Gas Engine follow in a later version (they keep the simple preview for now). **Until then Glider and Gas Engine still start with an empty full-screen view** (their descriptions only have a compact layout); their template «Original» comes with that version.
- Heli is described as «helicopters with telemetry (any flybarless system)»; value hints of Heli no longer name a flight controller.

## 0.6.0 (21 Nov 2026)

- **Preview like the Lua (Electric first):** the preview draws every box, the top bar and the «Flights» field the way Electric 0.6.1 draws a studio file on the radio (its drawing rules from `ansicht.lua` / `zeichnen.lua`: colours, tile frame, title size, ring with unit below, bars, graph, extra line MAX/MIN/Ø, symbols, bold unit). Example values; Ethos font sizes approximated from simulator pictures. Other Luas keep the simple preview for now.
- **Template «Original (like the Lua)»** for Electric: layout and colours of the built-in display, for all six window sizes (X14/X18 scaled from the X18RS). Only fields Electric 0.6.1 already reads – the Luas are not changed. Not possible via the studio file: footers like «6S 23,1V», the «AUF 0» button (reset), colour stripes, titles that follow the radio language (listed in the template hint). On X14/X18 sizes the «Flights» field becomes a normal box.
- English interface: «Vorbereitet L» is shown as «prepared · X18RS / X20S / X20PRO», the unit «U/min» as «rpm».

## 0.5.1 (21 Nov 2026)

- **Heli RF → Heli** (`helirf` → `heli`): description of Heli 1.13.0 included. Projects and templates on the PC move from `helirf` to `heli` once at start; an old `<id>.helirf.lua` on the radio is recognised and stays there.
- Glider description updated (reports version 0.5.0).

## 0.5.0 (21 Nov 2026)

- **Luas renamed to English:** Elektro → **Electric** (`electric`), Segler → **Glider** (`glider`), Motoren ECU → **Gas Engine ECU** (`gas_ecu`), Motoren Vergaser → **Gas Engine Carb** (`gas_carb`). Heli RF → **Heli** (`heli`) follows as soon as Heli 1.13.0 is released; until then Lua-Studio keeps `helirf` and shows it as «Heli».
- Descriptions of Electric 0.6.1, Glider 0.5.0, Gas Engine ECU 1.10.0 and Gas Engine Carb 0.10.0 included; all support «also when motor off».
- **Old names are recognised:** projects and templates on the PC are moved to the new names once at start (the old files go to `Studio/vor-umbenennung`, nothing is deleted). A studio file with the old name on the radio (e.g. `<id>.elektro.lua`) counts as an existing studio file; transferring writes the new name and leaves the old file on the radio (step «old studio file … stays»).
- Visible names Electric, Glider, Heli, Gas Engine ECU, Gas Engine Carb, Jet in the model list and the «prepare» form.
- README, manual and wiki with the new names and repository links (electric-lua, glider-lua, gas-engine-lua, heli-lua).

## 0.4.2 – first public release (21 Nov 2026)

- First public pre-release under GPL-3.0 (see `LICENSE`). README in English (`README.md`) and German (`README.de.md`), wiki in `wiki/`.
- Includes the descriptions of Heli RF 1.12.0 and Jet 0.4.0 («also when motor off», format 2 with templates; Jet status always alarms).
- Developer tests find the ethos-tools plugin via `ETHOS_TOOLS_DIR` (and the empty model via `ETHOS_LEERES_MODELL`).

## 0.4.2 (21.11.2026, interne Vorabversion)

- Beschreibungen Heli RF 1.12.0 und Jet 0.4.0 übernommen: beide melden `"beiMotorAus": true` (Spalte «auch bei Motor aus») und Format 2 mit Vorlagen; Jet markiert den Status als `immerAlarm`.
- Segler und Motoren bleiben auf dem bisherigen Stand, bis ihre neuen Versionen veröffentlicht sind.

## 0.4.1 (21.11.2026)

Wunsch des Users vom 21.11.2026: je Alarm selbst entscheiden, ob er auch bei Motor aus (z. B. SF) kommt.

- **Reiter Grenzwerte: neue Spalte «auch bei Motor aus»**, je Alarm ein Haken, Standard angehakt, dazu «alle» im Kopf
  (gemischt wird als halber Haken gezeigt). Ist ein Haken weg, zeigt ein gelbes Band oben alle Alarme, die bei Motor aus
  schweigen, und die Zeile ist gelb markiert. Fehlercodes und Abschaltgründe (`immerAlarm` in beschreibung.json) haben keinen Haken.
- **Format 2 §3.5, Schlüssel `beiMotorAus`** je Grenze: das Studio schreibt nur `beiMotorAus = false`, fehlt er, gilt true.
  Die Format-Nummer bleibt (ein älteres Lua überliest ihn, der Alarm kommt dann weiter). `.funke.lua` wird je Feld übernommen.
- Die Spalte erscheint nur bei Luas, deren beschreibung.json `"beiMotorAus": true` meldet (oder wenn das Projekt schon ein false hat).
  Meldet die Info-Datei der Funke es nicht, sagt das Band: «Das Lua auf der Funke kennt ‹auch bei Motor aus› noch nicht».
- Haken für Ansage, Vibration und «auch bei Motor aus» sind gesperrt, solange für einen Wert kein Alarm eingestellt ist
  (sonst entstünde ein Eintrag ohne Stufen, der nach Format v1 §6.5 beide Stufen ausschaltet).

Befunde aus dem Sendertest von 0.4.0 und 0.3.3 an der X18RS (21.11.2026):

- **Symbole löschen nur angekündigt und mit Haken:** Der Reiter «Übertragen» zeigt vorher, wie viele Symbol-Dateien
  auf der Funke keine Studio-Datei mehr nennt («n nicht mehr benutzte Symbole … löschen», alle Namen unter «Welche Dateien?»).
  Gelöscht wird nur mit Haken (Standard aus) und nur die angezeigten Dateien, die dann immer noch unbenutzt sind. Ohne Haken
  meldet das Übertragen «Nicht mehr benutzte Symbole bleiben auf der Funke». (Vorher löschte 0.4.0 im Test 143 Dateien ohne Ankündigung, darunter fremde Test-Masken, die keine Studio-Datei nannte.)
- **Raster: letzte Zeile füllt ihren freien Platz.** Hat die letzte Zeile weniger Kästchen als Zellen (z. B. 11 Kästchen bei 5 Spalten
  und der Fläche «Flüge» von Elektro links unten), verteilen sich ihre Kästchen über den freien Platz der Zeile statt einzeln
  in einer Zelle zu stehen. Passt das nicht (Mindestgrösse), bleibt das gleichmässige Raster.
- Anleitung Kapitel 9: Die Info-Dateien in der Support-ZIP nennen ausser den Modellnamen auch den Speicherort des Modells (mit Ordnername) und die Sensorliste (Name, AppID, Physical ID).

Nach der Prüfung: `beiMotorAus` bei Abschaltgründen (`immerAlarm`) wird nie geschrieben; «alle» ändert nur Zeilen, die nicht schon so stehen; ein Eintrag, der wieder genau den Werkgrenzen entspricht, fällt weg. Raster füllt die letzte Zeile auch, wenn sie gleich viele Kästchen wie freie Zellen hat (Lücke neben «Flüge»).

- Regel 21.11.2026 (Format v1 §6.5, Befund Heli-Prüfer): Ein Eintrag ohne Zahl-Stufe und ohne «Aus» schaltet nie ab, die Funke nimmt die Werkgrenze. Das Studio zeigt dann «Werk: …» in den leeren Feldern und erklärt es; Haken für Ansage, Vibration und «auch bei Motor aus» richten sich danach.
- Beschreibung Elektro 0.5.0 übernommen (meldet `"beiMotorAus": true`, Spalte erscheint damit bei Elektro).
- Anleitung DE/EN (Kapitel 6 und 9) nachgeführt.

## 0.4.0 (21.11.2026)

Nach der Rückmeldung des Users vom 21.11.2026 und dem Konzeptblatt «Lua-Studio – Konzept Vorbereiten und Anordnen».

- **Ohne Funke vorbereiten gut sichtbar:** Der Reiter «Modelle» zeigt, solange kein Modell offen ist, eine Startseite mit
  zwei Einstiegen: «Mit Funke einstellen» (lädt die Modelle der verbundenen Funke bzw. führt zur Verbindung) und «Ohne Funke
  vorbereiten» (öffnet das Formular). Neu oben neben den Reitern der Knopf **+ Vorbereiten**, von überall.
- **Automatisch anordnen** (ersetzt «Gleichmässig verteilen»): zerlegt die Ansicht in Zeilen und Spalten, ohne ein Kästchen
  zu zerschneiden, setzt alle Abstände und Ränder auf den Abstand G und füllt die Fläche (ganze Pixel, Rest-Pixel an einzelne
  Kästchen). Arten: «Gleich breit je Zeile», «Verhältnis behalten», «Nur verteilen», «Neu im Raster». Reservierte Flächen des
  Luas bleiben frei (Bänder oben/unten abgezogen, andere als feste Hindernisse an ihrer Stelle). Wird ein Kästchen kleiner als
  erlaubt oder greifen die Kästchen ineinander, ändert sich nichts und das Studio nennt den Grund und das Kästchen. «Rückgängig» geht.
  Elektro 800 × 480 bleibt Pixel für Pixel gleich; das Beispiel des Konzeptblatts ergibt 255/255/254 × 155/113 bei G = 5.
- Beim Strecken hält das Studio die Mindestgrössen als Untergrenze ein (Heli RF 800 × 480 lässt sich anordnen).
- Überlappende Kästchen und Kästchen auf einer Fläche des Luas werden vor dem Anordnen gemeldet (mit Nummer).
- Die Startseite zeigt die vorbereiteten Modelle zum Anklicken; «+ Vorbereiten» hebt das Formular links kurz hervor.
- Fehlerprotokoll: jedes Anordnen mit Art, Abstand und Ergebnis.
- Anleitung DE/EN nachgeführt (Kapitel 6).
- So entschieden, änderbar (Vorschläge des Konzeptblatts, Freigabe des Users 21.11.2026):
  1. Einstieg «Ohne Funke vorbereiten»: Startseite mit zwei Karten **und** Knopf «+ Vorbereiten» oben.
  2. «Automatisch anordnen» mit «Gleich breit je Zeile» als Standard, umschaltbar auf «Verhältnis behalten» und «Nur verteilen».
  3. Abstand G: Standard 5 px kompakt, 8 px Vollbild (800 × 480, 640 × 360, 480 × 320), wählbar 4 / 5 / 6 / 8 / 10 px.
  4. Der Knopf «Gleichmässig verteilen» ist ersetzt; seine Wirkung bleibt als Art «Nur verteilen»: Grössen bleiben, alle Lücken genau G,
     der übrige Platz gleichmässig an die Ränder (Inhalt mittig); liegen die Kästchen enger, nimmt das Studio den grössten Abstand, der passt.
  5. «Neu im Raster» ist die vierte Wahl in derselben Auswahl neben dem Knopf.
  6. Schmuck bleibt beim Anordnen, wo er ist.

## 0.3.3 (21.11.2026)

- **Fehlerprotokoll** (Hilfe ▾ → Fehlerprotokoll …, am Mac auch in der Menüleiste): Lua-Studio schreibt mit, was passiert,
  damit sich ein Absturz beim Kumpel schnell finden lässt.
  - Kopf je Start: Studio-Version, Betriebssystem, Electron/Node/Chrome, Sprache.
  - Ereignisse mit Zeit (ms): Verbinden und Trennen (Anschluss, Funke, Ethos-Version), Verbindung verloren, Modelle laden und öffnen,
    Übertragen mit jedem Schritt und Ergebnis, Symbole, Schnelltest-Ergebnis, Sperren des Grössenwächters, Vorbereiten.
  - Jeder Fehler mit Stack: Hauptprozess (uncaughtException, unhandledRejection), Oberfläche (Fehler, abgelehnte Promises,
    Absturz oder Hänger der Oberfläche), jede Fehlerantwort an die Oberfläche, Fehlerzeilen aus dem Lua-Log der Funke.
  - Stufen aus / normal / ausführlich; ausführlich = zusätzlich jeder Befehl an die Funke (Name, Grösse, Pfad gekürzt, Status, Dauer;
    ohne die 25 Bildabfragen je Sekunde) und das ganze Lua-Log der Funke.
  - Fenster: anzeigen, Stufe, Ordner öffnen, **Für Support speichern (ZIP)** (Protokoll, system.txt, Lua-Log der Funke,
    Info-Dateien der Luas; ohne Projekte und Seriennummern, Benutzerordner als «~»), Löschen.
  - Anleitung DE/EN: neues Kapitel 9 «Fehler melden»; Issue-Vorlage verweist auf die ZIP.
- So entschieden, änderbar:
  - Ablage `<Datenordner der App>/Protokoll`, zwei Dateien `lua-studio.log` und `lua-studio-alt.log` zu je höchstens 1 MB.
  - Standardstufe «normal»; die Stufe gilt dauerhaft (Datei `stufe.txt`).
  - Gleicher Fehler höchstens 5-mal je Start ausgeschrieben, danach jede 100. Wiederholung als Zählzeile.
  - Synchron geschrieben, damit die letzte Zeile vor einem Absturz in der Datei steht.
  - Modellnamen bleiben im Protokoll (zum Zuordnen), der Benutzerordner nicht; der Name des seriellen Anschlusses ohne die
    Seriennummer am Ende (`/dev/cu.usbmodem…`).
  - Fehlerzeilen aus dem Lua-Log der Funke und gleiche Fehler: höchstens 5-mal je Start, danach nur gezählt.
  - Der Hinweis-Dialog bei einem Absturz im Hauptprozess kommt höchstens einmal je Start.

## 0.3.2 (21.11.2026)

- **Ansicht der Funke vorwählen** (Befund aus dem Funkentest M6: gestaltet war die kompakte Ansicht, die Funke zeigte das Vollbild):
  - Beim Öffnen eines Modells wählt das Studio die Ansicht, in der das Lua auf der Funke zuletzt lief (Info-Datei «fenster»). In der Auswahl ist sie mit «● … – zeigt die Funke» markiert.
  - Wurden nur Ansichten geändert, die die Funke gerade nicht zeigt, fragt das Studio vor dem Übertragen nach.
  - Der Funken-Schnelltest meldet, wenn das Lua keine der gestalteten Ansichten zeigt.
- Übertragen ohne Angabe der Formate (z. B. aus einem Skript): Das Studio nimmt `formate` aus der Info-Datei des Modells.
- Funkentest M6 an der X18RS bestanden (21.11.2026): Lua-Studio + Elektro 0.4.0 mit Format 2. Übertragen per Serial, 7 Symbole und fette Einheiten im Vollbild 800 × 480 sichtbar, Studio-Datei vom Lua geladen.

## 0.3.1 (21.11.2026)

- **Funken-Schnelltest** (Reiter Übertragen): Nach dem Übertragen auf eine verbundene Funke prüft das Studio nach 6 s selbst; dazu gibt es einen Knopf. Ausgewertet werden:
  - die Info-Datei des Luas: Studio-Datei geladen, kaputt oder zu neu, ungültige Felder, Format, Sensorliste, Lua-Version;
  - die Log-Zeilen der Funke seit dem Übertragen: Lua-Fehler, Befehlsgrenze, Speicher, fehlende Symbole.

  Eine leere Sensorliste meldet er als Warnung (falsche Abfrage im Lua, Format v1 §14).
- Beschreibungen der Luas nachgeführt: Elektro 0.4.0 (Format 2), Jet 0.2.2 (mit Standardansichten), neu Heli RF 1.10.1. Motoren ECU 1.8.0, Motoren Vergaser 0.8.0 und Segler 0.3.0 sind unverändert dabei.

## 0.3.0 (20.11.2026)

- **Symbole** (Lua-Studio-Format 2): je Kästchen ein Symbol oben links vor der Beschriftung, Grösse 24/32/48/64 px
  (Bezug X18RS, auf X14 und X18 umgerechnet), färbt sich wie der Wert. Symbolsatz mit 34 Bildsymbolen aus dem Entwurf
  (teils Tabler Icons, MIT). Das Studio rechnet die Masken als Graustufen-PNG in der Pixelgrösse des Displays und
  schreibt nur die benutzten nach `scripts/studio/symbole/`; nicht mehr benutzte räumt es auf.
- **Einheit fett:** je Kästchen «Einheit neben dem Wert», «fett oben links» oder «keine».
- **Schmuck:** frei platzierte Symbole, Texte, Linien und Rahmen ohne Wert, höchstens 24 je Ansicht, unter den Kästchen.
- **Presets:** das Aussehen der Luas als Startvorlage (aus `vorlagen` in der Beschreibung, sonst «Standard des Luas»), «Leer anfangen».
- **Grössenwächter:** Ampel für Datei, Elemente, Tabellen, geschätzten Lua-Speicher beim Laden, Ansichten, Kästchen,
  Kurven, Listen, Schmuck, Symbole und Bildspeicher. Rot sperrt das Übertragen.
- **Ohne Funke vorbereiten:** Modell mit Displaygruppe, Lua und Modellname anlegen (Kennung nach Format v1 §2.1), gestalten
  und als Studio-Datei auf eine SD-Karte oder in einen Ordner exportieren. Beim Verbinden lässt sich die Vorbereitung
  einem Modell der Funke zuordnen («Vorbereitung übernehmen»).
- Format 2 schreibt das Studio nur, wenn die Info-Datei des Luas `formate` mit 2 meldet. Sonst schreibt es Format 1
  und meldet, was wegfällt.
- Schutz: Gibt es im Ziel dieselbe Kennung in anderer Gross-/Kleinschreibung, schreibt das Studio nichts.
- Getestet: 38 automatische Tests, Oberflächen-Selbsttest ohne Funke (Vorbereiten, Symbole, Schmuck, Export in einen Ordner), zwei unabhängige Prüfungen.
  **Noch nicht an der Funke getestet:** Format 2 braucht ein Lua, das es kann (Elektro zieht als erstes nach). Bis dahin schreibt das Studio für die heutigen Luas Format 1 wie in 0.2.0.
- **So entschieden, änderbar** (der User hat die Fragen nicht einzeln beantwortet; Liste in Lua-Studio-Format 2, Abschnitt 10):
  - Bildmasken statt Vektor-Code.
  - Spannung, Strom, Verbrauch, Energie, Drehzahl und Gas als fette Einheit statt Bild.
  - Regler, BEC, Pumpe, Governor ohne Bild (Text im Titel).
  - Schlepp erst ab 48 px, Thermik als Bild.
  - Symbol im Kästchen und Schmuck (höchstens 24 je Ansicht).
  - Höchstens 2 Ansichten.
  - Wächter-Grenzen wie im Konzept.
  - Eigenes Feld `symbolPx` je Kästchen.
  - Symbol bei allen Darstellungen oben links.
  - Grössen bezogen auf die Displaybreite.

## 0.2.0 (20.11.2026)

- Neuer Reiter **Modelle** (Etappe B): je Modell einstellen, was das Lua zeigt.
  - Kästchen frei anordnen mit Vorschau.
  - Darstellungen: Zahl, Ring, Balken waagrecht und senkrecht, Kurve, Status.
  - Je Kästchen: Beschriftung, Bereich, Farben für normal/Warnung/Alarm/Hintergrund, Farbstufen, Zusatzzeile.
  - Rot markiert: Kästchen über dem Rand, zu kleine, überlappende und solche auf Flächen, die das Lua selbst zeichnet.
- Grenzwerte je Wert mit den Werkgrenzen des Luas und ausdrücklichem «Aus», dazu Werte anpassen, Einstellungen, Vorlagen und «Von Modell kopieren».
- **Auf die Funke übertragen**, über Serial, SD-Laufwerk oder als Export in einen Ordner. Das Studio:
  - prüft die Datei mit denselben Regeln wie die Funke
  - sichert die alte Datei am PC
  - schreibt, liest zurück und vergleicht
  - übernimmt auf Wunsch Änderungen von der Funke
  - lädt das Modell neu
- Dateien nach dem Lua-Studio-Format v1, abgeglichen mit der Lua-Referenzfunktion: höchstens 15 KB und 1100 Angaben.
- Beschreibungen der Luas Elektro 0.3.0, Motoren ECU 1.8.0, Motoren Vergaser 0.8.0, Segler 0.3.0 und Jet 0.1.1 sind dabei. Heli folgt.
- **Funke live flüssig:** Auf dem Mac kamen die Antworten der Funke stark verspätet an, weil die Seriell-Bibliothek
  neue Daten zu spät meldete. Das Studio liest jetzt selbst alle 5 ms, wie FrSkys radio_remote.py. Ergebnis an der X18RS:
  Antwort 5–20 ms statt 1,9–8,1 s, rund 25 statt 0,2–0,5 Bilder/s. Die frühere Angabe «die Funke ist langsam» war falsch.
- Ausrichthilfen beim Anordnen: Einrasten an Rand und Nachbarn mit Hilfslinien, «Gleichmässig verteilen», «Zentrieren», «Rückgängig».
- Schutz: Ansichten ohne Kästchen werden nicht geschrieben (das Lua zeigt dann seine Belegung). Doppelte Modellkennungen,
  Grenzwerte ohne Richtung oder in falscher Reihenfolge und ungültige Bereiche oder Farbstufen sperren das Übertragen.
  Lässt sich die alte Datei auf der Funke nicht lesen, ersetzt das Studio nichts.
- Funke: Dateibefehle (Liste, Lesen, Schreiben, Löschen, Ordner, Modell laden), byteweise gleich wie `radio_remote.py`.
- Getestet: Studio → Elektro 0.3.0 im Ethos-Simulator X18RS 26.2.0 und an der echten X18RS (Ethos 26.2.0, Mac, Serial):
  Das Studio überträgt die Datei (5,9 KB in 0,6 s), lädt das Modell neu, und Elektro zeigt die Kästchen richtig an.
  Noch nicht an der Funke getestet: Übertragen aus der Oberfläche und die Windows-EXE.

## 0.1.1 (20.11.2026)

- Erster Test an der echten X18RS (Ethos 26.2.0): Verbinden, Bild, Tasten und Drehrad funktionieren.
- Die Funke beantwortet die Anmeldung erst, wenn die Fernsteuerung am Sender erlaubt ist. Das Studio wartet jetzt bis zu
  2 Minuten und zeigt sofort «Bitte am Sender die Fernsteuerung erlauben» (vorher Abbruch nach 10 s).
- Die X18RS liefert ein Bild erst nach 2–6 s. Die Bildanfrage wartet jetzt bis 30 s statt 10 s.
- Windows: Die EXE startete nicht, wenn die Umgebungsvariable ELECTRON_RUN_AS_NODE gesetzt war (z. B. aus VS Code).
  Das Programm ignoriert sie jetzt (Electron-Fuse runAsNode aus).
- Herausgeber in den Programmangaben: Raffi1202.
- Der Eintrag «Ethos-Simulator (Test)» erscheint nur noch für Entwickler. Ohne Funke steht «Keine Funke gefunden».
- Wird die Fernsteuerung am Sender abgelehnt, meldet das Studio das sofort, statt 2 Minuten zu warten.
- Alle Meldungen, auch die Statuscodes der Funke, sind jetzt auf Deutsch und Englisch.
- Mac: Die App wird nach dem Setzen der Fuses ad hoc signiert (sonst beendet macOS sie beim Start).
- Neu: Anleitung DE/EN (HTML und PDF), Testleitfaden für Tester, Vorlagen für Fehlermeldungen und Wünsche.

## 0.1.0 (20.11.2026)

- Erste Fassung, Etappe A «Funke live»: Das Display der Funke erscheint im Studio und lässt sich über den Serialmodus mit
  Maus und Tastatur bedienen: tippen, lange tippen, wischen, Drehrad, alle Tasten, Text in die Bildschirmtastatur.
- Es werden nur die geänderten Bildkacheln übertragen. Bildschirmfotos lassen sich als PNG speichern, und das Lua-Log
  der Funke ist im Studio zu sehen.
- Die Funke wird automatisch gefunden (USB 0483:5750). Das Studio wartet auf die Freigabe am Sender und meldet
  Abbrüche klar.
- Oberfläche auf Deutsch und Englisch.
- Getestet: Rahmen, CRC, Bildkacheln und Nutzdaten aller Befehle byteweise gegen die Vorlage `radio_remote.py`.
  Die Bedienkette lief am Ethos-Simulator X18RS 26.2.0 über einen Test-Kanal, der die Funke-Seite nachspielt.
  Der Test an der echten X18RS steht noch aus.
