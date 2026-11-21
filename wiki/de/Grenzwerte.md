🇬🇧 [English](../en/Limits.md) · 🇩🇪 [Deutsch](../de/Grenzwerte.md)

# Grenzwerte & «auch bei Motor aus»

> **Vorabversion:** «auch bei Motor aus» ist am Mac und mit Testskripten geprüft; der Sendertest an der X18RS folgt.

- **Ganz still nur mit «Aus».** Ein Eintrag mit beiden Stufen leer schaltet nie ab: Die Funke nimmt dann die Werkgrenze.
- **Kommen immer, ohne Haken:** Fehlercodes und Abschaltgründe (ECU, Regler, Governor).
- «auch bei Motor aus» erscheint nur bei Luas, die es kennen; kennt das Lua auf der Funke es noch nicht, kommt der Alarm dort weiter.

- **Grenzwerte** gelten je Wert für das ganze Modell, egal in welchem Kästchen der Wert steht. Neue Modelle beginnen mit den Werkgrenzen des Luas. Ein leeres Feld schaltet diese Stufe aus; sind **beide** leer, nimmt die Funke die Werkgrenze (ganz aus nur mit **Aus**); «Werk: …» erscheint nur bei Werten, für die noch kein Eintrag besteht. Mit **Aus** schaltest du einen Alarm ganz aus. Bei eigenen Sensoren muss «Alarm wenn» gewählt sein, und bei «unter» muss der Alarm tiefer liegen als die Warnung (bei «über» höher) – sonst überträgt das Studio nicht.
- **Auch bei Motor aus** (ab 0.4.1, nur bei Luas, die es kennen): Angehakt (Standard) kommt der Alarm auch, wenn der Motorschalter (z. B. SF) auf aus steht. Nimmst du den Haken weg, schweigt dieser Alarm, solange der Motor aus ist; das Studio zeigt dann oben ein gelbes Band mit allen solchen Alarmen. «alle» setzt oder löscht den Haken bei allen Alarmen. Fehlercodes und Abschaltgründe kommen immer und haben keinen Haken. Kennt das Lua auf der Funke die Einstellung noch nicht, kommt der Alarm dort weiter; das Band sagt das.
- **Werte anpassen:** Faktor, Versatz, Einheit und Nachkommastellen eines Werts, z. B. Drehzahl ÷ 2. Gilt überall, auch für die Grenzwerte.
- **Einstellungen** des Luas, z. B. Akku und Kapazität.
- **Vorlage:** «Standard des Luas» oder eine eigene Vorlage laden; **Als Vorlage speichern**; **Von Modell kopieren** übernimmt alles von einem anderen Modell.

Alles wird am PC automatisch gespeichert.

---
[← Start](../Home.md) | [Zurück](Anordnung.md) | [Weiter →](Symbole.md)
