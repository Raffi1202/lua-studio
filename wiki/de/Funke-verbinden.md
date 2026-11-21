🇬🇧 [English](../en/Connect-radio.md) · 🇩🇪 [Deutsch](../de/Funke-verbinden.md)

# Funke verbinden

## Funke verbinden

1. Funke einschalten und mit dem USB-Kabel an den Computer stecken.
2. Auf der Funke erscheint die Auswahl für den USB-Modus. **Serial** wählen (nicht Laufwerk/Speicher).
3. In Lua-Studio oben bei **Verbindung** die Funke wählen. Ethos-Funken sind mit **●** markiert und werden automatisch vorgewählt. Steht dort «Keine Funke gefunden»: Kabel und Modus prüfen, dann **Neu suchen**.
4. **Verbinden** klicken. Die Statuszeile zeigt «Bitte am Sender die Fernsteuerung erlauben».
5. Auf der Funke die Abfrage zur Fernsteuerung **bestätigen**. Lua-Studio wartet bis zu 2 Minuten.
6. Die Statuszeile zeigt **Verbunden**, Sender und Ethos-Version. Kurz danach erscheint das Display.

 Jede neue Verbindung muss am Sender neu erlaubt werden, auch nach Trennen und Wiederverbinden.

## Bedienen

| Am Computer | Auf der Funke |
|---|---|
| Klick ins Bild | tippen |
| Rechtsklick oder Maustaste lange halten | lange tippen |
| Mit gedrückter Maustaste ziehen | wischen |
| Mausrad (Maus über dem Bild), Pfeiltasten ↑ ↓ (oder ← →) | Drehrad |
| Enter · Esc oder ← Löschen · Tab | ENTER · RTN · PAGE |
| F1 · F2 · F3 | SYS · MDL · DISP |
| Umschalt + Taste | Taste lange drücken |

Rechts gibt es Knöpfe für alle Tasten. Mit dem Haken **Lang drücken** wird der nächste Knopf lange gedrückt. Text für die Bildschirmtastatur der Funke (z. B. einen Modellnamen) tippst du ins Feld **Text in die Bildschirmtastatur** und klickst **Senden**. Vorher muss auf der Funke ein Textfeld offen sein.

Die Tastenkürzel wirken überall im Fenster, ausser während du in ein Eingabefeld oder eine Auswahlliste tippst.

### Grösse, Bildschirmfoto, Log

- **Grösse**: Einpassen (füllt das Fenster), 100 %, 150 % oder 200 %.
- **Bildschirmfoto** speichert das aktuelle Display als PNG (Vorschlag: Ordner Bilder).
- **Lua-Log der Funke** zeigt, was Lua-Skripte auf der Funke ausgeben (`print`) und Fehlermeldungen (rot). **Leeren** löscht die Liste.
- **DE / EN** oben rechts wechselt die Sprache.

---
[← Start](../Home.md) | [Zurück](Installation.md) | [Weiter →](Modelle.md)
