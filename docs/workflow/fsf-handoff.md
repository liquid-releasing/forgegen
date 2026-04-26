# forgegen + FunScriptForge

forgegen and FunScriptForge are designed to work together. forgegen generates; FunScriptForge refines.

---

## The handoff

forgegen outputs a `.funscript` file. That file is the handoff point.

```
forgegen  →  track.funscript  →  FunScriptForge  →  device-specific export
```

The `.funscript` is a standard format — both tools read and write it. You can load the forgegen output directly into FunScriptForge without any conversion.

---

## Why use both?

| forgegen produces | FunScriptForge adds |
| --- | --- |
| A beat-locked, mode-shaped draft | Micro-adjustments — smooth transitions, velocity shaping |
| Consistent phrase-level amplitude | Tone editing — feel and texture per section |
| A valid, playable funscript | Device-specific export (Handy limits, OSR2 multi-axis, estim) |
| A starting point in 30 seconds | The human touch that makes a script feel hand-crafted |

The generated draft is good — not perfect. FunScriptForge is where you take "good" to "great."

---

## Typical workflow

1. **Drop your audio into forgegen.** Choose a style. Generate.
2. **Download the `.funscript`.** This is your working draft.
3. **Open the `.funscript` in FunScriptForge.** Load the same media file for sync.
4. **Review the heatmap.** Look for phrases that feel off — too intense, too quiet, wrong pacing.
5. **Apply transforms in FunScriptForge.** Tone-shape sections, adjust velocity, trim or extend phrases.
6. **Export per device.** FunScriptForge handles device-specific constraints (velocity caps, range limits).

---

## What forgegen intentionally leaves out

forgegen does not touch:

- **Velocity limiting** — FunScriptForge enforces device-specific speed limits
- **Micro-timing** — small positional nudges between beats
- **Manual keyframes** — any beat-by-beat editing
- **Device export** — Handy vs. OSR2 vs. estim format differences

These are FunScriptForge's domain. The split is intentional — each tool does one job well.

---

## Using the draft without FunScriptForge

The forgegen output is a valid, playable funscript. You don't have to open FunScriptForge to use it — load it directly into SyncPlayer, MultiFunPlayer, or the Handy app.

For casual use or music-sync content where exact precision isn't critical, the generated draft is often good enough to play directly.
