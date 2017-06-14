## Project Options

CSIDE is designed so you can easily edit one or more ChoiceScript projects, developing and testing your games in a single, streamlined environment. You can create, reorder, and run your projects, control your individual scenes, and more!

This page gives a brief overview of project options.

### General Functionality

- Brand new projects can be created by clicking the '+' icon alongside the 'Scenes & Projects' header.

- Existing game files can be imported into CSIDE (effectively creating a new project in CSIDE from existing content). Click the folder ('open scenes') button alongside the 'Scenes & Projects' header, then select the .txt files you want to import.


### Project Header Bar

- **Rename**: Rename a project at any time by double-clicking the project header bar.

- **Reorder**: Reorder a project by dragging and dropping the project header bar above or below other projects in the list. The new project order will persist between sessions.

- **Hide Scenes**: A project's entire scene list (excluding only the project's header bar) can be hidden or revealed by clicking the eye ('toggle visibility') button to the left of the project's name. This reduces clutter while leaving the project open for easy access.

- **Save Project**: Click the floppy disk ('save project') button on the header bar to save all currently unsaved scene files relating to that project. The floppy disk indicators on all unsaved scene files will then turn from red to grey, indicating all changes have been saved.

- **Add New Scene**: Click the '+' ('add scene') button on the project header bar to add a new 'Untitled' scene file to that project. To rename the scene, click it immediately after creation. Later on, rename the scene by double-clicking to select the scene and open the name editor.

- **Run Game**: Click the '►' ('run project') button on the project header bar to run your project within CSIDE. This will open or display the project in the Game Tab Panel on the right of the application.



### Project Context Menu

Additional project options are available via a context menu, accessed by right-clicking a project header bar. Alternatively, select any scene file related to that project and use the app's main menu ('Project') button. The main menu in Windows and Web versions can be found in the top-left, above the Scenes & Projects tab. On Mac, the native app toolbar is used.

Project menu options are as follows:

- **Add New Scene**: Adds a new 'Untitled' scene file to the selected project.

- **Open All Scenes**: Opens (that is, imports into this project) all valid .txt files located in the same folder. This is used to open additional scene files in the project, in the instance that one or more scene files have been closed, or if some scene files were not selected when the project was imported to CSIDE.

- **Reload All Scenes**: Ensures that file content in CSIDE matches that of the saved .txt file. This can be used if one or more files have been edited outside of CSIDE while the application is still running.

- **Review - Word Count**: Opens a window with the word count of the project as a whole, both including and excluding command lines. This will also display a word count of all selected text in all of that project's open scenes.

- **Import - Image (As Scene)**: Imports an image into your scene project, encoded within a file. See [Image Scenes](topics/image-scenes.md "Image Scenes") for more information.

- **Export - All Scenes to Folder**: Saves a copy of the entire project to a new or existing folder. This is useful for producing regular backups of a project during development, or preserving different versions.

- **Export - Compiled Game**: Creates a compiled HTML version of the current project, which can be then played in a browser or uploaded to a website. Please see the [Publishing & Exporting](topics/publishing-and-exporting.md "Publishing & Exporting") topic for more details (This is only supported in the desktop versions of CSIDE).

- **Test Project - Quicktest**: Brings up the Quicktest Window and runs the project through the automated test routine. Quicktest helps find and analyse scripting errors; in addition, a finished project must pass Quicktest in order to be considered for publication by Choice of Games/Hosted Games LLC. Please see [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging") for more details.

- **Test Project - Randomtest**: Brings up the Randomtest Window and runs the project through the automated test routine. Randomtest helps find and analyse logic and continuity errors; in addition, a finished project must pass Randomtest in order to be considered for publication by Choice of Games/Hosted Games LLC. Please see [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging") for more details.

- **Open Folder in Explorer/Finder**: Displays the folder containing a project's .txt files in either Explorer or Finder. This is the only way to permanently delete a project folder from within CSIDE. To delete the project folder, select it in Explorer/Finder and press DEL (Windows) or CMD-DEL (Mac).

> **Note**: Deleting a project does not automatically remove the project listing from within CSIDE. After deleting the project from Explorer/Finder, select 'close project' from the project menu to remove its listing from the Scenes & Projects tab.

- **Show/Hide Project**: Hides or reveals the project's entire scene list, excluding only the project header. This reduces clutter while leaving the project open for easy access. (N.B. Clicking the eye ('toggle visibility') button to the left of the project name also hides/reveals the scene list.)

- **Close Project**: Removes the entire project from CSIDE. This does not delete the project folder or its contents. Any closed project may be reopened using the 'Open New Scene Files' option, as if importing that project for the very first time.


**Next Topic**: [Scene Options](topics/scene-options.md "Scene Options")