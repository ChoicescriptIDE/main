## Tabs Panel

The CSIDE Tabs on the right of the user interface work just like tabs in your browser, in that you can switch between them at will (using the buttons above this section) to view or use a different panel, then switch back to the first panel and continue from that exact point.

Note that you can slide the Tabs Panel in and out of view by clicking the <-> button above the top-right corner of the Code Editor.


### Help Tab

CSIDE displays the Help Tab panel by default when first loaded. You can also click the question mark icon above to refer to the Help documentation at any time without negatively impacting anything else you may be doing within CSIDE at that time.


### Settings Tab

The various CSIDE Settings determine the appearance and functionality of the software and can be accessed at any time by clicking the cog icon above. Changes made to the Settings take immediate effect and are automatically saved. Your current Settings will persist between sessions.


### User Dictionary Tab

Clicking the book icon above grants access to your User Dictionary. Here you can manually add (or remove) user-defined words such as unusual spellings of character or place names (e.g. 'Delgorath'). Doing so prevents your chosen dictionary from subsequently marking such words as misspellings in the Code Editor, while also serving to then highlight any genuine misspellings (e.g. 'Delgaroth') of your user-defined words, ensuring consistency throughout your narrative.

Right-clicking a misspelled word in the Code Editor pops up a menu of alternate spellings to consider, but if you decide the spelling is correct there is also an option to easily and automatically add that word to your User Dictionary.

As with an ordinary dictionary, however, note that the User Dictionary is not case-sensitive. Both 'Delgorath' and 'delgorath' would be deemed correct in the Code Editor if that word exists in your User Dictionary. By the same token, note that Variable names including actual numbers (e.g. var1) are not considered proper "words" for spell-checking purposes and will therefore be ignored.

You may however find it useful to add abbreviated or abstract Variable names to your User Dictionary where you see these highlighted as possible misspellings in the Code Editor - at least for the duration of the Project in which they're used. Doing so not only prevents such being repeatedly highlighted as misspellings in your code, it will also serve to better highlight any inadvertent misspellings of those Variable names, reducing the likelihood of 'unknown variable name' errors / game crashes when testing.


### Issues Tab

The triangular icon with the exclamation mark denotes the Issues Tab panel. 'Issues' are scripting errors and the like detected while running a test game within the Game Tab panel.

This subject is covered in greater detail in a separate Help topic: [Issues](topics/issues.md "Issues")


### Example Projects Tab

It is our intention to over time provide a number of useful Example Projects to assist CSIDE users in both learning ChoiceScript initially (where required) and to help improve overall understanding of, and general competency with, the ChoiceScipt scripting language. This Tab will be automatically updated when a new Example Project - or a new version of an existing Example Project - becomes available.

To make use of any Example Project within CSIDE it is necessary to first import it using the button available. This process allows you to create a specific new folder in which to place the Example Project, at which point a new Project containing all the relevant scene files will also be automatically created for you within CSIDE. Once installed, click the 'Run this project' button on the new project's header bar to launch the Example Project.

By this means you can not only 'Run' the Example Project, you can also change and experiment with its scripting at will, without fear of breaking something in the process! If you do manage to render it completely unusable while experimenting with its code, simply close / delete that Project and repeat the above process to re-import a fresh copy and try again.

Our first Example Project - the Interactive CSIDE Tutorial - is a detailed guide to "Learning Basic ChoiceScript". Although primarily intended for complete beginners and other relative newcomers to the ChoiceScript scripting language, it also serves to provide all new users with a basic introduction to CSIDE itself and is perhaps worth at least skimming through initially for that purpose alone.


### Game Tab

Clicking the 'play' (right-arrow) icon on a Project header bar will run that game within CSIDE and automatically switch to / open the Game Tab panel (denoted by the cube icon above) for display.

Alternatively, CTRL-Shift-Enter (Mac: CMD-Shift-Enter) will quick-run the Project you're currently working on in the Code Editor, if that has focus (e.g. a blinking text cursor), with the same result. However, if you do find yourself tending to use this hotkey method of launching a game test, remember to use CTRL-S (Mac: CMD-S) to first quick-save the current scene so the new test run is properly taking account of all your latest changes.

Your game test will run and display in the Game Tab panel exactly as it would in a web browser, with some useful additions. Extra buttons at the top alongside the usual 'Show Stats' and 'Restart' buttons grant access to additional functions to assist with testing, bug-hunting and fine-tuning your game, namely:


- **Popout**: this Game Tab button runs an additional instance of the game in a separate, resizeable window, so you can simultaneously test two different options / paths. This can be especially useful for comparing conditional narrative responses and checking for any related inconsistencies and / or formatting problems.

A fresh Popout instance will always start at the same game page as - and with the identical data of - the current page of the main instance running in the Game Tab panel. This makes it possible to quickly and easily check the narrative response for every single #option of a particular *choice currently displayed in the main instance of the game: Click the Popout button, select and play-test the first #option in the Popout window, and then close the window. Click Popout again (it will once again reflect the main instance page with its current *choice display), and select the second #option for testing. Repeat as much as needed until you are satisfied that each and every #option of this particular *choice is working as intended, before advancing the main game instance along a particular route to test the next significant *choice in a similarly thorough fashion.

Should either the main or popout instance of the game encounter an interpretor error in your scripting while running, that instance of the game may crash (just as it would in your browser) and will no longer continue. The other instance will however be unaffected unless, in continuing, it also encounters the same or a different scripting bug. A game crash in either instance will generate a log entry in the Issues Tab to help identify, locate and resolve the error(s).

Needless to say (but we will anyway), your test game(s) crashing will not in any way affect the stability or performance of CSIDE itself. If at first you don't succeed, fix it and try again!


- **Start Stepping**: this advanced Game Tab button function is covered in a separate Help topic: [Stepping](topics/stepping.md "Stepping")


- **CSIDE Console**: not a button on the Game Tab panel itself, but a versatile monitoring and debugging tool directly related to test-running a Project in the Game Tab panel, explained in a separate Help topic: [Console](topics/console.md "Console")


**Next Topic**: [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")