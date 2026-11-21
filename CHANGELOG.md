# Changelog

New entries in English. Older entries in German.

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
