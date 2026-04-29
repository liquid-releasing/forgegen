# Generate Tab

The Generate tab is the primary workflow: pick a style, generate a funscript, preview the result, and download.

---

## Beat energy chart

At the top of the tab, a bar chart shows the energy at every detected beat across the track. Bars are colour-coded by the auto-detected phrase mode:

| Colour | Mode |
| --- | --- |
| Dark grey | break |
| Purple | tease |
| Blue | slow |
| Teal | steady |
| Red | fast |
| Orange | edging |

Dotted vertical lines mark phrase boundaries — the structural divisions forgegen uses to classify modes.

This chart helps you understand how forgegen is reading your track before you generate anything. If a section is misread (e.g. a loud intro is labelled `fast` when it should be `tease`), you can override it on the [Details tab](details.md) before generating.

---

## Style cards

Four style presets control the overall feel of the generated funscript. Click a card to select it. The currently active style has an orange border.

| Style | Low | High | Beat source | Best for |
| --- | --- | --- | --- | --- |
| 🥁 Rhythmic | 10 | 90 | percussive | EDM, high-energy, beat-locked |
| 🌊 Sensual | 20 | 75 | full mix | Slower, melodic, wider trough |
| ⚡ Intense | 5 | 95 | percussive | Maximum range, every beat hits full |
| 🌪 Chaotic | 10 | 90 | full mix | Unpredictable peaks, voice and energy drive the curve |

Selecting a style resets any previously generated output — click **▶ Generate** again after switching.

See [Styles reference](../reference/styles.md) for a full explanation of what each parameter does.

---

## Generate button

Click **▶ Generate** to run the pipeline:

1. Builds an alternating peak/trough motion curve locked to the beat grid
2. Scales each peak by the beat's energy (louder beat = higher peak)
3. Applies mode-aware shaping — each phrase is amplitude-scaled to match its mode
4. Exports a validated `.funscript` JSON

Generation typically completes in under a second for audio-only.

---

## Funscript preview

After generation, a line chart appears showing the position curve (0–100) across the full track duration. Peaks correspond to beats; the amplitude of each peak reflects both the beat energy and the active phrase mode.

Below the chart:

- **Action count** — total number of keyframes in the funscript
- **Duration** — track length in seconds

---

## Save or download

Two buttons, two modes:

### 💾 Save to folder

Writes both files to the output directory configured in the sidebar:

- `<stem>.funscript` — standard funscript JSON
- `<stem>.analysis.json` — companion sidecar with analysis context

The sidecar carries the v1.0 [analysis schema](../architecture/analysis-schema.md):
generator identity, source identity (path, duration, partial-MD5), and
structural information (chapter proposals from embedded mp4 chapters or a
`<stem>.chapters.json` sidecar — empty array when neither is present).

When FunScriptForge or another forge-family tool opens the funscript, the
sidecar is auto-detected and the chapter context is loaded with no re-analysis
of the source media. See [Analysis output](../reference/analysis-output.md).

### ⬇ Download

Browser download of the `.funscript` only. Use when you don't need the analysis
context — for example, when handing the curve to a non-forge player.

### Compatible consumers

The downloaded `.funscript` is standard JSON and can be loaded into:

- FunScriptForge (for editing and device-specific export)
- SyncPlayer (for playback with a connected device)
- Any other compatible player or editor
