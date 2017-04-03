## The Console

The CSIDE Console is a versatile monitoring, play-testing and debugging tool, primarily intended to help hunt down 'logic errors' (see below) in your code. It mainly accomplishes this by automatically tracking, logging and displaying - in real-time - the changes of variable values as you play-test through your game within CSIDE. 

In addition to its various tracking commands, the Console also supports a range of additional commands to easily obtain, or even change, the current data of the play-test game running in the Game Tab panel. Think of it as a textual way to directly interact with your game "behind the scenes" in real-time, as you play through it a page at a time.

For instance, simply typing a variable name into the Console will return the current value of that variable at this precise point - the actual current page - in the game (including the values of 'hidden' variables not displayed on the Stats screen). If desired, you can also use \*set to immediately overwrite or modify that value in memory before continuing with your play-test - potentially avoiding some painful restarts. You can even use \*goto or \*goto_scene in the Console to 'jump' your running play-test game to a specific future point for easier testing of the most recently-added section, while perhaps also using the \*set command via the Console to adjust certain Stats to better suit the stage of the game about to be tested.

Rest assured, nothing you input directly into the Console command line will alter in any way the actual scripting in your scene files. Commands input into the Console - including those such as \*set, \*temp, \*goto and \*rand - will affect only the data presently held in memory for the current running game, purely for easier play-testing / bug-hunting purposes.


### General Functionality

The Console window is opened (and closed) by clicking the >_ button below the bottom-left corner of the Code Editor. While closed, a small red indicator will appear beside this icon whenever new log entries are added to the Console display.

As you progress through your play-test game, the Console will populate itself with log entries relating to the creation of variables and any changes to their values, according to your specific requirements. You control *exactly* what you want logged in the Console by entering appropriate instructions directly into the command line at the bottom of the Console window.

Within the displayed Console logs, 'stats' prefixed variables are those originally created in the startup file with the \*create command, while 'temps' prefixed variables are those generally created within ordinary scene files using the \*temp command. The name of the scene in - and the line at - which each change occurred is also logged for ease of reference.

Generally speaking, commands entered into the Console will either be accepted as entered (i.e. a command appearing in the log as typed is its own verification) or - in the event something is not quite correct - will return an error message. The Console command line buffers recent entries, so if the error was caused by mistyping something, it's a simple matter to fix: press the Up arrow key, make the necessary correction, and hit Enter again. The command line buffer and Up / Down arrow keys also enables you to quickly cycle through any recent commands made in that session, thereby allowing easy re-entering of those that are most commonly used.

For purposes of thorough repeat testing, you can also insert certain \*console_ commands directly into your game code / scene files if required - just as you do with ordinary ChoiceScript commands - to automatically output to the Console display as you play-test through your game, effectively reducing the need to manually enter those commands into the Console each time you run the game for yet another play-test.

Once a Project is actually running in the Game Tab panel, any or all of the following commands may be entered into the Console command line as required, at any point during the play-test. Note however that commands entered into the Console will directly impact only the main game instance running in the Game Tab panel, not the Popout instance.


### Supported ChoiceScript Commands

The range of supported ChoiceScript commands is as follows:

**variable**

Simply typing any valid variable name into the Console will return the current value of that variable at this precise point in the game, including any 'hidden' variables not displayed on the Stats screen.

**expression**

Enter a valid ChoiceScript expression (e.g. with a copy / paste directly from your scene files) to see what it would evaluate to - e.g. whether currently 'true' or false' - at this precise point in the game. An expression is essentially any single line of ChoiceScript that evaluates to a value, an example would be any valid \*if or \*set line, excluding the if/set part itself. E.g: (var_1 and {var_2}).

**\*set** [variable] [value]

The above basic example syntax notwithstanding, anything you can do with *set in ChoiceScript you can also do via the Console to overwrite or otherwise modify any variable value in memory at this precise point in the test game.

**\*temp** [variable] [value]

You can use the Console to create new temporary variables 'on the fly' while running a play-test game. Useful when wishing to store and test on new values without directly modifying the game's current state.

**\*goto** [label]

Allows you to jump the main instance of the running play-test game to any (e.g. a later) stage of the current scene, without having to click your way through the game as normal.

**\*goto_scene** [scene] [label]

Allows you to jump the main instance of the play-test to any label section of any scene in the game, e.g. the latest section recently added to the game and now in need of testing.


> **WARNING** using the \*goto commands from the console can cause errors that wouldn't normally exist. For e.g. if you were to \*goto to a section that uses a variable before visiting the section where it is defined. Use them with caution.


**\*rand** [variable] [value1] [value2]

Generate a new random value between a specific range and assign it to the named variable.

**\*print** [variable]

Display the current value of a named variable on the actual current page of the main instance in-game, rather than as a Console log. You can also *print "anything else you like, really" like so.

**\*achieve** [codename]

Activate the named achievement as if that achievement has been earned / awarded in-game.

**\*setref**

A legacy command used to indirectly refer to a variable via the value of another variable. The same effect can now be achieved with the syntax *set {my_var}. For example, if the value of **my_var** was "strength" *setref my_var 5 or *set {my_var} 5 would actually attempt to set the value of the variable called **strength** to 5, not the value of my_var itself, which would remain "strength".

**\*restart**

Restart main instance of the play-test game running in the Game Tab panel, using the game data currently held in memory (any changes to scene files will not be acknowledged). All current Console tracking settings will be maintained.


### Console Tracking Commands

The following range of commands enables you to dictate the variable values you want to have automatically logged and displayed in the Console as you play-test through the main instance game currently running in the Game Tab panel.

**\*help**

Displays helpful reminder information pertaining to using the Console

**\*help** [command name]

Returns help info specific to the named command e.g. *help track_all, *console_help console_track_all - or any combination thereof, with or without the console_ prefix.

**\*clear**

Wipes all current logs, clearing the Console display ready for a fresh Run or Restart

**\*track** var1 [var2] [var3] [etc.]

Start tracking the named individual variable(s) e.g. *track strength wisdom charity

**\*untrack** var1 [var2] [var3] [etc.]

Stop tracking the named individual variable(s) e.g. *untrack strength charity

**\*untrack**

Stop tracking ALL variables currently being individually tracked

**\*track_list**

List the names and current values of all variables being individually tracked. Returns Empty if the list is empty.

**\*track_list** [optional filter]

As above, but list only those variables containing the filter text (e.g. stats, temps, or any combination of characters precisely matching any part of the variable name) e.g. *track_list stats

**\*track_all**

Overrides (but does not remove) the individual variables track list and logs ALL variable changes

**\*untrack_all**

Turns off track_all. Individually-tracked variables will continue to be logged.

**\*run**

Loads and runs the currently-selected Project anew, as if you had clicked the 'Run this project' button on the Project header bar

Note that a fresh "Run" (e.g. after making some changes in one or more scene files) will deactivate the current Console tracking settings, meaning that the required commands must be entered again. Conversely, a "Restart" (i.e. clicking that button in the Game Tab panel, or entering *restart directly into the Console) simply repeats the game from the start using the default data already held in memory, so will also continue to use the current Console tracking settings.


### Using Console Commands in Scene Files

You can also insert certain *console_ commands directly into your game code / scene files to help streamline your testing, thereby avoiding having to manually enter the above commands into the Console each time you run the game for yet another play-test. This is also useful when you to log (or start logging) data or expressions at a very specific points in your game, inside a loop for example. The following commands are possible, and the specific details of each are identical to the manual version described above:

- \*console_clear
- \*console_track var1 [var2] [etc.]
- \*console_untrack  var1 [var2] [etc.]
- \*console_track_list [optional filter]
- \*console_track_all
- \*console_untrack_all

**\*console_log** [output]

In addition, you can use *console_log within your game code to output to the Console display - at any desired point in your game - particular current variable values or even the result of ChoiceScript expressions. This is perhaps best illustrated by example:

> \*console_log strength

The above will output to the Console display the current value - at this precise point in the test game - of the variable called 'strength'.

> \*console_log (((var1 > 50) and (var2 < 50)) and (var3 < 50)) or (var4 != "Unknown")

The above example will output to the Console display either 'true' or 'false' dependent on how that expression evaluates based on the current values of those four variables at this precise point in the game. For instance, you may insert that \*console_log line just before a \*choice containing that exact \*if expression within the first #option body, so when you reach that page in your test game you already know (via the Console display) how the game should proceed when you select that first option.

You can also use \*console_log to clarify / remind yourself of the information being displayed in the Console, by outputting a specific comment using "quotation marks". For example:

> \*console_log "The following line is the evaluation for Option 1"


### Important Notes - \*console_ Commands:

It's possible to make use of \*console\_ commands in your scene files for your own CSIDE testing purposes even while also running a Public Beta Test of your game - without having to actually remove any of those commands from the public version. This can be achieved simply by making all \*console\_ commands conditional on a boolean variable being "true". While this value is "false" (the default setting for your Public Beta Test version, of course), those lines will simply be ignored by ChoiceScript when running in a play-tester's own browser, and their presence will not therefore generate any errors. This applies whether your Public Beta Test version uses a single compiled HTML file or a full set of scene files.

Conversely, at the present time the use of CSIDE \*console\_ commands in scene files does however fall foul of the automated Quicktest and Randomtest routines currently provided by Choice of Games LLC and incorporated within CSIDE for your convenience. We are working on addressing this incompatibility issue and will endeavour to keep users informed of progress. In the meantime, it will unfortunately be necessary to remove \*console_ commands from your scene files prior to testing your game with either of the automated tests.


### What is a 'Logic Error'?

A ChoiceScript interpretor error - the standard 'scripting bug' - is one that always causes a game to crash at a particular point, thereby usually making it fairly easy to locate and identify. Conversely, its far more perfidious and elusive cousin - the 'logic error' or 'game design bug' - is an error that causes the game to behave strangely in a specific situation, and often only under particular circumstances, but does not result in an actual game crash. This can make it much harder to isolate and understand the cause of the problem, never mind actually fix it.

Although logic errors may be caused by something as simple as incorrect but otherwise entirely valid syntax (e.g. a 'greater than' operator where you actually need to use 'less than'; or using 'and' between two \*if conditions where it should in fact be an 'or'), most logic errors tend to be related to the current value of a variable being referenced at the exact point where the bug is manifest in the game's output. In this sort of situation the game is often acting on data incorrectly \*set at an earlier stage, or is perhaps not properly allowing for the possibility of that particular earlier change, or in some cases may even be referencing entirely the wrong variable!

The basic idea behind the CSIDE Console tracking system is that you can have it monitoring changes to specific (or even all) variable values as you progress through your game. When you do spot an odd 'game design bug' you can then more closely investigate what's actually been happening behind the scenes up to that point, every step of the way, and thereby more easily identify the faulty logic leading up to it.


### Still can't find that annoying bug?

For those rare situations where even the standard Console logs aren't sufficient to help you resolve a particular problem, you can also activate the complementary Stepping function. This toggle (turn on and off at will) function  enables you to 'step through' any part of your play-test run literally one line of code at a time, and thereby more closely analyse and double-check everything your code is doing while the game is actually running. The Stepping function is covered in a separate Help topic.


**Related Topics**:
- [Issues](topics/issues.md "Issues")

- [Stepping](topics/stepping.md "Stepping")

- [QuickTest & RandomTest](topics/quicktest-and-randomtest.md "QuickTest & RandomTest")

- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")