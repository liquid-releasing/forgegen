This section contains several traansforms to convert audio to funscript.

In the parlance of funscriptforge these are replacement transform that create or geneate funscript. The user selected one of these based on the **Characteristic** or intent the user wants for the funscriipt. The individual names should make that clear. 

Based on the audio, we should provide the default method for the "easy button"

The characteristics create funscript if there is none or acts as replacedment in a phrase or pattern or for existing part of the funscript. 

The development of each transform provides an alternative to the user on how to transform the scripts. 

As such the user selects one of these transforms to provide a particular **characteristic** to all or part of the funscript. 

## Tapper [using beat detection]

For consideration.

based on Funscript-tools and aubio

uses the aubio library's onset detection to automatically generate a funscript file to match the audio/movie. 

aubio provides several algorithms and routines, including:

- several onset detection methods
- different pitch detection methods
- tempo tracking and beat detection
- MFCC (mel-frequency cepstrum coefficients)
- FFT and phase vocoder
- up/down-sampling
- digital filters (low pass, high pass, and more)
- spectral filtering
- transient/steady-state separation
- various mathematics utilities for music applications

Initial release based could be based on https://github.com/justfortheNSFW/Funscript-Tools who used aubio to create funscripts.

[aubio docs](https://aubio.org/manual/latest/index.html)
[aubio source](https://aubio.org/download)

Develop explanation, tests of how it works.

NOTE:Aubio is GNU licensed and may not be available for us to use based on that

```python
from create_funscript import create_funscript
from aubio import source, onset

class audio_to_funscript:
    def __init__(self, path, file, method):
        self.win_s = 512 # fft size
        self.hop_s = self.win_s // 2 # hop size
        self.samplerate = 44100 # standard for mp3 and works for mp4
        self.path = path
        self.file = file
        self.fileName = path + file
        self.funscriptFile = create_funscript("1.0", 'false', 99)
        self.s = source(self.fileName, self.samplerate, self.hop_s)
        self.o = onset(method, self.win_s, self.hop_s, self.samplerate)
        self.isProcessed = False

    def processAudio(self):
        total_frames = 0
        pos = 99
        while True:
        samples, read = self.s()
        if self.o(samples):
        pos = abs(pos - 99)
        self.funscriptFile.addAction(pos, int(self.o.get_last_ms()))
        total_frames += read
        if read < self.hop_s:
        break
        self.isProcessed = True

    def outputFile(self):
        self.funscriptFile.outputFile(self.path, self.file[0:len(self.file) - 4])

# Usage example:
path = 'C:/Users/justfortheNSFW/Downloads/'
file = 'MV - Wiggle.mp4'
method = "complex"
a2f = audio_to_funscript(path, file, method)
a2f.processAudio()
a2f.outputFile()
```

## Roll your own

- **peak‑based converter**
- **stereostim A/B positional converter**,
- **hybrid that can do both**

Based on the information provided in ./algorithm.md

## Build our own based on machine learning

## Edger built a funscript generaator 

TODO Find it but I think it has been deprecated based on the next set or maybe it wasw the converter that we are incorporating as characteristics

???

## Diglet has created restim that softens/corrects, and transforms funscriipts.

The intent is to do a final pass, make corrections, and output seven or so funscripts that influcence the playbacks of devices and estims. 

In the case of generate funscript, are these transfomers or will they automate the creation too.

### Funscript Flow

[FunscriptFlow](https://github.com/Funscript-Flow/Funscript-Flow/tree/main)

Apache license

NEW USER FEATURE

[important! new use case. no video, but funscript selection from a list -- just play it]

## Our Generator UI for consideration

### Tab 1 Project

Editable project name

Lists the files used. Add remove. 

Table of the files shows the names, file types, locations.

Output file location. User can select a folder using the OS folder selectio

Save project config to output folder. Can we use the .forge extension?

### Tab 2


### Tab 3

Top panel is the video player. It can play sounds. if there is more than one, the user has to pick one from the list.

User can set the cursor where they want. [play][<-][->] the usual. stop gets the current location and displays it.

We generate two heatmaps based on video and audio [if we have multiple ways toselect vidoe, pick one and see the funscriptl same for audio. or pick any two generation methods these are global for now] <== rewrote>

audio amd video  Displayed as heatmaps?

Fimscript displays as a single color plotly.

We can guess the phrasing. The user selects which of the three for each phrase. if there are two, a circled arrow points to the fumscript used for that part.

[Save gemerated]