## Tabs Panel

The CSIDE Tabs, on the right of the user interface, work just like tabs in your browser. You can select a tab by clicking its icon. When switching between tabs, each individual tab page will stay in the same position as when last viewed. You can hide or display the Tabs Panel by clicking the double arrow button at the top right corner of the Code Editor.


### Help Tab

CSIDE displays the Help Tab panel by default when first loaded. Click the question mark icon above to refer to the Help documentation at any time. Using the Help Tab will not alter or interfere with the other Panels or Tabs.


### Settings Tab

The Settings Tab, accessed through the cog icon above, provides options for CSIDE's appearance and functionality. Changes to Settings take immediate effect, are automatically saved, and persist between sessions.


### User Dictionary Tab

The User Dictionary, accessed through the book icon above, allows for manual addition or removal of user-defined words, such as unusual spellings or character and place names (e.g. 'Delgorath'). User-defined words will not be marked as misspelled in the Code Editor. Any genuine misspellings (e.g. 'Delgaroth') will still be underlined, helping ensure consistency throughout the narrative.

Right-clicking a misspelled word in the Code Editor displays a menu of possible alternate spellings. It also offers the options to ignore the word during the current session, or add it permanently to the user dictionary.

As with an ordinary dictionary, the User Dictionary is not case-sensitive. Both 'Delgorath' and 'delgorath' would be deemed correct in the Code Editor as long as that word is in the User Dictionary. By the same token, note that 'words' including numbers, underscores, or other special characters, e.g. 'var1', are not considered actual words by the spell-checker and will be ignored.

You may find it useful to add abbreviated or abstract variable names to your User Dictionary, at least for the duration of your current project. This avoids repeated highlighting of your legitimate variables; it also helps highlight any inadvertent misspellings in your code, reducing the likelihood of 'unknown variable name' errors and game crashes during testing.


### Issues Tab

The Issues Tab is represented by a triangle and exclamation mark icon. 'Issues' are scripting errors detected while running a test game in the Game Tab panel. For more information, see [Issues](topics/issues.md "Issues").


### Example Projects Tab

It is our intention over time to provide a number of useful Example Projects. These Projects are designed to assist CSIDE users in learning and growing with ChoiceScript. This tab is automatically updated when new Example Projects, or new editions of existing examples, become available.

To use an Example Project, first import it using the 'Import' button. This creates a new folder for the Example Project on your hard drive. This creates a new folder for the Example Project on your hard drive and automatically opens the project in CSIDE. Once installed, click 'Run This Project' on the new project's header bar to launch the Example Project.

You can freely change and experiment with the scripting of an Example Project without fear of breaking something in the process. If the Example Project becomes unusable, simply close or delete the project and import a fresh copy.

Our first Example Project, 'The Interactive CSIDE Tutorial', is a detailed guide to learning basic ChoiceScript. Although primarily intended for newcomers to ChoiceScript, it also provides all new users with an introduction to CSIDE.


### Game Tab

Clicking the Play icon (right arrow/'Run project') on a project header bar runs that game in CSIDE, automatically switching to the Game Tab in the Tabs Panel. The Game Tab can also be selected by clicking on the cube icon above.

Alternately, CTRL-SHIFT-ENTER (CMD-SHIFT-ENTER), when the Code Editor window has focus (i.e., a blinking cursor), will quick-run the current project in the Code Editor. Remember to use CTRL-S/CMD-S to first quick-save the current scene; otherwise, the play-test game will not reflect the latest changes.

The play-test game will run exactly as it does in a web browser, along with some useful additions. Extra buttons at the top, located alongside the usual 'Show Stats' and 'Restart' buttons, grant access to these features:


**Popout**: Runs an additional instance of the game in a separate, resizeable window, so you can simultaneously test two different options/paths. This can be especially useful when comparing conditional narrative responses, or checking for related inconsistencies and formatting issues.

A fresh popout instance alway starts on the same page and with the same data as the main game running in your Game Tab panel. This way, it's possible to check the narrative response for every single #option of a particular *choice without having to play through from the beginning.

To try it, click the popout button, select and play-test the first #option in the popout, and then close the window. Click popout again, which will once again reflect the position of the main game in the Game Tab, and select the second #option for testing. Repeat as needed to check each #option of a particular \*choice.

If the main game or the popout encounter an error in the game code while running, the game may crash, just like it would in a web browser. If the game crashes in only the Game Tab or the popout, the other instance will continue unless it also encounters a game-breaking scripting bug.

A game crash will almost always generate a log entry in the Issues Tab to help locate, identify, and resolve the error(s). If at first you don't succeed, fix it and try again! And of course, a test game crash does not affect the stability or performance of CSIDE in any way.


**Start Stepping**: This advanced Game Tab function is covered under [Stepping](topics/stepping.md "Stepping").


**CSIDE Console**:  This is an advanced, very versatile monitoring and debugging tool directly related to test-running a Project in the Game Tab panel. It is covered in its own Help topic: [Console](topics/console.md "Console").


**Next Topic**: [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")