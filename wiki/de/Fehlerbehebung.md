🇬🇧 [English](../en/Troubleshooting.md) · 🇩🇪 [Deutsch](../de/Fehlerbehebung.md)

# Fehlerbehebung

| Meldung oder Problem | Was tun |
|---|---|
| «Keine Funke gefunden» | USB-Modus auf der Funke muss Serial sein. Anderes Kabel (manche laden nur). Dann Neu suchen. |
| «Die Fernsteuerung wurde am Sender nicht erlaubt (Zeit abgelaufen)» | Die Abfrage auf der Funke kam nicht oder wurde nicht bestätigt. Nochmals Verbinden und sofort auf der Funke bestätigen. |
| «Bitte am Sender die Fernsteuerung erlauben», aber auf der Funke erscheint keine Abfrage | Falscher Anschluss gewählt oder die Funke ist nicht im Serialmodus. Trennen, Funke im Modus Serial neu einstecken, den mit ● markierten Eintrag wählen. |
| «Die Fernsteuerung wurde am Sender abgelehnt» | Nochmals verbinden und auf der Funke erlauben. |
| «Anschluss lässt sich nicht öffnen …» | Ein anderes Programm benutzt die Funke (FrSky Suite, zweites Lua-Studio). Dieses schliessen, Funke aus- und wieder einstecken. |
| «Verbindung getrennt: Die Verbindung zur Funke wurde getrennt» | Kabel gezogen oder Funke ausgeschaltet. Wieder einstecken, Serial wählen, Verbinden. |
| Bild bleibt stehen | Trennen und neu verbinden. |
| Mac: Programm startet nicht | Kapitel 3 (Trotzdem öffnen). Programm aus dem DMG zuerst in «Programme» kopieren. |

**«Modelle laden» bleibt leer** (ab 0.8.2 mit Hinweis): Das Lua schreibt seine Info-Datei erst, wenn das Modell mit dem Widget einmal auf der Funke geladen war. Lua-Studio sucht sie im Ordner `scripts/studio` auf der SD-Karte und im internen Speicher. **Notlösung:** Im Reiter «Übertragen» **Als Datei speichern …** und die Datei `&lt;Kennung>.&lt;lua>.lua` von Hand nach `scripts/studio` kopieren (Ordner `studio` neben dem Lua-Ordner), dann das Modell einmal wechseln. Symbole sind in dieser Datei nicht enthalten.

## Lua-Speicher

Die Luas teilen sich den Lua-Speicher der Funke (rund 2048 KB auf der X18RS). Meldet die Funke «Zu wenig Lua-Speicher» bzw. «too much RAM», die Funke aus- und einschalten.

---
[← Start](../Home.md) | [Zurück](FAQ.md) | [Weiter →](Versionen.md)
