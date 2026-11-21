# Testleitfaden Lua-Studio 0.2.0

Danke, dass du Lua-Studio testest! Arbeite die Testfälle der Reihe nach durch und hake ab, was so klappt wie beschrieben.
Klappt etwas nicht, melde es (ganz unten steht wie). Der ganze Durchgang dauert etwa 20 Minuten.

*English testers: the program and the manual are also in English (`docs/Lua-Studio - Manual.pdf`). Switch the
program to EN at the top right. The test cases below follow the manual. Report problems with the issue template
«Fehler / Bug».*

## Was du brauchst

- Mac (Apple-Chip oder Intel) oder Windows-PC (64 Bit).
- FrSky-Sender mit Ethos **26.2** oder neuer und Farbdisplay, dazu ein USB-**Daten**kabel. Am echten Sender getestet
  ist bisher nur die **X18RS** am Mac. Ein Test mit einem anderen Sender oder unter Windows hilft besonders.
- Die passende Datei aus dem GitHub-Release v0.2.0 (Seite «Releases» rechts im Repo):
  `…-mac-arm64.dmg` (Mac mit Apple-Chip), `…-mac-x64.dmg` (Mac mit Intel) oder `…-win-x64.exe` (Windows).
- Die Anleitung `docs/Lua-Studio - Anleitung.pdf`. Die Testfälle verweisen auf ihre Kapitel.

**Sicherheit:** Lua-Studio bedient die Funke so, als würdest du selbst tippen. Teste am Tisch, Antrieb aus bzw.
Propeller ab, und ändere in den Menüs nichts, was du nicht auch von Hand ändern würdest. «Funke live» (Fälle 1–16)
schreibt keine Dateien auf die Funke; «Modelle» (Fälle 17–25) nur in den Ordner `scripts/studio`.

Notiere dir für eine Meldung: Computer und Betriebssystem, Sender, Ethos-Version (System › Info).

## Testfälle

### 1. Installieren und starten (Anleitung Kapitel 3)
- [ ] Mac: DMG öffnen, Lua-Studio nach «Programme» ziehen, starten (beim ersten Mal «Trotzdem öffnen», Kapitel 3).
      Windows: EXE doppelklicken (bei SmartScreen «Weitere Informationen» › «Trotzdem ausführen»).
- **Erwartet:** Nach höchstens 10 s erscheint das Fenster «Lua-Studio» mit dem Reiter «Funke live». Es gibt keine Fehlermeldung.

### 2. Ohne Funke
- [ ] Keine Funke angesteckt. Oben die Liste «Verbindung» ansehen.
- **Erwartet:** Dort steht «Keine Funke gefunden – im Serialmodus einstecken». Der Knopf «Verbinden» ist grau.
  In der Mitte steht «Noch kein Bild – zuerst verbinden.»

### 3. Sprache
- [ ] Oben rechts auf **EN** klicken, danach auf **DE**.
- **Erwartet:** Alle Beschriftungen wechseln vollständig auf Englisch und wieder zurück. Nach einem Neustart bleibt die zuletzt gewählte Sprache.

### 4. Funke finden (Kapitel 4)
- [ ] Funke einschalten, per USB anstecken, auf der Funke **Serial** wählen. Im Studio **Neu suchen**.
- **Erwartet:** Die Funke erscheint mit ● in der Liste und ist gewählt. Der Knopf «Verbinden» ist blau.

### 5. Verbinden und erlauben (Kapitel 4)
- [ ] **Verbinden** klicken. Auf der Funke die Abfrage zur Fernsteuerung bestätigen.
- **Erwartet:** Erst steht oben «Bitte am Sender die Fernsteuerung erlauben» (gelber Punkt). Nach dem Bestätigen steht
  dort «Verbunden» (grüner Punkt) mit Sender und Ethos-Version. Nach einigen Sekunden erscheint das Display der Funke.
  Der Knopf heisst jetzt «Trennen».

### 6. Bild folgt der Funke
- [ ] Auf der Funke selbst eine Taste drücken (z. B. SYS). 10 Sekunden warten.
- **Erwartet:** Das Bild im Studio zeigt nach Sekundenbruchteilen dasselbe wie die Funke. Oben rechts stehen am Mac rund 20–25 Bilder/s (bitte den Wert und dein System melden, besonders unter Windows).

### 7. Tasten (Kapitel 5)
- [ ] Rechts nacheinander **MDL**, **RTN**, **SYS**, **RTN**, **DISP**, **RTN** klicken. Nach jedem Klick kurz warten.
- [ ] Danach mit der Tastatur: auf eine leere Stelle des Fensters klicken (nicht ins Bild der Funke), dann **F2** (MDL), **Esc** (RTN).
- **Erwartet:** Die Funke wechselt jedes Mal ins richtige Menü und zurück, das Bild folgt.

### 8. Drehrad (Kapitel 5)
- [ ] Im Menü MDL die Maus über das Bild der Funke halten und das Mausrad eine Raste drehen, dann die Pfeiltaste ↓, dann ↑. Danach die Knöpfe «⟳ +1» und «⟲ −1».
- **Erwartet:** Die Markierung auf der Funke wandert je einen Schritt weiter bzw. zurück.

### 9. Tippen und wischen (Kapitel 5)
- [ ] Im Menü MDL auf eine Kachel klicken (z. B. «Stoppuhren»), dann **RTN**.
- [ ] Auf dem Hauptbildschirm mit gedrückter Maustaste waagrecht ziehen (falls es mehrere Hauptseiten gibt).
- **Erwartet:** Die angeklickte Kachel öffnet sich auf der Funke. Das Wischen wechselt die Seite wie mit dem Finger.

### 10. Lange drücken (Kapitel 5)
- [ ] Haken **Lang drücken** setzen, dann **PAGE** klicken. Oder **Umschalt + Tab**.
- **Erwartet:** Die Funke reagiert wie auf einen langen Druck auf PAGE. Danach ist der Haken wieder weg.

### 11. Text (Kapitel 5, freiwillig)
- [ ] Auf der Funke ein Textfeld öffnen, z. B. Modell › Modell-Konfig. › Name antippen. Im Studio ins Feld
      «Text in die Bildschirmtastatur» `Test` tippen, **Senden**. Danach auf der Funke abbrechen (RTN), nicht speichern.
- **Erwartet:** Der Text erscheint im Textfeld der Funke.

### 12. Grösse und Bildschirmfoto (Kapitel 5)
- [ ] **Grösse** auf 100 %, 200 % und wieder «Einpassen» stellen. Bei 200 % das Fenster verkleinern und in alle Richtungen scrollen.
- [ ] **Bildschirmfoto** klicken und speichern.
- **Erwartet:** Das Bild wird scharf grösser und kleiner, bei 200 % sind alle Ränder erreichbar. Die PNG-Datei zeigt das Display.

### 13. Lua-Log (Kapitel 5)
- [ ] Rechts unten «Lua-Log der Funke» ansehen, während ein Lua-Widget läuft.
- **Erwartet:** Zeilen erscheinen, sobald Skripte etwas ausgeben. Fehlerzeilen sind rot. Ist die Liste leer, geben deine
  Skripte gerade nichts aus; das ist kein Fehler.

### 14. Trennen und neu verbinden
- [ ] **Trennen** klicken. Dann **Verbinden** und auf der Funke erneut erlauben.
- **Erwartet:** Nach dem Trennen steht «Nicht verbunden». Das Verbinden klappt wieder wie in Testfall 5.

### 15. Kabel ziehen
- [ ] Während der Verbindung das USB-Kabel ziehen.
- **Erwartet:** Oben steht «Verbindung getrennt: Die Verbindung zur Funke wurde getrennt» oder «Verbindung getrennt: Fehler an der USB-Schnittstelle (…)» (roter Punkt). Das Programm
  bleibt bedienbar. Nach dem Einstecken (Serial) wie Testfall 4 und 5 wieder verbinden.

### 16. Abfrage nicht bestätigen
- [ ] **Verbinden** klicken und die Abfrage auf der Funke **ablehnen** (oder 2 Minuten nichts tun).
- **Erwartet:** Oben steht sofort «Verbindung fehlgeschlagen: Die Fernsteuerung wurde am Sender abgelehnt» bzw. nach
  2 Minuten «… nicht erlaubt (Zeit abgelaufen)». Kein Absturz, «Verbinden» geht wieder.
- *Hinweis: Das Ablehnen ist bisher nur mit einer nachgespielten Funke getestet. Deine Rückmeldung dazu hilft besonders.*

## Modelle einstellen (ab Lua-Studio 0.2.0)

Dazu brauchst du ein Lua mit Studio-Unterstützung auf der Funke (siehe Anleitung Kapitel 6) und ein Modell, das dieses
Lua als Widget benutzt. **Vorher in der FrSky Suite eine Sicherung des Senders machen.** Lua-Studio schreibt nur in den
Ordner `scripts/studio`; die alten Dateien sichert es am PC.

### 17. Modelle laden (Kapitel 6)
- [ ] Das Modell auf der Funke einmal laden. Im Studio Reiter **Modelle**, Quelle **Verbundene Funke** (oder SD-Laufwerk), **Modelle laden**.
- **Erwartet:** Das Modell steht mit seinem Namen und dem Lua in der Liste.

### 18. Anordnung ändern
- [ ] Modell anklicken. Ein Kästchen verschieben, eines grösser ziehen, eines hinzufügen, eines entfernen.
- **Erwartet:** Die Kästchen folgen der Maus im Raster. Überlappt eines oder liegt es auf der grau schraffierten Leiste, wird es rot.

### 19. Kästchen gestalten
- [ ] Bei einem Kästchen Wert, Darstellung (z. B. Ring, Balken, Kurve), Beschriftung, Farbe und eine Farbstufe ändern.
- **Erwartet:** Die Vorschau ändert sich sofort. Oben rechts steigt die Zahl der Angaben, bleibt aber unter 1100.

### 20. Grenzwerte
- [ ] Reiter **Grenzwerte & Einstellungen**: bei einem Wert die Warnung ändern, bei einem anderen **Aus** setzen.
- **Erwartet:** Die Felder zeigen zu Beginn die Werkgrenzen des Luas als Zahl. Ein geleertes Feld heisst «diese Stufe aus». Bei «Aus» sind die Felder gesperrt.

### 21. Übertragen (Kapitel 6)
- [ ] Reiter **Übertragen**, **Auf die Funke übertragen**.
- **Erwartet:** Die Schritte erscheinen grün: Datei erstellt und geprüft, alte Datei gesichert bzw. keine vorhanden, geschrieben und verglichen, Modell neu geladen (oder Hinweis, das Modell selbst zu wechseln).

### 22. Auf der Funke kontrollieren
- [ ] Auf der Funke das Widget ansehen (oder im Reiter **Funke live**).
- **Erwartet:** Die Kästchen stehen wie im Studio, mit den gewählten Darstellungen und Farben. Unten im Widget steht kein Hinweis «Studio-Datei kaputt».

### 23. Änderung an der Funke übernehmen
- [ ] Auf der Funke im Widget-Menü einen Grenzwert oder die Akku-Kapazität ändern. Im Studio **Modelle laden**, Modell öffnen, Reiter **Übertragen**.
- **Erwartet:** Das Studio zeigt «Auf der Funke geändert: …». Mit gesetztem Haken übertragen: Die Änderung steht danach im Studio und auf der Funke.

### 24. Vorlage und Kopieren
- [ ] Bei einem Modell **Als Vorlage speichern** (Name eingeben). Bei einem anderen Modell desselben Luas die Vorlage laden.
- **Erwartet:** Anordnung, Grenzwerte und Einstellungen sind übernommen.

### 25. Zurück auf Standard
- [ ] Vorlage «Standard des Luas» laden und übertragen.
- **Erwartet:** Die Funke zeigt wieder die eingebaute Belegung des Luas.

## English short version

Same order as above; expected results in brackets. Use the English program language (EN, top right).
1. Install and start (window «Lua-Studio» within 10 s). 2. Without radio («No radio found – plug it in using serial
mode», Connect greyed out). 3. Switch EN/DE (all labels change; kept after restart). 4. Plug in the radio, choose
**Serial**, click **Search again** (radio marked ●). 5. **Connect**, allow on the radio («Please allow remote control
on the radio», then «Connected» and the display). 6. Press a key on the radio itself (picture follows within a fraction of a second; report the frames/s shown top right).
7. Buttons MDL/RTN/SYS/RTN/DISP/RTN, then click an empty spot of the window and press F2, Esc (radio follows).
8. Mouse wheel with the pointer over the picture, arrow keys, ⟳ +1 / ⟲ −1 (selection moves one step). 9. Click a tile,
RTN; drag horizontally on the main screen (tile opens; page changes). 10. Tick **Long press**, click PAGE (long press;
tick clears). 11. Optional: open a text field on the radio, send `Test`, cancel on the radio (text appears).
12. Size 100/200 %/Fit, screenshot (sharp; all edges reachable at 200 %; PNG saved). 13. Lua log (lines while
scripts print; errors red). 14. Disconnect, connect again (works like 5). 15. Pull the cable («Connection lost: …»).
16. Refuse the prompt on the radio («Connection failed: Remote control was refused on the radio» right away, or the
time-out message after 2 minutes). From 0.2.0, tab «Models» (manual chapter 6, back up the radio first): 17. load
models (model listed). 18. move, resize, add, remove boxes (red when overlapping or on the hatched bar). 19. change value,
display, label, colour, colour step (preview follows; entries below 1100). 20. limits: change a warning, set «Off»
(factory limits shown as numbers, fields locked when off). 21. Transfer (all steps green). 22. check on the radio (same layout, no «broken» note).
23. change a limit in the widget menu, transfer with the box ticked (change taken over). 24. save and load a template.
25. load «Lua default» and transfer (built-in layout back). Report problems as described below (template «Fehler / Bug», English is fine).

## Fehler melden

1. Im Repo auf **Issues › New issue › Fehler / Bug**.
2. Ausfüllen: Lua-Studio-Datei, Computer, Sender und Ethos-Version, Nummer des Testfalls, Schritte, was du erwartet
   hast und was passiert ist (Text der Statuszeile oben wörtlich).
3. Bildschirmfoto des Studio-Fensters anhängen (Handyfoto genügt), bei Lua-Fehlern auch die Zeilen aus «Lua-Log der Funke».
4. Bitte keine Modelldateien und keine persönlichen Daten anhängen.

Wünsche und Ideen bitte mit der Vorlage **Wunsch / Idee**.
