🇬🇧 [English](../en/FAQ.md) · 🇩🇪 [Deutsch](../de/FAQ.md)

# FAQ & known limitations

## What is Lua-Studio?

Lua-Studio is a program for Mac and Windows that belongs to our Ethos Luas (Electric, Heli, Jet, Glider, Gas Engine, DLG). **Radio live**: your FrSky radio's display appears on the computer and you operate the radio with mouse and keyboard, over a USB cable in the radio's **serial mode**.

**Models** (from 0.2.0, chapter 6): set up boxes, limits and settings per model on the computer and transfer them to the radio. Later: analyse flights.

![Lua-Studio showing the radio display](../../docs/bilder/Funke%20live.png)

Picture taken with the Ethos simulator.

**From 0.14.0:** a guided tour with 8 steps starts on the first start (again via Help → «Tutorial …»). Every layout change can be taken back with **↶ Undo** / **↷ Redo** or Cmd/Ctrl+Z or Shift+Cmd/Ctrl+Z (one drag is one step, up to 100 steps per model). On start Lua-Studio asks GitHub at most once a day for a newer version and then shows a link to the release page at the top; no download, no personal data; switch off via Help → «Check for updates».

**One layout for all models (from 0.14.0):** when transferring and with «Save as file» you choose under «Applies to» either «This model only» or «All models (default)». With «all» the file is called `Standard.&lt;lua>.lua` (e.g. `Standard.glider.lua`). The Lua uses it for every model without its own studio file; order: choice in the widget menu «Studio layout», then the model's file, then the default, otherwise the built-in display. Changes on the radio stay per model. A default project without a real model is created under «+ Prepare» with «Default for all models». A model really called «Standard» also applies to all. The Luas need a new version for this; Lua-Studio warns if the Lua on the radio is too old. The quick test shows «(Standard)» when the Lua reads the default file.

## Known limitations

- **Picture rate:** about 25 frames per second, measured on a Mac with the X18RS. The connection on Windows has not been measured with a real radio yet.
- Tested on real hardware only with the **X18RS**, Ethos 26.2.0, on a Mac. Other radios and the connection on Windows are not yet tested with a real radio.
- The programs are not signed (see chapter 3).
- While Lua-Studio is connected, no other program (e.g. the FrSky Suite) can use the serial connection.

---
[← Home](../Home.md) | [Previous](Error-log.md) | [Next →](Troubleshooting.md)
