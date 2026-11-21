# Lua-Studio MCP server

🇬🇧 English · 🇩🇪 [Deutsch](#deutsch)

Lets Claude Code (or any MCP client) read the state of Lua-Studio and run commands – without screenshots or mouse clicks. For developers and testing only.

## Setup

1. Start Lua-Studio with the control interface:
   - **Mac:** `/Applications/Lua-Studio.app/Contents/MacOS/Lua-Studio --steuerung`
   - **Windows:** `Lua-Studio-<version>-win-x64.exe --steuerung`
   - From source: `env -u ELECTRON_RUN_AS_NODE npx electron . --steuerung`
2. Register the server in Claude Code (path to this repository):
   - **Mac:** `claude mcp add lua-studio -- node "/path/to/lua-studio/tools/mcp/lua-studio-mcp.js"`
   - **Windows:** `claude mcp add lua-studio -- node "C:\path\to\lua-studio\tools\mcp\lua-studio-mcp.js"`
3. Tools: `lua_studio_state`, `lua_studio_do` (command name + args), `lua_studio_preview` (data, PNG only with `png: true`), `lua_studio_log` (from line number).

The server reads port and key from `steuerung.json` in the Lua-Studio data folder (Mac `~/Library/Application Support/Lua-Studio`, Windows `%APPDATA%\Lua-Studio`; `LUA_STUDIO_DATEN` overrides it).

## Security

- The interface is **off by default**. It only starts with `--steuerung` or `LUA_STUDIO_STEUERUNG=1`.
- It listens on **127.0.0.1 only**, on a random port, and every request needs the random key of this start.
- `steuerung.json` is readable only by your user (mode 600 on Mac/Linux, your user folder on Windows) and is deleted when Lua-Studio quits.
- Commands answer confirmations with «yes» (also when transferring to a radio) and write files to any path you pass (`speichernDatei`, `supportZip`, `bild`, `ordner`).
- Anyone who can run programs as your user can control Lua-Studio while the interface is on – including writing to a connected radio. Only switch it on when you need it.

## Deutsch

Damit kann Claude Code (oder ein anderer MCP-Client) den Zustand von Lua-Studio lesen und Befehle ausführen, ohne Bildschirmfotos und Mausklicks. Nur für Entwicklung und Tests.

1. Lua-Studio mit `--steuerung` starten (Pfade wie oben).
2. Den Server in Claude Code eintragen: `claude mcp add lua-studio -- node "<Pfad>/tools/mcp/lua-studio-mcp.js"`.
3. Werkzeuge: `lua_studio_state`, `lua_studio_do`, `lua_studio_preview`, `lua_studio_log`.

**Sicherheit:** Befehle beantworten Rückfragen mit «ja» (auch beim Übertragen auf die Funke) und schreiben an jeden angegebenen Pfad. Standardmässig aus, nur mit `--steuerung` bzw. `LUA_STUDIO_STEUERUNG=1`. Nur über 127.0.0.1, zufälliger Port, Zufallsschlüssel je Start. `steuerung.json` ist nur für den eigenen Benutzer lesbar und wird beim Beenden gelöscht. Wer als dein Benutzer Programme ausführen kann, kann Lua-Studio steuern, solange die Schnittstelle an ist, auch auf eine verbundene Funke schreiben. Nur einschalten, wenn nötig.
