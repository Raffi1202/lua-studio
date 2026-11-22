🇬🇧 [English](../en/Symbols.md) · 🇩🇪 [Deutsch](../de/Symbole.md)

# Symbols, unit and decoration

Only with a Lua version that supports Lua-Studio format 2. Otherwise the studio shows a note and writes format 1.

- **Symbols are gone from 0.11.0** (decision 22 Nov 2026): no symbol choice, no symbol images. Old projects and studio files with symbols are loaded, the symbols dropped and reported once («Symbols are no longer supported and were removed»); the layout stays.
- **Unit:** at the value (small) or none. If the unit is already a word of its own in the title (e.g. «Battery %», «Current (A)»), the Lua does not show it again. The title keeps its normal size; the symbol is reduced to the title height (masks 12 and 16 px, from 0.10.6). The former choice «bold top left» is gone from 0.10.4; old settings count as «at the value».
- **Old symbol images on the radio** (studio/symbole): when transferring, Lua-Studio offers to delete them (tick «Delete symbols»); without the tick they stay.
- **Decoration:** **+ Text**, **+ Line**, **+ Frame** places free elements without a value, at most 24 per view, below the boxes. Drag to move; position, size and colour on the right; Delete removes.
- **Preset** sets the layout to the Lua's look («Lua default» or the Lua's templates). New models start with the template «Original» where Lua-Studio has one; to change it, delete or move boxes. Limits and settings stay.

---
[← Home](../Home.md) | [Previous](Limits.md) | [Next →](Error-log.md)
