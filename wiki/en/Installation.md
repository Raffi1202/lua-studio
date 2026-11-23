🇬🇧 [English](../en/Installation.md) · 🇩🇪 [Deutsch](../de/Installation.md)

# Installation

## What you need

- FrSky radio with **Ethos 26.2** or newer and a colour display. Tested on real hardware: **X18RS**.
- Mac (Apple silicon or Intel) or Windows PC (64-bit), USB data cable.
- The matching file from the GitHub release (“Releases” on the right of the repository page):

- Mac with Apple silicon: `Lua-Studio-0.15.0-mac-arm64.dmg`
- Mac with Intel: `Lua-Studio-0.15.0-mac-x64.dmg`
- Windows: `Lua-Studio-0.15.0-win-x64.exe`

«Radio live» only reads the display and sends keys and touches, the same as operating the radio by hand. «Models» only writes to the folder `scripts/studio` on the radio and backs up the old files on the PC first. Lua-Studio never changes models themselves.

## Install



### Mac

1. Double-click the DMG file and drag **Lua-Studio** into **Applications**.
2. Open Lua-Studio. The program is not registered with Apple, so the first time macOS says it cannot verify the developer. Then go to **System Settings › Privacy & Security**, click **Open Anyway** next to “Lua-Studio was blocked” and confirm. On older macOS versions, right-click the app › **Open** is enough.

### Windows

1. Put the EXE file in a fixed place (e.g. Documents) and double-click it. There is no installer.
2. If “Windows protected your PC” appears: **More info** › **Run anyway**.
3. The first start takes 5–10 seconds because the program unpacks itself first.

---
[← Home](../Home.md) | [Previous](../Home.md) | [Next →](Connect-radio.md)
