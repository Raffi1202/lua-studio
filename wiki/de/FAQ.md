🇬🇧 [English](../en/FAQ.md) · 🇩🇪 [Deutsch](../de/FAQ.md)

# FAQ & bekannte Grenzen

## Was ist Lua-Studio?

Lua-Studio ist ein Programm für Mac und Windows. Es gehört zu unseren Ethos-Luas (Electric, Heli, Jet, Glider, Gas Engine, DLG). **Funke live**: Das Display deiner FrSky-Funke erscheint am Computer, und du bedienst die Funke mit Maus und Tastatur. Das geht über ein USB-Kabel im **Serialmodus** der Funke.

**Modelle** (ab 0.2.0, Kapitel 6): je Modell Kästchen, Grenzwerte und Einstellungen am Computer einstellen und auf die Funke übertragen. Später: Flüge auswerten.

![Lua-Studio mit dem Display der Funke](../../docs/bilder/Funke%20live.png)

Bild aus dem Ethos-Simulator.

**Ab 0.13.0:** Eine geführte Tour mit 8 Schritten startet beim ersten Start (wieder über Hilfe → «Tutorial …»). Jede Änderung am Layout lässt sich mit **↶ Rückgängig** / **↷ Wiederholen** oder Cmd/Ctrl+Z bzw. Shift+Cmd/Ctrl+Z zurücknehmen (ein Ziehvorgang ist ein Schritt, je Modell bis 100 Schritte). Beim Start fragt Lua-Studio höchstens einmal am Tag bei GitHub nach einer neueren Version und zeigt dann oben einen Link auf die Release-Seite; kein Download, keine persönlichen Daten; ausschalten über Hilfe → «Nach Updates suchen».

## Bekannte Grenzen

- **Bildtempo:** Am Mac mit der X18RS gemessen rund 25 Bilder pro Sekunde. Unter Windows ist die Verbindung mit echter Funke noch nicht gemessen.
- Am echten Sender getestet ist nur die **X18RS** mit Ethos 26.2.0 am Mac. Andere Sender und die Verbindung unter Windows sind noch nicht mit einer echten Funke getestet.
- Die Programme sind nicht signiert (siehe Kapitel 3).
- Während Lua-Studio verbunden ist, kann kein anderes Programm (z. B. die FrSky Suite) die Serial-Verbindung nutzen.

---
[← Start](../Home.md) | [Zurück](Fehlerprotokoll.md) | [Weiter →](Fehlerbehebung.md)
