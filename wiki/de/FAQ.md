🇬🇧 [English](../en/FAQ.md) · 🇩🇪 [Deutsch](../de/FAQ.md)

# FAQ & bekannte Grenzen

## Was ist Lua-Studio?

Lua-Studio ist ein Programm für Mac und Windows. Es gehört zu unseren Ethos-Luas (Electric, Heli, Jet, Glider, Gas Engine). **Funke live**: Das Display deiner FrSky-Funke erscheint am Computer, und du bedienst die Funke mit Maus und Tastatur. Das geht über ein USB-Kabel im **Serialmodus** der Funke.

**Modelle** (ab 0.2.0, Kapitel 6): je Modell Kästchen, Grenzwerte und Einstellungen am Computer einstellen und auf die Funke übertragen. Später: Flüge auswerten.

![Lua-Studio mit dem Display der Funke](../../docs/bilder/Funke%20live.png)

Bild aus dem Ethos-Simulator.

## Bekannte Grenzen

- **Bildtempo:** Am Mac mit der X18RS gemessen rund 25 Bilder pro Sekunde. Unter Windows ist die Verbindung mit echter Funke noch nicht gemessen.
- Am echten Sender getestet ist nur die **X18RS** mit Ethos 26.2.0 am Mac. Andere Sender und die Verbindung unter Windows sind noch nicht mit einer echten Funke getestet.
- Die Programme sind nicht signiert (siehe Kapitel 3).
- Während Lua-Studio verbunden ist, kann kein anderes Programm (z. B. die FrSky Suite) die Serial-Verbindung nutzen.

---
[← Start](../Home.md) | [Zurück](Fehlerprotokoll.md) | [Weiter →](Fehlerbehebung.md)
