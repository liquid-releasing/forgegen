# Using the UI

The forgegen UI has three areas: the **sidebar**, the **Generate tab**, and the **Details tab**.

---

## Sidebar

The sidebar is always visible and handles file loading.

### Loading a file

Drag and drop any supported audio or video file onto the uploader, or click **Browse files**. Accepted formats: MP3, WAV, FLAC, OGG, M4A, AAC, MP4, MKV, MOV.

When you load a video file, forgegen extracts the audio track automatically. You do not need to pre-extract audio.

### Track info

Once analysis completes, the sidebar shows:

| Field | Description |
| --- | --- |
| **BPM** | Detected tempo in beats per minute |
| **Beats** | Total number of beats in the track |
| **Phrases** | Number of musical phrases detected |
| **Duration** | Track length in `m:ss.s` format |
| **Source** | Beat extraction mode — `percussive` or `full` |

Loading a new file resets all generated output. The previous funscript is cleared automatically.

---

## Tabs

| Tab | Purpose |
| --- | --- |
| [Generate](generate.md) | Choose a style, generate, preview, download |
| [Details](details.md) | Override phrase modes, tune low/high range, regenerate |

Start on **Generate** for the quick workflow. Use **Details** when you want more control over how specific sections of the track feel.
