🇬🇧 [English](../en/Models.md) · 🇩🇪 [Deutsch](../de/Modelle.md)

# Setting up models

Here you set up per model what the Lua shows on the radio: boxes, limits and settings. This works for the Luas with studio support (from Elektro 0.3.0, Motoren ECU 1.8.0, Motoren Vergaser 0.8.0, Segler 0.3.0, Jet 0.1.1, Heli RF 1.10.1). The radio does not recalculate anything; it only reads the finished, checked file.

While no model is open, the tab shows two entry points (from 0.4.0): **Set up with the radio** (loads the connected radio's models or leads to the connection) and **Prepare without a radio** with the list of prepared models (clickable). The **+ Prepare** button at the top next to the tabs opens the prepare form from anywhere.

## Load models

1. Load the model once on the radio so the Lua writes its info file (model name, window sizes, sensors).
2. Choose the **Source**: **Connected radio** (connect in the «Radio live» tab first), **SD drive** (radio in drive/storage mode) or **Folder** (export).
3. Click **Load models** and pick the model in the list.

## Radio quick test

After a transfer to a connected radio the studio checks by itself after a few seconds, once the radio has reloaded the model. With a connected radio you can press **Radio quick test** in the «Transfer» tab at any time (not available for SD drive and folder). It reads the Lua's info file and the radio's Lua log and reports:

- whether the Lua loaded the studio file and whether it found invalid fields;
- whether the Lua supports the format and found sensors;
- notable log lines, e.g. Lua errors, instruction limit, memory or missing symbols;
- whether the radio shows the changed view at all (otherwise you will see no change there).

If it says «Info file not rewritten since the transfer», switch the model on the radio once and test again.

## Size guard

The size guard at the bottom shows file, elements, tables, estimated Lua memory when loading, boxes, graphs, lists, decoration, symbols and bitmap memory, each with a traffic light. A **red** line blocks the transfer and states the reason.

## Transfer

1. Tab **Transfer**, then **Transfer to the radio**.
2. The studio checks the file, backs up the old file on the PC, writes the new one, reads it back and compares. With a connected radio it reloads the model; otherwise switch the model on the radio once.
3. If you changed something in the widget menu on the radio, the studio shows the changes and takes them over when the box is ticked. Without the tick they keep applying on the radio on top of the new file.
4. If you only changed a view the Lua does not show on the radio right now (e.g. compact while the radio shows full screen), the studio asks before transferring.
5. If two models have names that differ only in upper/lower case, the studio blocks the transfer (they would share the file): rename one model.

Backups are in the Lua-Studio user folder under `Studio/sicherungen` (Mac: `~/Library/Application Support/Lua-Studio`, Windows: `%APPDATA%\Lua-Studio`).

---
[← Home](../Home.md) | [Previous](Connect-radio.md) | [Next →](Prepare-without-radio.md)
