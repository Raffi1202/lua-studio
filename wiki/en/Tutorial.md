# Tutorial (first steps)

From 0.13.0 Lua-Studio has a guided tour with 8 steps. It starts by itself on the first start and at any time via **Help → Tutorial …**. **Skip** or **Esc** stops it, the arrow keys page through. For the tour Lua-Studio creates a practice model «Tutorial» and asks at the end whether to delete it. Your own models stay untouched.

## 1. Welcome

Welcome to Lua-Studio! Here you set up on the PC what your Luas show on the radio. 8 steps to your first model. Press Esc or «Skip» to stop at any time.

![Welcome](../bilder/tutorial-en-1.png)

## 2. Choose the Lua

Choose the Lua: pick which Lua the model is for, e.g. Electric or DLG.

![Choose the Lua](../bilder/tutorial-en-2.png)

## 3. Model and ID

Model and ID: enter the model name as on the radio. The ID links the model to its studio file. For the tutorial, Lua-Studio creates a practice model «Tutorial» in the next step.

![Model and ID](../bilder/tutorial-en-3.png)

## 4. Choose a template

Choose a template: «Original (like the Lua)» is a good start. The Lua brings further templates. «Apply» takes it over.

![Choose a template](../bilder/tutorial-en-4.png)

## 5. Click a field

Click a field: click a box. On the right you choose value, display and title. Boxes can be moved and resized. Moved something? «Undo» or Cmd/Ctrl+Z takes it back.

![Click a field](../bilder/tutorial-en-5.png)

## 6. Limits and alarm

Limits and alarm: warning and alarm limits per value, e.g. battery 30 % / 20 %. They apply even if the value is on no box.

![Limits and alarm](../bilder/tutorial-en-6.png)

## 7. Check the preview

Check the preview: the preview draws like the Lua on the radio. Green dots in the size guard mean: the file fits into the memory of the radio.

![Check the preview](../bilder/tutorial-en-7.png)

## 8. Transfer and quick test

Transfer: with a connected radio transfer directly, otherwise «Save as file» for the SD card. Then the quick test shows whether the Lua reads the file.

![Transfer and quick test](../bilder/tutorial-en-8.png)

## Undo and redo

Every change to the layout can be taken back: moving, resizing, adding, deleting, value, display, title, colour, limits, applying a template, arranging. Buttons **↶ Undo** and **↷ Redo** at the top right of the model (the tooltip says what is taken back), keys **Cmd/Ctrl+Z** and **Shift+Cmd/Ctrl+Z** or **Ctrl+Y**, on the Mac also in the **Edit** menu. One drag is one step. The history is kept per model (up to 100 steps) and stays after a transfer until Lua-Studio is closed.

## New version notice

On start Lua-Studio asks GitHub at most once a day whether there is a newer version (pre-releases included). If so, a bar at the top links to the release page. Lua-Studio downloads and installs nothing itself. Only the normal request to api.github.com is sent, no personal data. Without internet it stays silent. To switch it off: **Help → Check for updates**.
