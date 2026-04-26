# Phrase Modes

forgegen divides a track into phrases — structural segments of roughly equal length — and assigns each phrase a mode. The mode determines how the motion curve is shaped within that phrase.

---

## How modes are detected

Modes are assigned automatically based on two signals measured across the beats in each phrase:

- **Average energy** — the mean energy of all beats in the phrase (normalised 0.0–1.0)
- **BPM** — the track tempo at that phrase
- **Energy trend** — whether energy is rising, stable, or falling across the phrase

| Mode | Detection rule |
| --- | --- |
| break | Average energy < 0.15 |
| tease | Average energy < 0.30 |
| edging | Energy is rising (trend ≥ 0.15) AND average energy ≥ 0.35 |
| fast | BPM ≥ 140 |
| slow | BPM ≤ 75 |
| steady | Everything else |

You can override any auto-detected mode on the [Details tab](../ui/details.md).

---

## Mode reference

### break

**Amplitude:** 12% of peak range

The quietest mode. Nearly all motion is suppressed. Use for true silence sections, device cooldown, or structural pauses between high-energy segments.

The device still moves slightly (not completely still) to maintain position feedback.

---

### tease

**Amplitude:** 38% of peak range

Restrained, narrow strokes. The device moves but doesn't travel far. Builds anticipation. Use for intro sections, pre-drop buildups, and quiet verses where energy is present but low.

---

### slow

**Amplitude:** 95% of peak range

Full deep strokes at a slow tempo. High amplitude combined with low BPM means each stroke is long and deliberate. Use for slow, heavy sections where every movement should be felt.

---

### steady

**Amplitude:** 78% of peak range

The default mode. Standard strokes at the detected BPM. Most of a typical track will be in steady mode. It's the baseline from which other modes diverge.

---

### fast

**Amplitude:** 70% of peak range

Rapid stroking at high BPM. Amplitude is intentionally reduced (vs. steady) to make fast stroking physically viable — full amplitude at 140+ BPM can exceed device velocity limits. The reduction keeps the motion comfortable while preserving the energy of the section.

---

### edging

**Amplitude:** Builds progressively from 50% to 100% across the phrase

The most dynamic mode. At the start of the phrase the curve is restrained (50% amplitude). By the end it reaches full range. This creates a building tension — the sensation intensifies as the phrase develops, ending at maximum just before the next phrase begins.

Use for climax builds, pre-drop tension, or any section where the energy is visibly rising through the phrase.

---

## Choosing overrides

Most tracks need few or no overrides — the auto-detection handles typical song structures well. Override when:

- A quiet intro or outro is detected as `steady` instead of `tease` or `break`
- A loud section with slow tempo is detected as `steady` instead of `slow`
- A pre-chorus is detected as `fast` when you want an `edging` build
- A breakdown is any mode other than `break`

When in doubt, listen to the section, look at the energy chart on the Generate tab, and compare the auto-detected mode to the table above.
