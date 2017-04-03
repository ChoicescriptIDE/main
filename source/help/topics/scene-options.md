## Scene Options

CSIDE enables you to easily and directly manipulate individual Scene files in various ways and means. This page briefly describes those ways and means. For more information on what Scenes are, and how they're represented and used by CSIDE, please see [Scenes](topics/scenes.md "Scenes").


### General Functionality

- Selecting a particular scene file with a left-click will display its contents in the Code Editor to the right of the Scenes & Projects listing.

- New scene files can be added to a Project by clicking the 'Add new scene' button on the project's header bar, thereby creating an 'Untitled' scene.

- An ordinary scene file can be renamed at any time by double-clicking it. If already selected, a single click will suffice. You cannot however rename either of a project's two compulsory ChoiceScript files ('startup' and 'choicescript_stats').

- Scene files can be reordered within their Project listing by dragging & dropping a particular file above or below other scenes in the list. The new order of listing will persist between sessions.

- Scene files can also be copied to or moved between projects by dragging & dropping a scene from one Project listing to another. You will be prompted to clarify (or cancel) the action being taken.

- Scenes can be colour-coded as a personal visual reference / reminder by clicking the icon to the left of a particular scene name (e.g. you may decide that green means 'scene finished' while red means 'unresolved issues', or similar).

- A red floppy disk icon for a particular scene file indicates unsaved content. Clicking the icon will save that file, at which point it will turn grey. If AutoSave is enabled under Settings, all unsaved files will be saved every few minutes (and as notification, any red disk icons will all turn grey).


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