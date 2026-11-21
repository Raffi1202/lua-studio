🇬🇧 [English](../en/Limits.md) · 🇩🇪 [Deutsch](../de/Grenzwerte.md)

# Limits & «also when motor off»

> **Pre-release:** «also when motor off» is tested on the Mac and with test scripts; the transmitter test on the X18RS follows.

- **Completely silent only with «Off».** An entry with both levels empty never switches an alarm off: the radio then uses the factory limit.
- **Always sound, no tick box:** error codes and shutdown reasons (ECU, ESC, governor).
- «also when motor off» appears only for Luas that support it; if the Lua on the radio does not know it yet, the alarm still sounds there.

- **Limits** apply per value for the whole model, no matter in which box the value is. New models start with the Lua's factory limits. An empty field switches that level off; if **both** are empty, the radio uses the factory limit (completely off only with **Off**); «factory: …» only shows for values without an entry yet. **Off** switches an alarm off completely. For own sensors «Alarm when» must be chosen, and with «below» the alarm must be lower than the warning (with «above» higher) – otherwise the studio does not transfer.
- **Also with motor off** (from 0.4.1, only for Luas that support it): ticked (default), the alarm also sounds while the motor switch (e.g. SF) is off. Untick it and this alarm stays silent while the motor is off; the Studio then shows a yellow band listing all such alarms. «all» ticks or unticks every alarm. Error codes and shutdown reasons always sound and have no tick box. If the Lua on the radio does not know this setting yet, the alarm still sounds there; the band says so.
- **Adjust values:** factor, offset, unit and decimals of a value, e.g. RPM ÷ 2. Applies everywhere, also to the limits.
- **Settings** of the Lua, e.g. battery and capacity.
- **Template:** load «Lua default» or an own template; **Save as template**; **From model** copies everything from another model.

Everything is saved on the PC automatically.

---
[← Home](../Home.md) | [Previous](Layout.md) | [Next →](Symbols.md)
