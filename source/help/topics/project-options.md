## Project Options

CSIDE enables you to easily and directly manipulate one or more ChoiceScript game projects in various ways and means. This page gives you a brief overview of these ways and means. You can check out [Projects](topics/projects.md "Projects") for a more
detailed explanation on what they are and how they're represented and handled by CSIDE.


### General Functionality

- Brand new projects can be created within CSDE by clicking the '+' icon alongside the 'Scenes & Projects' header.

- Existing game files can be imported into CSIDE (effectively creating a new Project but using existing content) by clicking the folder alongside the 'Scenes & Projects' header and selecting the actual .txt files to import.


### Project Header Bar

- A Project can be renamed at any time by double-clicking the Project header bar.

- Projects can be reordered as desired by dragging & dropping a Project header bar above or below other projects in the list. The new Project order will persist between sessions.

- A project's entire scene list (excluding only the Project header bar itself) can be hidden - or revealed - by clicking the eye icon to the left of the Project name, reducing clutter without requiring that a Project be closed.

- Save Project: clicking the floppy disk icon on the header bar will save all currently unsaved scene files related to this project.

- Add New Scene: clicking the '+' icon on the Project header bar will add a new 'Untitled' scene file to this project. (Clicking the new scene immediately after will allow you to instantly rename it.)

- Run Game: clicking the right-arrow icon on the header bar will run this Project within CSIDE and open / display it in the Game Tab panel on the right of the user interface.


### Project Context Menu

Additional Project options are available via a context menu, either by right-clicking a project's header bar or by selecting any scene file related to that Project and clicking the ('Project') Folder icon at the top-left of the user interface. The Project menu options are as follows:

- **Add New Scene**: adds a new 'Untitled' scene file to the selected project.

- **Open All Scenes**: opens (i.e. imports into this project) all valid .txt files located in the Project folder. Used in the event that not all scene files located in this folder have previously been opened within CSIDE, or if one of more scene files have subsequently been closed.

- **Reload All Scenes**: ensures that file content in CSIDE matches that of the saved .txt files (in the event, for instance, that one or more files have been edited outside of CSIDE while the software is running).

- **Review - Word Count**: pops up a window displaying the approximate word count of the Project as a whole, both including and excluding command lines.

- **Import - Image (as scene)**: by default, when running a play-test game within CSIDE any use of the \*image command in your scripting will attempt to reference the external image from the project's directory (the same folder as the scene files). If desired, however, with the 'Import - Image' option you can also convert a copy of your intended image into a data string that can be stored directly inside its own scene file. This comes with a small overhead in terms of image size, but allows support for images in compiled games. If the image conversion is successful, a pop-up window will display with a \*gosub_scene command for you to copy & paste into your other scene files, wherever you wish for the image to appear in your game.
> **WARNING** As image scenes contain the data for an entire image file, they have the potential to get rather large. As such you should avoid opening them within CSIDE for performance reasons - you would get no benefit from doing so. CSIDE itself ignores all scene files prefixed with 'csideimg' when being asked to 'Open All Scenes' etc. If you wish to replace an image via an image scene, simply delete the old one and then reimport the image.

- **Export - All Scenes to folder**: saves a copy of the entire Project to a different, specified folder (either new or existing). Useful for producing a separate backup of your Project at periodic intervals during development, or for publishing a beta test version of your game to places such as the 'Public' folder of a Dropbox account.

- **Export - Compiled Game**: creates a compiled HTML version of your current Project able to be uploaded to a website - or perhaps simply placed in an ordinary Dropbox folder - for reasons such as public beta testing purposes (see the [Publishing & Exporting](topics/publishing-and-exporting.md "Publishing & Exporting") topic for further details).

- **Test Project - Quicktest**: pops up the Test window and runs the Project through the automated - [Quicktest](topics/quicktest-and-randomtest.md "QuickTest & RandomTest") routine. In addition to helping resolve scripting errors, a finished Project must pass this test in order to be considered for publication by Choice of Games LLC.

- **Test Project - Randomtest**: pops up the Test window and runs the Project through the automated [Randomtest](topics/quicktest-and-randomtest.md "QuickTest & RandomTest") routine. In addition to helping resolve logic / continuity errors, a finished Project must pass this test in order to be considered for publication by Choice of Games LLC.

- **Open Folder in Finder/Explorer**: enables direct access to the folder in which the project's .txt files are located. This is also the only means by which you may actually permanently delete an unwanted Project folder from within CSIDE - by selecting that folder in Explorer and hitting your Delete key.

- **Show / Hide Project**: will hide from view (or reveal, if hidden) the project's entire file list excluding only the Project header bar itself, reducing clutter without requiring that a Project be closed. (N.B. Clicking the eye icon to the left of the Project name achieves the same effect.)

- **Close Project**: removes the Project from CSIDE in its entirety, but does not actually delete the folder itself nor any of its contents. A closed Project may later be reopened using the main 'Open new scene files' option, as if importing it for the very first time.

**Next Topic**: [Scene Options](topics/scene-options.md "Scene Options")