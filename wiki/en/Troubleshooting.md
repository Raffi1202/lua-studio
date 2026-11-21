🇬🇧 [English](../en/Troubleshooting.md) · 🇩🇪 [Deutsch](../de/Fehlerbehebung.md)

# Troubleshooting

| Message or problem | What to do |
|---|---|
| “No radio found” | The radio's USB mode must be Serial. Try another cable (some only charge). Then Search again. |
| “Remote control was not allowed on the radio (time out)” | The prompt did not appear or was not confirmed. Connect again and confirm on the radio right away. |
| “Please allow remote control on the radio”, but no prompt appears on the radio | Wrong port selected or the radio is not in serial mode. Disconnect, plug the radio in again in Serial mode, choose the entry marked ●. |
| “Remote control was refused on the radio” | Connect again and allow it on the radio. |
| “Cannot open the port …” | Another program uses the radio (FrSky Suite, a second Lua-Studio). Close it, unplug and replug the radio. |
| “Connection lost” | Cable pulled or radio switched off. Plug in again, choose Serial, Connect. |
| Picture does not change | Disconnect and connect again. |
| Mac: program does not start | See chapter 3 (Open Anyway). Copy the app from the DMG into Applications first. |

## Lua memory

The Luas share the Lua memory of the radio (about 2048 KB on the X18RS). If the radio reports «too much RAM», switch the radio off and on.

---
[← Home](../Home.md) | [Previous](FAQ.md) | [Next →](Changelog.md)
