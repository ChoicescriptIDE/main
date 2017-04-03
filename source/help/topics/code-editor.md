## Code Editor

The Code Editor is the 'business end' of CSIDE; this is where it all happens. It effectively combines all the most useful - for our purposes - functionality of a standard text editor with features and functions specific to developing interactive fiction games using the ChoiceScript scripting language.

Consequently, many of the CSIDE Settings are directly related to the functionality and appearance of the Code Editor. If a particular feature does not appear to be working for you as described below, it's most likely that you simply need to adjust the appropriate Setting to properly enable that feature.


### General Functionality

- **Editor Display**: selecting any scene from the Scenes & Projects section will display the contents of that file within the Code Editor, noting both the Project and specific file name on the header bar above.

- **Hotkeys**: the Code Editor is a fully-functional text editor so standard keyboard short-cuts (such as those for undoing, selecting, cutting, copying and pasting text, etc.) are enabled.

- **Resizing**: buttons above the two top corners of the Code Editor window toggle open and closed the adjoining Scenes & Projects listing and Tab panels respectively, enlarging the actual Editor work area as needed for ease of use.

- **Full Window**: the ESC key (or F11) provides a handy 'full window' on/off toggle for the Code Editor itself (when this has actual focus, e.g. a blinking text cursor), temporarily removing the Scenes & Projects and Tab panels from view.

- **Auto Line-Wrapping**: when enabled under Settings, the Code Editor will automatically wrap longer lines (e.g. paragraphs of narrative) to fit the display width of the editor, adjusting accordingly if or when the editor is resized by such as using either of the options mentioned above.

- **Spell-checking**: You can choose between a US or UK dictionary Setting for automatic spell-checking purposes, as well as add words to (or remove from) a User Dictionary available via its own Tab panel on the right. Misspelled words in the Code Editor will be underlined with a dashed line, usually red in colour. Right-clicking on a misspelled word will pop up a menu offering alternative spellings, as well as the option to either temporarily ignore your spelling of this word (i.e. for this session only) or add it to your User Dictionary and thereby be deemed correct in future.

- **Code Highlighting**: the Code Editor incorporates automatic, colour-coded highlighting of ChoiceScript code, helping to differentiate between scripting and narrative text at a glance, as well as making it easier to spot possible coding errors and simple typos. For instance, *page_break will change colour the instant that you type the 'k', but only if spelled correctly and recognised as a legitimate command. Although you cannot change the actual highlighting colours used, these do vary based on whether you select a Dark, Light or Dichromatic overall Editor Theme under Settings.

- **Command Help**: when enabled under Settings, double-clicking a legitimate ChoiceScript command (e.g. *choice) typed in the Code Editor will run your default browser and automatically navigate to the specific Help page for that command on the ChoiceScriptDev Wikia. If your default browser is already running in the background, the applicable Wikia Help page will load in a new tab.

- **Text Formatting**: ChoiceScript supports both Bold and Italic formatting, using start and end 'tags' in the game files to indicate formatted words or phrases. While you can of course enter such tags manually as you type, within the Code Editor you can also use CTRL-B or CTRL-I (Mac: CMD-B / CMD-I), respectively, to wrap selected text with the corresponding scripting tags. If no text is currently selected, those hotkeys will instead place the tags where the cursor is, and with the cursor itself positioned between the start and end tags ready to simply type your formatted word or phrase.

- **Displaying Variables in Narrative**: similar to marking Bold or Italic text, within the Code Editor CTRL-D (Mac: CMD-D) will wrap a selected Variable name with the scripting required to properly display the value of that Variable at this point in-game. Likewise, if no text is currently selected, CTRL-D will instead insert the display code where the cursor is, and with the cursor positioned ready to simply type your Variable name within the curly braces.

- **Tab Indentation**: under Settings you can choose whether to use Tabs or spaces for your indentation, and can also specify the display size of a Tab or the number of spaces for one indentation level (the default setting is four spaces for one level). In addition, if you use spaces for your indentation, a single Tab key press will insert at the cursor point the actual number of spaces (2, 4, 6 or 8) you have specified for one indentation level, while Shift-Tab will dedent by one level.

- **Smart Indentation**: this optional function is designed to streamline your game scripting by automatically indenting - and, where possible, also dedenting - where and when ChoiceScript requires. While Smart Indentation is active, each time you hit the Enter key it will make the determination for the correct cursor starting position of the following line and, where required, will insert either Tabs or spaces according to your actual Settings for each indentation level. Holding down the Shift key while pressing Enter will however temporarily override Smart Indentation and place the cursor at the very start of the next line.

Although Smart Indentation is mainly intended (and especially useful) for new authors still getting to grips with the ChoiceScript scripting hierarchy, experienced coders are also encouraged to give this function a fair trial. It is our belief that most users should easily adjust to this more streamlined method of coding and will over time find it to be a distinct benefit, both in general and in terms of reducing the occurrence of casual indentation errors.


### Block Selection

A number of Code Editor features work well in conjunction with Block Selection (i.e. when selecting multiple lines of code or narrative using either your mouse or Shift-Up/Down arrow keys), as follows:

- **Word Count**: when activated under Settings, the bar immediately below the Code Editor will display the word count of the selected block (or that of the entire scene if no current selection) including or excluding command lines according to your current Setting.

- **Review - Word Count**: if you generally prefer Word Count turned Off under Settings to avoid distraction, selecting 'Review - Word Count' (from the context menu of the scene currently displayed in the Code Editor) will also separately detail the word count of a selected block.

- **Text Formatting**: the CTRL-I and CTRL-B hotkeys (Mac: CMD-I / CMD-B), for italic and bold text respectively, will apply start and end formatting tags to all selected lines, excluding *command lines and #option lines (you can still apply formatting to the #option text separately if required).

- **Block Indent / Dedent**: the Tab / Shift-Tab keys for indenting / dedenting respectively, will be applied equally to all lines of a block selection, whether using Tabs or spaces for your indentation.

- **Block Move**: while selecting a block with Shift-Up/Down arrow keys you can also simultaneously hold down CTRL to move the entire selection one line at a time in the indicated direction (effectively CTRL-Shift-Up/Down, or CMD-ALT-Up/Down on a Mac). This essentially achieves the same effect as cutting and pasting the selected block, but for 'local' code editing is considerably more fluid and efficient - especially when used in combination with Block Indent / Dedent.

- **Block Comment**: available via the context menu (right-click within a numbered line area of the Code Editor), the 'Toggle Block Comment' option will add - or remove - the *comment command at the start of each line of the selected block. This is especially useful for testing / debugging purposes, e.g. to quickly, temporarily disable an entire block of code prior to running a game test, and to easily re-enable it thereafter.

- **Stats Listing**: typing a list of variable names, selecting them all, and hitting CTRL-D (Mac: CMD-D) will wrap each individual variable name with the ChoiceScript code required to correctly display each of their values in-game, while ignoring any command lines (e.g. *line_break) included in the selection block. You can then add such as textual labels and bold / italic formatting as required to complete your Stats List for display purposes.


### Code Editor Context Menu

Right-clicking within the Code Editor window (numbered lines area only) will open a context menu of additional options, primarily offering mouse alternates to standard keyboard short-cuts such as cutting, copying or pasting text, indenting or dedenting a block selection, or selecting the entire contents of the scene file. However, there are two additional options here not currently actionable by any means other than via the Code Editor context menu:

- **Insert Double Line Break**: inserts two successive *line_break commands with a single click, forcing ChoiceScript to insert a completely blank line in-game at this point in your scripting / narrative. Useful for such as more neatly spacing a busy Stats page, and for some instances of conditional narrative.

- **Toggle Block Comment**: this option is explained in the section above, under 'Block Comment'.

### Multiple Cursors

By holding down CTRL (Mac: CMD) and clicking on a new location in the editor, additional text cursors can be created. When typing or navigating through the Code Editor, all such created cursors will move and recieve keyboard input.
This allows for easy multi-line deletion, or quick creation of commonly named variables etc. Clicking anywhere in the editor without holding down CTRL or CMD will remove all but the original cursor once again.

### Code Editor Usability Tip

Double-clicking the CSIDE main header bar toggles between your normal window size / position and Full Screen mode. If using a large widescreen monitor, for those extended periods of intensive writing / coding concentration you may in fact find it more comfortable to position / resize the CSIDE window in the middle of your screen, slide the Tabs panel out of view, and focus on the Code Editor with just the Scenes & Projects panel open on the left for ease of switching between files. Then, for such as running a play-test game or accessing the Help files, simply toggle back to Full Screen and slide open the Tabs panel.


**Next Topic**: [Tab Panels](topics/tab-panels.md "Tab Panels")