## Code Editor

The Code Editor is the 'business end' of CSIDE, where you'll be creating your game. It combines the most useful functions of standard text editors with unique features designed specifically for ChoiceScript writers.

Many of the <a href="#" rel="cside" title="settings" onclick="CSIDE(parent.cside.selectTab.bind(null, 'settings'));">Settings</a> in CSIDE are directly related to the functionality and appearance of the Code Editor. If a particular feature does not appear to be working for you as described, check your Settings to confirm that feature is enabled.

### General Functionality

- **Editor Display**: Selecting a scene from the Scenes & Projects Panel displays the contents of that file in the Code Editor. The current project and scene name will appear on the header bar at the top of the Editor.

- **Hotkeys**: The Code Editor is a fully functional text editor with standard keyboard shortcuts enabled, for instance: undo, select, cut, paste, and more. A full list of keyboard shortcuts can be found [here](topics/keyboard-shortcuts.md "Keyboard Shortcuts").

- **Resizing**: Clicking the double arrow icons above the top two corners of the Code Editor window toggle the adjoining Scenes & Projects Panel or Tab Panel open or closed. This enlarges the Editor window, allowing for more working space.

- **Full Window**: The ESC key (or F11) provides a handy 'full-window' on/off toggle for the Code Editor. This temporarily removes the Scenes & Projects and Tab Panels and all headers from view. The Code Editor must be in focus (that is, with a blinking text cursor) in order to use the full-window toggle.

- **Auto Line-Wrapping**: When enabled in Settings, the Code Editor will automatically wrap longer lines, such as narrative paragraphs, to fit the display width of the editor. The line wrap will automatically adjust if the editor window is resized.

- **Spellchecking**: CSIDE offers US and UK dictionaries in Settings. Words underlined in red in the Code Editor window indicate that those words are not in the current dictionary nor the User Dictionary. Right-clicking on an underlined word presents a menu with options to choose an alternative spelling, ignore the spelling for the current session, or add the word to the User Dictionary.

	The User Dictionary is accessible through the [Tabs Panel](topics/tab-panels.md "Tabs Panel"). It is possible to both manually add and remove words via the dictionary's interface. Any words added to the User Dictionary will not be underlined as misspellings in the Code Editor. For more information, please see the <a href="#" rel="cside" title="User dictionary" onclick="CSIDE(parent.cside.selectTab.bind(null, 'dictionary'));">User Dictionary tab</a>.

- **Code Highlighting**: The Code Editor incorporates automatic colour-coded highlighting of ChoiceScript commands. This highlighting helps distinguish between script and narrative at a glance; it also makes possible coding errors and typos immediately obvious. For instance, \*page_break will change colour the instant the command is completed, but only when spelled correctly and recognised as a legitimate command. Each category of code—#options, \*set/{variable}, \*goto/\*label, and \*comment—is highlighted in a different colour for ease of differentiation.

	It is not possible to change the highlighting colours used, but they do vary according to the Dark, Light, or Dichromatic Code Editor themes (selectable in <a href="#" rel="cside" title="settings" onclick="CSIDE(parent.cside.selectTab.bind(null, 'settings'));">Settings</a>).


- **Command Help**: When enabled under Settings, double-clicking a legitimate ChoiceScript command typed in the Code Editor (for instance, *choice) opens your default browser and automatically navigates to the Help page for that command on the [ChoiceScriptDev Wikia](http://www.choicescriptdev.wikia.com/ "ChoiceScriptDev Wikia"). If your default browser is already running in the background, the Help page will load in a new tab.

- **Text Formatting**: ChoiceScript supports both bold and italic formatting, using start and end tags in the game files to mark formatted words or phrases. The CTRL-I and CTRL-B hotkeys (CMD-I and CMD-B) will wrap selected text with the formatting tags for italics and bold, respectively. If no text is currently selected, the hotkeys place the start and end tags on either side of the cursor. You can also quickly remove matching tags by repeating the same process.

- **Displaying Variables in Narrative**: Using CTRL-D/CMD-D wraps the selected text with the scripting to display a variable's value. If no text is currently selected, the hotkeys place the start and end braces on either side of the cursor.

- **Tab Indentation**: Indentation in ChoiceScript uses either spaces or tabs. The default indentation can be changed in <a href="#" rel="cside" title="settings" onclick="CSIDE(parent.cside.selectTab.bind(null, 'settings'));">Settings</a>. In addition when using spaces, pressing the TAB key will insert the correct number of spaces for a single indentation level (2, 4, 6, or 8). SHIFT-TAB will dedent by one level. TAB and SHIFT-TAB also work with selected blocks of text.

- **Smart Indentation**: This optional function streamlines game scripting by automatically indenting—and where possible, also dedenting—according to ChoiceScript's requirements. When Smart Indentation is active, the Code Editor will move the cursor to the correct indentation on each new line. Holding down SHIFT while pressing ENTER temporarily overrides Smart Indentation, placing the cursor at the very start of the next line.

	Although Smart Indentation is especially useful for new authors who are still learning ChoiceScript's indentation hierarchy, we encourage experienced ChoiceScript coders to give this function a try. It is our belief that most users can easily adjust to this simpler, more streamlined method of coding and, over time, will find it to be a distinct benefit for ease of coding and reduction of casual indentation errors.


### Block Selection

A number of Code Editor features work well when using Block Selection (i.e. when selecting multiple lines of code or narrative using the mouse or SHIFT-UP/DOWN).

- **Automatic Word Count**: When activated under Settings, the bar immediately below the Code Editor displays the word count of the selected block, or the word count of the entire scene if no text is selected. This can include or exclude command lines according to the preference indicated in Settings.

- **Review - Word Count**: Selecting 'Review - Word Count' from the context menu of the active scene will also detail the word count of any selected text in that scene.

- **Text Formatting**: The CTRL-I or CTRL-B hotkeys (CMD-I or CMD-B) apply start and end formatting tags for italics or bold to all selected lines. The formatting will automatically exclude *command and #option lines, and then #option text can be individually formatted if desired.

- **Block Indent/Dedent**: The TAB/SHIFT-TAB keys automatically indent or dedent all selected text by one level.

- **Block Move**: CTRL-SHIFT-UP/DOWN moves an entire block of text up or down by one line at a time. This essentially achieves the same effect as cutting and pasting, but it allows for more fluid and efficient local editing, especially when used in combination with block indent/dedent.

- **Block Comment**: Toggles selected text to or from \*comment mode by adding \*comment at the beginning of each selected line. Right-click in the numbered line area of the Code Editor and select 'Toggle Block Comment' to use. This is especially useful for testing, debugging, and publishing purposes; it's a quick and simple way to temporarily disable an entire block of code prior to running a game test. It can also be useful for hiding in-progress material when sharing beta versions of the game.

- **Stats Listing**: Typing a list of variable names, selecting them all, and hitting CTRL-D/CMD-D will wrap each individual variable name with the scripting to display its value, while ignoring any command lines (e.g. \*line_break) included in the selection block. The 'stats listing' function is particularly useful when building or editing the Stats Screen.


### Code Editor Context Menu

Right-clicking in a blank section of the Code Editor will open a context menu with additional options, primarily offering mouse alternatives to standard keyboard shortcuts such as cut, copy, and paste. However, there are two additional options not currently accessible through other means:

- **Insert Double Line Break**: Inserts two successive \*line_break commands with a single click, causing ChoiceScript to insert a completely blank line in-game at this point. For preserving spacing in \*if statements, #option sequences, and so forth, a blank line followed by \*comment end_if is recommended instead. This informs editors or proofreaders of the author's intentions with paragraph and line layouts.

- **Toggle Block Comment**: See 'Block Comment' in the section above.

### Multiple Cursors

New text cursors can be created by holding down CTRL/CMD and clicking on a new location in the editor. When typing or navigating through the Code Editor, all cursor points will move and receive keyboard input. This allows for easy multi-line deletion, quick creation of commonly-named variables, selecting and moving several disparate sections of text, etc.. Clicking anywhere in the editor without holding down CTRL/CMD will remove all additional cursors. Individual cursors can be removed by CTRL/CMD clicking within the line in which the cursor currently resides.

### Code Editor Usability Tip

Double-clicking the CSIDE main header bar toggles between your normal window size and position and fullscreen mode. For widescreen users, it may be more comfortable to resize or position the CSIDE window in the middle of the screen when using the Code Editor. Then you can slide the Tabs Panel out of view, focusing on the Code Editor, with the Scenes & Projects Panel open for ease of switching between files. Then if you want to run a play-test game or access Help files, simply toggle back to Full Screen and slide open the Tabs panel.


**Next Topic**: [Tab Panels](topics/tab-panels.md "Tab Panels")