## The Console

The CSIDE Console is a versatile monitoring, play-testing, and debugging tool, primarily designed to help hunt down 'logic errors' (see below) in your code. The Console, available by clicking the >_ symbol below the Editor Window, will track, log, and display the changing value of your variables in real time as you play-test your game. your game within CSIDE.

### What Is a Logic Error?

A ChoiceScript interpretor error—that's to say, the standard 'scripting bug'—is a bug that always causes a game to crash at a particular point. Most of the time, locating and identify scripting bugs is a fairly straightforward task.

The 'logic error' or 'game design bug' can be more elusive. Logic errors cause a game to behave strangely in a certain location, often only under particular circumstances, but they do not result in an actual game crash. This can make it much harder to isolate and understand the cause of the error, never mind fix it.

Logic errors can be caused by a typo or oversight in otherwise valid syntax, such as using a 'greater than' operator instead of a 'lesser than', or using 'and' instead of 'or' between two conditions. Logic errors are often related to the current value of a variable referenced at the exact point in the game where the bug occurs.

The basic idea behind the CSIDE Console tracking system is to allow you to monitor changes of specific variable values as you progress through your game. If you do find a game design bug, you can closely investigate what's happening to the variables behind the scenes, right up to that point in the game. Monitoring variable changes at every step of the way will help you find the faulty logic behind the bug.


### General Functionality

In addition to tracking commands and variables, the Console also supports a range of additional features. You can obtain variable values, change them either directly or by using operators, and even jump to a different scene or label. Think of the Console as a textual way to directly interact with your game 'behind the scenes' in real time, as you play through it a page at a time.

If you type a variable name into the Console, it returns the current value of that variable at this precise point in your play-test. This includes the values of 'hidden' variables not displayed on the stat screen. You can even use \*set to overwrite or modify that value in your active game before continuing with your play-test, allowing you to avoid inconvenient restarts or experiment with variable values. The Console also supports \*goto and \*goto_scene to 'jump' your running play-test game to a specific point for easy, quick testing.

Anything you put into the Console command line will not affect the actual scripting in your scene files. Using \*set, \*temp, \*goto, and \*rand will only change the temporary data being held in memory for the current running game, purely for play-testing and bug-hunting purposes.

As you play-test your game, the Console logs entries relating to variable creation and changes in variable values. You control what the Console will log by entering instructions into the Console command line, at the bottom of the Console window. When the Console is closed, a small red indicator appears beside the icon as new entries are logged in the Console's display.

> **Note**: If you make any changes to your game files, you must run the game again before those changes are reflected in the Console, even if the changes have been saved.

**Reading the Logs**: All variables created in the startup file are prefixed with 'stats'. Temp variables are prefixed with 'temps'. The name and line number of each value change is also logged for ease of reference.

**General Console Commands**: The Console will accept and log any correct command; an invalid command will return an error message. The command line buffers recent entries, so mistyped commands can be quickly corrected by pressing UP, making the necessary correction, and then pressing ENTER. Recent commands can be quickly cycled through by using UP/DOWN, allowing easy re-entry of common commands.

**Using the \*console_ Command in Game Files**: For purposes of thorough repeat testing, you can also insert certain \*console_ commands directly into your game's scene files. See below under 'Console Commands in Scene Files' for details.

> **Note**: Commands entered into the Console only impact the main game running in the Game Tab Panel. The Console does not affect a game running in Popout. This can be useful for comparing your current game's output against a version where you have input different variables, or made other changes via Console.


### Supported ChoiceScript Commands

**Variable**: Type any valid variable name into the Console to see the variable's current value. This will also work with 'hidden' variables not displayed on the stats screen.

**Expression**: Enter any valid ChoiceScript expression to see its current value. For example, (var1 and {var2}): If both var1 and {var2} are true, the Console would print back 'true'; if var1, {var2}, or both are false, the Console would print back 'false'. The same applies to strings: Entering firstname&(" "&lastname) would print out "John Doe" (assuming these variables existed, and were set to those values), and numbers: Entering 5+5 would print '10' back to the console.

**\*set [variable] [value]**: All \*set commands valid in ChoiceScript will also work in the Console (including modifiers and complex expressions). Using \*set will overwrite or otherwise modify any variable value in memory at this precise point in the play-test game.

**\*temp [variable] [value]**: Creates a temporary variable 'on the fly' while running a play-test game. Useful for tracking and testing new values without directly modifying the game's current state. Any \*temp variables created in this way will be removed when the current play-test game is refreshed, if the scene is changed, or when the game has ended.

**\*goto [label]**: Jumps to a specified \*label within the current scene.

**\*goto_scene [scene] [label]**: Jumps to the specified scene and label.

> **Caution When Using \*goto**: Using \*goto commands from the Console can lead to errors that could not exist in a standard play-through of the game. For instance, if you were to \*goto a section using a specific variable before visiting the section where that variable is created or defined, the game would then crash. Use \*goto and \*goto_scene with caution.

**\*rand [variable] [value1] [value2]**: Generates a new random value within a specific range and assigns it to the named variable.

**\*achieve [codename]**: Activates the named achievement as if that achievement had been earned/awarded in-game.

**Curly brackets**: Using the syntax \*set {var} will indirectly refer to one variable via the value of a second variable. For instance, if the value of 'var' is "strength", \*set {var} 5 will set the value of the variable 'strength' to 5; the value of 'var' would remain as "strength".

**\*restart**: Restarts the main instance of the play-test game running in the Game Tab panel, using the game version currently held in memory. Any changes to scene files will not be acknowledged, but all current Console tracking settings will be preserved.


### Console Tracking Commands

You can use the following commands to choose which variable values the Console will log and display during play-testing.

**\*help**: Displays useful reminders for interacting with the Console.

**\*help [command name]**: Provides information about the named command. For instance, '\*help track_all_on' would return information about the \*track_all_on function.

**\*clear**: Wipes all current logs, clearing the Console panel.

**\*track [var1] [var2] [var3] [etc]**: Tracks the individually named variable(s), e.g. \*track strength wisdom charity

**\*untrack [var1] [var2] [var3] [etc]**: Stops tracking the individually named variable(s), e.g. \*untrack strength wisdom charity

**\*untrack**: Stops tracking all variables which the Console is currently set to individually track.

**\*track_list**: Lists the names and current values of all variables being individually tracked. Returns 'Empty' if no variables are currently individually tracked.

**\*track_list [optional filter]**: As above, but lists only those variables containing the filter text, e.g. stats, temps, or any combination of characters precisely matching any part of the variable name. For instance, typing '\*track enemy1 enemy2 friend1' and then using '\*track_list enemy' would return 'enemy1' and 'enemy2' but not 'friend1'.

**\*track_all_on**: Overrides but does not remove the individual track variable list, and logs all variable changes.

**\*track_all_off**: Turns off track_all. Individually-tracked variables will continue to be logged in the Console panel.

**\*run**: Loads and runs the currently selected project as if you had refreshed the game with the 'Run project' icon on the project header bar.

> **Note**: a fresh 'run' (for instance, after making and saving changes in one or more scene files) will deactivate the current Console tracking settings, meaning the required tracking commands must be entered again. Conversely, when restarting, either by using the \*restart command in Console or clicking the 'restart' button in the Game Tab panel the game repeats from the start using the default data already held in memory. This preserves both the most recently run version of the game and the current Console tracking settings.

It is also possible to make a list of variables you would like the Console to track and include that list in the text of your game. This can save considerable time and streamline repeat testing. For more information, see the section below.


### Using Console Commands in Scene Files

You can also insert certain \*console commands directly into the code of your scene files to help streamline your testing. This avoids having to manually enter the above commands into the Console each time you run the game for a new play-test. It is also useful when logging data or expressions only in a specific section of your game, such as inside a loop.

The following commands may be used in the game code, and function as described above:

\*console_clear

\*console_track [var1] [var2] [etc.]

\*console_untrack [var1] [var2] [etc.]

\*console_untrack [no parameters -- untracks ALL track_list variables]

\*console_track_list [optional filter]

\*console_track_all_on

\*console_track_all_off

\*console_log [variable or expression]

\*console_log prints the value of a variable or valid expression into the Console at a particular point in your game. For instance, if your game reads:

<pre>
 *console_log "Evaluation for *if check under option 1"
 *console_log (((charisma > 50) and (unrest < 50)) and (enemy_speaker < 50)) or (ally != "Unknown")
 *choice
   #Talk the unruly townspeople into cooperating.
     *if (((charisma > 50) and (unrest < 50)) and (enemy_speaker < 50)) or (ally != "Unknown")
       The townspeople are wary at first, but you talk them round and they agree to give you a horse and supplies for your journey.
       *goto ride_on
     *else
       The townspeople don't like you very much. They grab some pitchforks and tell you to move along—so you do.
       *goto no_horse
</pre>

Assuming the first expression is true, the Console log would read:

Evaluation for \*if check under option 1
<br>True

### Important Notes on \*console_ Commands:

It is possible to use \*console_commands in your scene files for testing purposes within CSIDE without having to remove any of those commands from your public beta test version. This can be done by making all \*console_commands conditional on a boolean variable being 'true'. When this value is 'false'—the default setting for the beta test version—those lines will be ignored by ChoiceScript and their presence will generate no errors.

However, in order to run Quicktest or Randomtest, the \*console commands must be removed, or hidden by using Find-Replace All and the \*comment function. Otherwise, the automated tests will pick up \*console commands as errors.

We are working to address this incompatibility issue and will endeavour to keep users informed of our progress. Meanwhile, to hide \*console commands, we recommend using 'Find-Replace All' to replace '\*console' with '\*comment console'. When you are ready to use the Console commands again, use 'Find-Replace All' to change all instances of '\*comment console' back to '\*console'.


### Still can't find that annoying bug?

For those rare situations when even the standard Console log doesn't uncover the problem, you can also use the complementary Stepping function. This toggle can be turned off and on by clicking the 'Start Stepping' button on the main page of your play-test game.

The Stepping function lets you 'step through' any part of your play test, one line at a time. This lets you closely analyse exactly what each line of code is doing during your play-test. Please see the [Stepping](topics/stepping.md "Stepping") topic for more details.

**Next Topic**: [Stepping](topics/stepping.md "Stepping")

**Related Topics**:
- [Issues](topics/issues.md "Issues")

- [QuickTest & RandomTest](topics/quicktest-and-randomtest.md "Quicktest & Randomtest")

- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")