# Easy button

The easy button allows the user to skiip the entire process of editing phrases, patters, etc etc.

If no funscript is available, it generates one based on the video and audio. (we need to invent some algrorithm to combine the two)

SEE video_user_input.md for a easy, medium, and advanced setting for users to get started.

## project panel

In the left panel where you drag files now, you still drag files. but we only care that they are media or funscript. 

Default project has [First Project] as the name. [or its big buck bunny]

User drags om an item, that becomes the storage location of the output. so noted at the bottom of the project.  [Generated files go into a folder undeneath called Forged. subfolders are named for devices] if user wants somwehre else, cocking on [folder]
opens standard dialog to manually enter the output

Add file. drag and drop, or use syetem file selector.

[autosave] files in process are saved in a not so secret location that the user can see. assessments, work files, etc. when a save is made, the file is updated. 
[undo redo] is handled by the UI. 

## UI in tab 1 - Step One

### User scenario: Uploads a single funscript

[upload video]at the top opens a OS file to include the video. once both are loaded, screen changes to the next video+fiunscript scenario.

When the funscript is loaded, a single color plotly shows two funscripts. 

- Before plotly panel shows the input as uploaded
- User choices

    - Use cards and sliders for user to select characteristc. Default is just generate a safemone
    - Apply one of the six characteristics 

- Preview show the output would be after we apply "safety". Under a twisty is add intent where the user can select one of six characteristics.

NOTE: Although it uses the refactored restim, it actually only creates the main funscript for future editing, not all 7. 
Underneath preview, the user can play the video and watch the cursor in the plotly. Can move cursor. 

Can select a subset of the video and funscript to go forwad with. pick front and rear timing. (crop based on selected position (user should be able to pick a particular storke end point) the selected portion) [crop][undo] on either the preview upsates

Twp choices offered:
- Export. do it now. we're done (pr we a v2)
- Continue. go to next panel with the preview version as the one we will edit

### User scenario: Compare multiple scripts

Inserts tab before that allows user to watch the video if any. Or play the multiple scriipts, selecting which one to play. Video player syncs with plotly selected to play. User can jump between them.

We play the version through restim.
= Video player [user ours]
- to play audio user selects which port 
- to play estim or handy, user selects a port

[V2 feature how to work with MultiPlayer]

Jser must select one of the scripts to move forward.

### User has video (or audio) file only

video player shows video with selected funscript if any. if none the plotly is shown but blank.

[play]nplays video or audio
[upload funscript] for users who don't realize they can add it in the left panel
[generate] Generate builds the funscript using best practices.


Generates funscript visualized in the plotly. User can now select intent

[Export] Exports a single file for refinement in outside systems or play it. Select devices first
[conntinue editing] takes you to next tab

### User uploads and existing estim audio file

the system converts it into funscript as described in ./bring_your_own_to_compare. 

## design principles

1. Make it easier for the user. group decisions together, yet provide a way to explore more deeply for more advanced users. 

2. Allow the user to see what is changing with their decisions. What happens should be transparent to the user, while the math might be hidden.

3. Make it easy for the user to do the right thing for the device they are writing for

4. provide ways to support multiple devices, customized to the device as necesssary.

5. provide updates on long processing. Some of the processes take moments, some longer. Provide an update of what step the processing is on in lieu of a completed answer. 

6. Demonstrate the value of using the tool. (see step5 on displaying the thought process that the forgegen is doing)

7. use development and business best practices in producing forgegen. DevOps pipeline, tests, excellent user friendly use case first docs, cli for other tools to connect, and (future deployment as tools for agentic ai)

8. output locations and naming conventions selected by the user. (big discussion on discord about this. all videos and funscripts in one big foler, or each one havingits own)

# unexplored feature

while in development, allow the user to select the parts of the video they care about, either by editing (whcih should have been done earlier) or at least by providing a way to produce a playlist of the favorite parts.
