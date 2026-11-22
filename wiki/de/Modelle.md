🇬🇧 [English](../en/Models.md) · 🇩🇪 [Deutsch](../de/Modelle.md)

# Modelle einstellen

Hier stellst du je Modell ein, was das Lua auf der Funke zeigt: Kästchen, Grenzwerte und Einstellungen. Das geht für die Luas mit Studio-Unterstützung (Electric, Heli, Jet, Glider, Gas Engine ECU, Gas Engine Carb und DLG; bis 21.11.2026 hiessen sie Elektro, Heli RF, Segler, Motoren ECU und Motoren Vergaser). Bei DLG (Wurfgleiter, ab 0.12.0) gilt die Studio-Ansicht nur für die Seite FLUG; die Statusleiste mit Meldezeile oben und die Seitentasten FLUG / F3K / STARTS unten zeichnet DLG selbst, die Seiten F3K und STARTS bleiben fest. DLG hat keinen Motorschalter, «auch bei Motor aus» wirkt dort nicht. Vorlagen: «Original (wie das Lua)», «Heutiges Aussehen» und «F3K-Wettbewerb». Die Funke rechnet dabei nichts nach. Sie liest nur die fertige, geprüfte Datei.

Solange kein Modell offen ist, zeigt der Reiter zwei Einstiege (ab 0.4.0): **Mit Funke einstellen** (lädt die Modelle der verbundenen Funke bzw. führt zur Verbindung) und **Ohne Funke vorbereiten** mit der Liste der vorbereiteten Modelle (anklickbar). Der Knopf **+ Vorbereiten** oben neben den Reitern öffnet das Vorbereiten-Formular von überall.

## Modelle laden

1. Das Modell einmal auf der Funke laden, damit das Lua seine Info-Datei schreibt (Modellname, Fenstergrössen, Sensoren).
2. Bei **Quelle** wählen: **Verbundene Funke** (vorher im Reiter «Funke live» verbinden), **SD-Laufwerk** (Funke im Modus Laufwerk/Speicher) oder **Ordner** (Export).
3. **Modelle laden** und das Modell in der Liste anklicken.

## Funken-Schnelltest

Nach dem Übertragen auf eine verbundene Funke prüft das Studio nach einigen Sekunden selbst, sobald die Funke das Modell neu geladen hat. Den Knopf **Funken-Schnelltest** im Reiter «Übertragen» kannst du bei verbundener Funke jederzeit drücken (bei SD-Laufwerk und Ordner gibt es ihn nicht). Das Studio liest die Info-Datei des Luas und das Lua-Log der Funke und meldet:

- ob das Lua die Studio-Datei geladen hat und ob es ungültige Felder gefunden hat;
- ob das Lua das Format kann und ob es Sensoren gefunden hat;
- auffällige Log-Zeilen, z. B. Lua-Fehler, Befehlsgrenze, Speicher oder fehlende Symbole;
- ob die Funke die geänderte Ansicht überhaupt zeigt (sonst siehst du dort keine Änderung).

Steht «Info-Datei seit dem Übertragen nicht neu geschrieben», das Modell auf der Funke einmal wechseln und erneut prüfen.

## Grössenwächter

Unten im Reiter steht immer der Grössenwächter. Er zeigt Datei, Elemente, Tabellen, den geschätzten Lua-Speicher beim Laden, Kästchen, Kurven, Listen, Schmuck, Symbole und Bildspeicher, jeweils mit Ampel. Ist eine Zeile **rot**, lässt sich nicht übertragen; der Grund steht dabei.

## Übertragen

1. Reiter **Übertragen**, dann **Auf die Funke übertragen**.
2. Das Studio prüft die Datei, sichert die alte Datei am PC, schreibt die neue, liest sie zurück und vergleicht. Bei verbundener Funke lädt es das Modell neu; sonst das Modell auf der Funke einmal wechseln.
3. Hast du an der Funke im Widget-Menü etwas geändert, zeigt das Studio die Änderungen und übernimmt sie, wenn der Haken gesetzt ist. Ohne Haken gelten sie auf der Funke weiter über der neuen Datei.
4. Hast du nur eine Ansicht geändert, die das Lua auf der Funke gerade nicht zeigt (z. B. kompakt, die Funke zeigt Vollbild), fragt das Studio vorher nach.
5. Haben zwei Modelle Namen, die sich nur in Gross-/Kleinschreibung unterscheiden, sperrt das Studio das Übertragen (sie würden sich die Datei teilen): ein Modell umbenennen.

Sicherungen liegen im Benutzerordner von Lua-Studio unter `Studio/sicherungen` (Mac: `~/Library/Application Support/Lua-Studio`, Windows: `%APPDATA%\Lua-Studio`).

---
[← Start](../Home.md) | [Zurück](Funke-verbinden.md) | [Weiter →](Ohne-Funke-vorbereiten.md)
