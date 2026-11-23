🇬🇧 [English](../en/FAQ.md) · 🇩🇪 [Deutsch](../de/FAQ.md)

# FAQ & bekannte Grenzen

## Was ist Lua-Studio?

Lua-Studio ist ein Programm für Mac und Windows. Es gehört zu unseren Ethos-Luas (Electric, Heli, Jet, Glider, Gas Engine, DLG). **Funke live**: Das Display deiner FrSky-Funke erscheint am Computer, und du bedienst die Funke mit Maus und Tastatur. Das geht über ein USB-Kabel im **Serialmodus** der Funke.

**Modelle** (ab 0.2.0, Kapitel 6): je Modell Kästchen, Grenzwerte und Einstellungen am Computer einstellen und auf die Funke übertragen. Später: Flüge auswerten.

![Lua-Studio mit dem Display der Funke](../../docs/bilder/Funke%20live.png)

Bild aus dem Ethos-Simulator.

**Ab 0.13.0:** Eine geführte Tour mit 8 Schritten startet beim ersten Start (wieder über Hilfe → «Tutorial …»). Jede Änderung am Layout lässt sich mit **↶ Rückgängig** / **↷ Wiederholen** oder Cmd/Ctrl+Z bzw. Shift+Cmd/Ctrl+Z zurücknehmen (ein Ziehvorgang ist ein Schritt, je Modell bis 100 Schritte). Beim Start fragt Lua-Studio höchstens einmal am Tag bei GitHub nach einer neueren Version und zeigt dann oben einen Link auf die Release-Seite; kein Download, keine persönlichen Daten; ausschalten über Hilfe → «Nach Updates suchen».

**Ein Layout für alle Modelle (ab 0.14.0):** Beim Übertragen und bei «Als Datei speichern» wählst du unter «Gilt für» entweder «Nur dieses Modell» oder «Für alle Modelle (Standard)». Bei «alle» heisst die Datei `Standard.&lt;lua>.lua` (z. B. `Standard.glider.lua`). Das Lua nimmt sie für jedes Modell ohne eigene Studio-Datei; Reihenfolge: Wahl im Widget-Menü «Studio-Layout», dann die Datei des Modells, dann Standard, sonst die eingebaute Anzeige. Änderungen am Sender bleiben je Modell. Ein Standard-Projekt ohne echtes Modell legst du unter «+ Vorbereiten» mit «Standard für alle Modelle» an. Ein Modell, das wirklich «Standard» heisst, gilt ebenfalls für alle. Die Luas brauchen dafür eine neue Version; Lua-Studio warnt, wenn das Lua auf der Funke zu alt ist. Der Schnelltest zeigt «(Standard)», wenn das Lua die Standard-Datei liest.

## Bekannte Grenzen

- **Bildtempo:** Am Mac mit der X18RS gemessen rund 25 Bilder pro Sekunde. Unter Windows ist die Verbindung mit echter Funke noch nicht gemessen.
- Am echten Sender getestet ist nur die **X18RS** mit Ethos 26.2.0 am Mac. Andere Sender und die Verbindung unter Windows sind noch nicht mit einer echten Funke getestet.
- Die Programme sind nicht signiert (siehe Kapitel 3).
- Während Lua-Studio verbunden ist, kann kein anderes Programm (z. B. die FrSky Suite) die Serial-Verbindung nutzen.

---
[← Start](../Home.md) | [Zurück](Fehlerprotokoll.md) | [Weiter →](Fehlerbehebung.md)
