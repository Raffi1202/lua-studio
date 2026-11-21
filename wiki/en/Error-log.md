🇬🇧 [English](../en/Error-log.md) · 🇩🇪 [Deutsch](../de/Fehlerprotokoll.md)

# Error log & support ZIP

Lua-Studio keeps an **error log** of what happens: start (version, operating system), connecting and disconnecting, loading models, every step of a transfer, the radio quick test, blocks by the size guard and **every error** with the place in the program. That way a crash can be found afterwards.

1. When something goes wrong: keep Lua-Studio open (or start it again) and, if possible, **keep the radio connected**.
2. Top right: **Help ▾ → Error log …** (on the Mac also in the menu bar under “Help”).
3. Choose **Save for support (ZIP) …**. Suggested: desktop, name “Lua-Studio Fehlerprotokoll &lt;date>.zip”.
4. Send the ZIP file by mail or messenger, with a short note: what you did and what happened.

**What the ZIP contains:** the log (`lua-studio.log`, `lua-studio-alt.log`), `system.txt` (versions of Lua-Studio, operating system, radio). With a connected radio also the last 400 lines of the radio's Lua log and the info files of the Luas (`*.info.json`). **Not** included: studio projects, model files, serial numbers. The user folder is replaced by `~` everywhere. **But:** the info files list the models on the radio with model name, model location (including folder name) and sensor list (name, AppID, physical ID). This is needed to match the entries; if you do not want to pass it on, look at the ZIP first.

**Levels:** *normal* (default) records the events and all errors. *verbose* also records every command sent to the radio (shortened) and the radio's whole Lua log; only switch it on when asked to, then trigger the problem again. *off* records nothing, not even errors.

**Location:** Mac `~/Library/Application Support/Lua-Studio/Protokoll`, Windows `%APPDATA%\Lua-Studio\Protokoll` (button **Open folder**). At most two files of 1 MB each; when the current one is full it becomes the old one and the previous old one is dropped. **Delete** empties the log.

With a GitHub account you can also report it as an issue with the **Fehler / Bug** template and attach the ZIP.

---
[← Home](../Home.md) | [Previous](Symbols.md) | [Next →](FAQ.md)
