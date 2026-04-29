# Quick Start

Generate your first funscript in under a minute.

---

## 1. Install

See the full [Installation guide](installation.md) for FFmpeg setup on Windows, macOS, and Linux.

```bash
# Clone the repos side by side
git clone https://github.com/liquid-releasing/forgegen.git
git clone https://github.com/liquid-releasing/videoflow.git

cd forgegen
pip install -r requirements.txt
```

!!! note "FFmpeg required for video files"
    If you plan to load MP4, MKV, or MOV files, install FFmpeg first.
    See [Installation → FFmpeg](installation.md#ffmpeg).

---

## 2. Launch the UI

```bash
streamlit run app.py
```

Your browser opens at `http://localhost:8501`.

---

## 3. Load an audio file

In the sidebar, click **Browse files** (or drag and drop) and select any MP3, WAV, FLAC, or other supported audio file.

!!! note "v0.1 length limit"
    forgegen v0.1 expects media under **~10 minutes**. Longer files may stall on
    the librosa tempogram step. Chapter-aware long-form processing arrives in
    v0.5 — see [LONG_FORM_SCALING](https://github.com/liquid-releasing/forgegen/blob/main/architecture/LONG_FORM_SCALING.md).

forgegen immediately analyses the file — detecting the beat grid, BPM, phrase boundaries, and energy. This takes a few seconds. When done, the sidebar shows:

- **BPM** — detected tempo
- **Beats** — total beat count
- **Phrases** — number of musical phrases detected
- **Duration** — track length

---

## 4. Choose a style

On the **Generate** tab, five style cards appear. Pick the one that fits your track:

| Style | Best for |
| --- | --- |
| 🥁 Rhythmic | EDM, high-energy, beat-locked |
| 🌊 Sensual | Slower, melodic, wider trough |
| ⚡ Intense | Maximum range, every beat hits full |
| 🌪 Chaotic | Full mix drives the curve — unpredictable peaks |
| :wrench: Tools | Uses Funscript-Tools generation |

See [Styles](reference/styles.md) for details.

---

## 5. Generate

Click **▶ Generate**.

forgegen builds the motion curve and displays a preview chart — position (0–100) over time. Below the chart you'll see the action count and track duration.

---

## 6. Save or download

You have two options when generation completes:

- **💾 Save to folder** — writes the funscript to your configured output folder
  *and* emits a companion `<stem>.analysis.json` sidecar with the analysis
  context (chapters, source identity, generator metadata). Downstream tools
  like FunScriptForge pick the sidecar up automatically.
- **⬇ Download** — browser download of just the `.funscript`. Use this when
  you only need the curve.

The file is named after your audio file (e.g. `my-track.funscript` /
`my-track.analysis.json`). Load it into FunScriptForge for refinement, or
directly into a player.

See [Analysis output](reference/analysis-output.md) for what the sidecar contains and why.

---

## What's next?

- [Fine-tune with the Details tab](ui/details.md) — override phrase modes, adjust low/high range
- [Use the CLI for batch generation](cli/index.md) — process multiple files without opening the UI
- [Open in FunScriptForge](workflow/fsf-handoff.md) — refine tone and shape before playing
