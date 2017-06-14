## Issues

An 'Issue' is a logged error within your game, usually triggered by a scripting error. An issue is created when your game encounters a bug during a play-test in CSIDE. In addition to logging the error, Issues provide information on the location and type of bug.

Issues are logged in the Issues Tab on a per-project basis. They are not persistent between CSIDE sessions. All issues (i.e., bugs) must be fixed before final publication of your game. 


### How are Issues Organised?

Each issue is associated with a specific project. Many are also associated with a single scene.

If an error occurs in a scene file not currently listed under your project header, CSIDE will log the error and attempt to automatically load that scene. Note that issues are not persistent between CSIDE sessions; also, when closing a scene with outstanding issues, any related log entries will disappear from the Issues Tab.


### The Issue Tracker

The Issue Tracker is a term we use to describe some of CSIDE's native Issues-related behaviour. When scripting errors occur during a play-test, CSIDE will log those errors in the Issues Tab. The Issue is listed on the Issues log, and can be accessed by clicking the triangle and exclamation mark icon above.

The log entry includes the project name, the scene and line number when applicable, and the date and time when the error occurred. As part of the 'tracking' functionality, the Editor Window switches to the scene and line number containing the error and automatically highlights that line.

In some cases, a scripting error can occur above the indicated line number where the game has crashed. For example, if you are missing a simple \*goto command for one #option and receive an 'illegally fall out of a choice' statement, that error is only detected when the code hits a line containing something other than the expected \*goto.

In essence, if you cannot find an obvious error on the indicated line, check the section above that line (or below too, if the code is part of a loop section!) for errors such as a missing \*goto, incorrect indentation, etc.. The specific error messages will help you determine what kind of error you are looking for, and where it is likely to occur.

To return to an issue line later (but within the same session), use the 'Show this Issue' button (magnifying glass icon) on the appropriate Issue log. Tab to review any listed issues with known line numbers. Then select the issue, and the Code Editor will automatically display the section of code with the highlighted line.

### How Should I Handle Issues?

CSIDE provides several tools to help you locate and correct issues. The Issues Tab gives details about the error to help you locate and resolve the problem. The Code Editor focuses on the line where the crash occurs. If you are still having trouble locating the issue, you can try the advanced CSIDE debugging features: Stepping and the Console.

Once an issue is resolved, dismiss it under the Issues Tab by clicking the 'Dismiss' icon (the tick/check mark). This will also clear any error highlighting related to that issue. To clear all issues at once, click the 'Dismiss All' button on the top right of the Issues Tab.

**Next Topic**: [Console](topics/console.md "Console")

**Related Topics**:
- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")

- [Stepping](topics/stepping.md "Stepping")

- [Quicktest & Randomtest](topics/quicktest-and-randomtest.md "Quicktest & Randomtest")