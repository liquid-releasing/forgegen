# Details Tab

The Details tab gives you fine-grained control over the generation parameters. Use it when the auto-generated output is close but needs adjustment.

---

## Controls

Three sliders and a dropdown at the top of the tab control the generation parameters.

### Low (trough)

The position value used for the bottom of each stroke. Range: 0–40. Default: 10.

A lower value means the device travels further down before reversing. Increase this for shorter-stroke feel, decrease for deeper strokes.

### High (peak)

The maximum position value for the highest-energy beats. Range: 60–100. Default: 90.

!!! note
    The actual peak position of each beat scales with its energy — a low-energy beat at High=90 may only reach 60–70. High sets the ceiling, not a fixed value.

### Beat source

Controls which part of the audio is used for beat and energy detection.

| Option | Description |
| --- | --- |
| **percussive** | Strips voice and melody using harmonic-percussive separation (HPSS), then tracks the drum/percussion signal. More stable beat tracking on music with complex instrumentation. |
| **full** | Uses the raw audio mix without separation. Voice, melody, and percussion all contribute to the energy envelope. Better for music where vocals carry the energy. |

Changing any of these three controls clears the generated output. Click **↺ Regenerate** to apply the new settings.

---

## Phrase modes

Below the controls, each detected phrase is listed with:

- **Time range** — start and end in seconds
- **Auto-detected mode** — the mode forgegen assigned based on energy and tempo
- **Override selector** — optionally replace the auto-detected mode

### Override options

Select `(auto)` to keep the auto-detected mode, or choose one of the six modes to override it:

| Mode | What it does to the curve |
| --- | --- |
| break | Minimal motion — 12% of peak amplitude |
| tease | Restrained, narrow strokes — 38% amplitude |
| slow | Full deep strokes — 95% amplitude |
| steady | Standard strokes — 78% amplitude |
| fast | Slightly reduced range for rapid stroking — 70% amplitude |
| edging | Builds progressively from 50% to 100% amplitude across the phrase |

See [Phrase Modes](../reference/modes.md) for guidance on when to use each.

### When to override

- A loud intro is detected as `fast` but should feel like `tease` (building tension)
- A breakdown is detected as `steady` but should be `break` (rest the device)
- A climax section is detected as `fast` but the edging ramp would feel better
- The outro is detected as `steady` but should fade out as `slow`

---

## Regenerate button

After adjusting controls or overriding modes, click **↺ Regenerate** to rebuild the funscript with the new settings.

The updated curve is saved to session state and available on the Generate tab for preview and download. A confirmation message appears when complete.

---

## Beat map table

At the bottom of the tab, an expandable **Beat map** section shows every detected beat as a table row:

| Column | Description |
| --- | --- |
| beat | Beat index (1-based) |
| time (s) | Beat timestamp in seconds |
| energy | Normalised energy at this beat (0.0–1.0) |
| mode | Phrase mode for this beat's phrase |

This table is useful for understanding why a section sounds or feels different — check the energy column to see if a phrase has unusually low or high energy compared to adjacent phrases.
