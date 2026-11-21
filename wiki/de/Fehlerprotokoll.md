🇬🇧 [English](../en/Error-log.md) · 🇩🇪 [Deutsch](../de/Fehlerprotokoll.md)

# Fehlerprotokoll & Support-ZIP

Lua-Studio schreibt in einem **Fehlerprotokoll** mit, was passiert: Start (Version, Betriebssystem), Verbinden und Trennen, Modelle laden, jeden Schritt beim Übertragen, Funken-Schnelltest, Sperren des Grössenwächters und **jeden Fehler** mit der Stelle im Programm. So lässt sich ein Absturz auch nachträglich finden.

1. Wenn etwas schiefgeht: Lua-Studio offen lassen (oder neu starten), die Funke möglichst **verbunden lassen**.
2. Oben rechts **Hilfe ▾ → Fehlerprotokoll …** (am Mac auch in der Menüleiste unter «Hilfe»).
3. **Für Support speichern (ZIP) …** wählen. Vorschlag: Schreibtisch, Name «Lua-Studio Fehlerprotokoll &lt;Datum>.zip».
4. Die ZIP-Datei per Mail oder Messenger schicken, dazu kurz: was du gemacht hast und was passiert ist.

**Was in der ZIP steht:** das Protokoll (`lua-studio.log`, `lua-studio-alt.log`), `system.txt` (Versionen von Lua-Studio, Betriebssystem, Funke). Bei verbundener Funke dazu die letzten 400 Zeilen des Lua-Logs der Funke und die Info-Dateien der Luas (`*.info.json`). **Nicht** drin: Studio-Projekte, Modelldateien, Seriennummern. Der Benutzerordner ist überall durch `~` ersetzt. **Aber:** Die Info-Dateien nennen die Modelle der Funke mit Modellname, Speicherort des Modells (mit Ordnername) und Sensorliste (Name, AppID, Physical ID). Das braucht man zum Zuordnen; wer es nicht weitergeben will, schaut die ZIP vorher an.

**Stufen:** *normal* (Standard) schreibt die Ereignisse und alle Fehler. *ausführlich* schreibt zusätzlich jeden Befehl an die Funke (gekürzt) und das ganze Lua-Log der Funke; nur einschalten, wenn man darum gebeten wird, und den Fehler dann nochmals auslösen. *aus* schreibt nichts, auch keine Fehler.

**Ablage:** Mac `~/Library/Application Support/Lua-Studio/Protokoll`, Windows `%APPDATA%\Lua-Studio\Protokoll` (Knopf **Ordner öffnen**). Höchstens zwei Dateien zu je 1 MB; ist die laufende voll, wird sie zur alten und die vorherige alte fällt weg. **Löschen** leert das Protokoll.

Wer ein GitHub-Konto hat, kann den Fehler auch als Issue mit der Vorlage **Fehler / Bug** melden und die ZIP anhängen.

---
[← Start](../Home.md) | [Zurück](Symbole.md) | [Weiter →](FAQ.md)
