## Scene Options

CSIDE is designed to let you easily edit and organise your project's scenes. You can create, reorder, move, copy, or even colour-code your scene files, and more!


### Scene Interaction

- To select a particular scene, left-click its name in the Scenes & Projects tab. This will load its contents into the code editor.

- A scene can be renamed at any time by double-clicking the scene name (or single-clicking, if it is already selected). You cannot rename the project's two compulsory ChoiceScript files, 'startup' and 'choicescript_stats'.

- Scene file order can be amended by dragging and dropping a scene to a new location within the scene list. The new scene order will persist between sessions.

- Scene files can also be copied to or moved between projects by dragging and dropping a scene from one project listing to another. You will be prompted to clarify (or cancel) the action being taken.

- Scenes can be colour-coded for easy reference or organisation. Click the colour bubble to the left of a particular scene name to change that scene's colour code. These changes will also persist across sessions.

### Scene State
A scene's current state can be determined by its status icon. A grey floppy disk indicates a saved scene file. Other states include:

- **A Red Floppy Disk**: This indicates that the scene has unsaved changes. Clicking the icon, or pressing CTRL-S/CMD-S while it is selected, will save the file, and turn the icon grey.

- **A Red Error Icon**: This usually indicates that the scene has failed to load. Hovering over the icon produces an error message via its tooltip. Clicking the icon closes the scene, and clicking its name attempts to reload it.


### Scene Context Menu

The scene context menu contains additional options. To access the menu, right-click a particular scene, or select that scene and click the ('Scene') File icon at the extreme top left of the user interface (use the native app menu for Mac).

- **Edit - Convert All Spaces to Tabs**: Changes the indentation character as indicated. This does not affect ordinary (e.g., narrative) spacing.

- **Edit - Convert All Tabs to Spaces**: Changes the indentation character content as indicated. A default CSIDE Tab is converted to the number of spaces specified in <a href="#" rel="cside" title="settings" onclick="CSIDE(parent.cside.selectTab.bind(null, 'settings'));">Settings Tab</a>.

- **Review - Word Count**: Brings up a window displaying the approximate word count of the selected scene, both including and excluding command lines. If the scene is currently selected and displayed in the Code Editor, this option also details the word count of any selected text within that scene.

- **Reload**: Ensures that file content in CSIDE matches that of the saved .txt file. This can be used if one or more files have been edited outside of CSIDE while the application is still running.

- **Close**: Removes the selected scene listing from CSIDE, but does not actually delete the file. A closed scene may be reopened using the Project menu's 'Open all scenes' option.

- **Delete File**: Permanently deletes the selected text file from your hard drive, as well as from CSIDE itself. You will be prompted to confirm.

- **Export - Copy file to folder**: Saves a copy of the scene file to a different, specified folder (either new or existing). Useful for saving a separate backup copy at periodic intervals, and also for tweaking and updating ongoing public play-test games (see [Publishing and Exporting](topics/publishing-and-exporting.md "Publishing and Exporting").

- **Export - Print**: Produces a paper copy of the file content for reviewing at your leisure.


**Next Topic**: [Code Editor](topics/code-editor.md "Code Editor")