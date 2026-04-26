# Installation

## Requirements

- Python 3.10 or newer
- FFmpeg (required for video files; not needed for audio-only use)

---

## Python dependencies

```bash
git clone https://github.com/liquid-releasing/forgegen.git
git clone https://github.com/liquid-releasing/videoflow.git

cd forgegen
pip install -r requirements.txt
```

---

## FFmpeg

FFmpeg is required to extract audio from video files (MP4, MKV, MOV, AVI, etc.).
If you only work with audio files (MP3, WAV, FLAC, etc.) you can skip this.

### Windows

Install the essentials build via winget:

```powershell
winget install Gyan.FFmpeg.Essentials
```

Then **restart your terminal** (and Streamlit if it is already running) so the updated PATH takes effect.

To verify:

```powershell
ffmpeg -version
```

!!! note "Manual install"
    If winget is not available, download the essentials build from
    [ffmpeg.org/download.html](https://ffmpeg.org/download.html) → Windows builds by Gyan.
    Extract the zip, copy the `bin/` folder contents somewhere on your PATH (e.g. `C:\ffmpeg\bin`),
    and add that folder to your system PATH in Environment Variables.

---

### macOS

Install via Homebrew:

```bash
brew install ffmpeg
```

To verify:

```bash
ffmpeg -version
```

!!! note "No Homebrew?"
    Install Homebrew first: [brew.sh](https://brew.sh)
    Or use MacPorts: `sudo port install ffmpeg`

---

### Linux

**Ubuntu / Debian:**

```bash
sudo apt update && sudo apt install ffmpeg
```

**Fedora / RHEL:**

```bash
sudo dnf install ffmpeg
```

**Arch:**

```bash
sudo pacman -S ffmpeg
```

To verify:

```bash
ffmpeg -version
```

---

## Launching the UI

```bash
cd forgegen
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501) in your browser.

---

## CLI only (no UI)

If you only need the CLI and don't want to install Streamlit:

```bash
pip install -e ../videoflow[audio]
videoflow generate-funscript track.mp3
```
