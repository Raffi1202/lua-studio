🇬🇧 [English](../en/Layout.md) · 🇩🇪 [Deutsch](../de/Anordnung.md)

# Anordnung & automatisch anordnen

- **Ansicht** wählt die Fenstergrösse (z. B. 784 × 316 kompakt oder 800 × 480 Vollbild). Mit **●** und «lief zuletzt auf der Funke» markiert ist die Grösse, in der das Lua auf der Funke zuletzt lief; sie ist beim Öffnen vorgewählt. Nur Änderungen in dieser Ansicht siehst du auf der Funke sofort.
- Kästchen ziehen verschiebt, die Ecke unten rechts ändert die Grösse. **Kästchen hinzufügen** und **Kästchen entfernen** (oder Entf-Taste). Höchstens 16 Kästchen je Ansicht.
- Rechts für das gewählte Kästchen: Wert (Werte des Luas, eigene Sensoren, Kanäle), Darstellung (Zahl, Ring/Tacho, Balken waagrecht/senkrecht, Kurve, Status-Text), Beschriftung, Bereich, Farben für normal/Warnung/Alarm/Hintergrund, bis zu 3 Farbstufen (nur Farbe) und Zusatzzeile (Minimum, Maximum, Mittelwert).
- **Rot** umrandet ist ein Kästchen, das über den Rand ragt, zu klein ist, ein anderes überlappt oder auf einer Fläche liegt, die das Lua selbst zeichnet (grau schraffiert, z. B. die Statusleiste). Zu kleine Kästchen und solche über dem Rand verwirft die Funke; überlappende liegen unter anderen.
- **Automatisch anordnen** (ab 0.4.0): Ein Klick setzt alle Abstände zwischen den Kästchen und zum Rand gleich und füllt die Fläche. Was neben und unter was liegt, bleibt. Daneben die Art: **Gleich breit je Zeile** (Standard: nebeneinander gleich breit, Zeilen im alten Höhenverhältnis), **Verhältnis behalten** (alles im alten Grössenverhältnis gestreckt), **Nur verteilen** (Grössen bleiben, alle Lücken genau der Abstand, der übrige Platz gleichmässig an die Ränder; liegen die Kästchen enger, nimmt das Studio den grössten Abstand, der passt) und **Neu im Raster** (alle Kästchen in Lesereihenfolge in ein gleichmässiges Raster, für ganz verschobene Anordnungen). **Abstand**: Standard 8 px im Vollbild, 5 px in der kompakten Ansicht, wählbar 4–10 px. Flächen, die das Lua selbst zeichnet, bleiben frei; die Spalte mit so einer Fläche behält ihre Breite. Würde ein Kästchen zu klein oder greifen die Kästchen ineinander, ändert das Studio nichts und sagt warum. **Rückgängig** nimmt das Anordnen zurück. Schmuck bleibt, wo er ist. Ab 0.4.1 füllen bei «Neu im Raster» die Kästchen der letzten Zeile den freien Platz dieser Zeile, auch neben einer Fläche des Luas wie «Flüge».
- Oben rechts steht, wie viel Platz die Einstellungen brauchen (Angaben, höchstens 1100).
- Die Vorschau zeichnet das Studio selbst. Sie zeigt Lage, Grösse und Art; Schrift und Feinheiten zeigt erst die Funke (danach mit «Funke live» kontrollieren).

---
[← Start](../Home.md) | [Zurück](Ohne-Funke-vorbereiten.md) | [Weiter →](Grenzwerte.md)
