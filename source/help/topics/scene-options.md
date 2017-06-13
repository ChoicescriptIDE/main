## Scene Options

CSIDE is designed to let you easily edit and organise your project's scenes. You can create, reorder, move, copy, or even colour-code your scene files, and more!


### Scene Interaction

- To select a particular scene, left-click its name in the Scenes & Projects tab. This will load its contents into the code editor.

- A scene can be renamed at any time by double-clicking its name (or single-clicking, if it is already selected). You cannot rename the project's two compulsory ChoiceScript files, 'startup' and 'choicescript_stats'.

- The order of scene files' can be ammended by dragging and dropping a scene to a new location within the scene list. The new scene order will persist between sessions.

- Scene files can also be copied to or moved between projects by dragging & dropping a scene from one Project listing to another. You will be prompted to clarify (or cancel) the action being taken.

- Scenes can be colour-coded for easy reference or organisation. Click the colour bubble to the left of a particular scene name to change that scene's colour code. These changes will also persist across sessions.

### Scene State
A scene's current state can be determined by its status icon (usually a grey floppy disk). Other states include:

- **A Red Floppy Disk**: This indicates that the scene has unsaved changes. Clicking the icon, or pressing CTRL-S/CMD-S while it is selected, will save the file, and turn the icon grey.

- **A Red Error Icon**: This will usually indicate that the scene failed to load. Hovering over the icon will give an error message via its tooltip. Clicking the icon will close the scene, and clicking its name will attempt to reload it.


### Scene Context Menu

Additional scene options are available via a context menu, either by right-clicking a particular scene or selecting that scene file normally and clicking the ('Scene') File icon at the extreme top-left of the user interface. The scene menu options are as follows:

- **Edit - Convert All Spaces to Tabs**: this option will change the 'indentation level' of the file content as indicated. It does not affect ordinary (e.g. narrative) spacing.

- **Edit - Convert All Tabs to Spaces**: this option will change the 'indentation level' of the file content as indicated. A default CSIDE Tab will be converted to an amount of spaces equal to the value of your tab/indent block size setting.

- **Review - Word Count**: pops up a window displaying the approximate word count of the selected scene, both including and excluding command lines. If the scene being reviewed is the one currently selected and displayed in the Code Editor, this option will also separately detail the word count of any current block selection within that scene.

- **Reload**: ensures that file content in CSIDE matches that of the saved file (in the event, for instance, that the file has been edited outside of CSIDE while the software is running).

- **Close**: removes the selected scene listing from CSIDE, but does not actually delete the file. A closed scene may later be reopened using the Project menu's 'Open all scenes' option.

- **Delete File**: this option permanently removes the selected text file from your hard drive, as well as from CSIDE itself. You will be prompted to confirm your intention.

- **Export - Copy file to folder**: saves a copy of the scene file to a different, specified folder (either new or existing). Useful for saving a separate backup copy at periodic intervals, and also for tweaking and updating ongoing public play-test games utilising the Dropbox 'Public' folder.

- **Export - Print**: enables you to produce a paper copy of the file content for reviewing at your leisure.


**Next Topic**: [Code Editor](topics/code-editor.md "Code Editor")