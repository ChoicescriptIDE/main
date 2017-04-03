## Issues

### What is an Issue?

In CSIDE the word "Issue" refers to a logged error about your game. More often than not an Issue is a scripting error that has occurred during play-testing a Project within CSIDE, but Issues can be anything which might otherwise be thought of as a "problem" with your game and therefore in need of addressing before final publication.

Most of the time, however, an Issue will take the form of an "interpreter error" thrown by ChoiceScript itself while play-testing your game within CSIDE, meaning there's a problem with your actual scripting on a specific line, in a particular file, which is causing the game to crash at that exact point.

Issues are logged in the Issues Tab on a per-project basis and are NOT persistent between CSIDE sessions.


### How are Issues Organised?

Each issue is associated with a Project. Many issues will also be associated with a specific Scene, if for example, the error was caused by code within that scene. As it unnecessary for all of a Project's scene files to be open in order to run a Project within CSIDE, if a scene file which isn't open is associated with an error (or issue), CSIDE will automatically attempt to load the scene and log the error.

Note that issues are not session persistent, if you close a scene while it has outstanding Issues, any related log entries will disappear from the Issues Tab.


### The Issue Tracker

The Issue Tracker isn't really a separate tool as such but is rather the term used to describe some of CSIDE's native Issues-related behaviour. For example, if a scripting error is encountered during the running of a project, CSIDE will log that error as an Issue and as part of the 'tracking' functionality it will - where possible - automatically focus on and highlight, within the Code Editor, the actual line of code which caused the error. In short: the instant an error is detected it forcefully swaps your Editor window to the suspect line and scene file so you can attempt an immediate fix.

It should be noted that the Issue Tracker will highlight / point to the line which ChoiceScript itself says is at fault, but in certain cases the error actually occurs somewhere above the indicated line number but cannot be detected before then. For example, if you are missing a simple *goto command for one #Option and thereby illegally 'fall out' of a *choice statement, the error is not detected until it hits a line containing something other than the expected *goto. In essence, if you cannot spot any obvious error on the indicated line itself, look in the section of code above that line for where something more (like a *goto) perhaps needs inserting. Pay particular attention to the actual error message in this sort of situation as it will likely help guide you to the correct solution.

If you decide to come back to the Issue later (but within the same session) you can use the 'Find Issue' button on the Issues Tab for any listed Issues with known line numbers, to have the Code Editor jump to & highlight it once again.


### What do I do with Issues?

Why, you fix them of course! OK, so sometimes it might not be quite that simple, but the Issues Tab does give more details about each Issue to help you identify and resolve the cause of each individual problem, while the Code Editor will simultaneously focus on and highlight the actual line where the error was first detected. Once you feel that you've fixed an Issue, you can dismiss it under the Issues Tab by clicking its 'dismiss' (tick / check mark) icon. Doing so will also clear the Code Editor of the error highlighting on that Issue's line number.


**Related Topics**:
- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")

- [Console](topics/console.md "Console")

- [Stepping](topics/stepping.md "Stepping")

- [QuickTest & RandomTest](topics/quicktest-and-randomtest.md "QuickTest & RandomTest")