## Testing and Debugging

Regular testing and debugging are vital to ensure your game works properly, so your readers can enjoy your interactive fiction! If you're already familiar with the general concepts of testing and debugging, feel free to skip to the CSIDE-specific topic links at the bottom of this page. If this is new for you but you're eager to learn more, read on!

We all have those days when we've written countless lines of clever code and woven it around our wonderful story, only to find that our game doesn't quite work as expected. Things just don't add up. In short, our game is broken. We all make those mistakes, but how do we go about fixing them?

If it's a coding mistake (a scripting bug or logic error), then CSIDE has your back! If it's a literary mistake, that's a little out of our domain. But don't worry, there's still plenty of help out there; you can always try the [Choice of Games Forum](https://forum.choiceofgames.com/ "Choice of Games Forum") for starters.


### Testing (Finding Bugs)

So you have a working game. Congratulations! It might be finished, in its very early stages, or anywhere between. Time to give it a shake and see if any bugs fall out!

This stage of writing a ChoiceScript game is called testing. There are three basic types of testing for ChoiceScript games:

1. Quicktest

2. Randomtest

3. Play Testing

Quicktest and Randomtest are both automated testing and debugging tools provided by Choice of Games for debugging your code. It's a wise idea to run them regularly so you can promptly detect and fix any game-breaking errors. You can run Quicktest and Randomtest within CSIDE by right-clicking on the project header bar and selecting Test Project. If there is a detectable bug, the test identifies the type of bug, and the scene file and line number where the problem occurs.

During a play test, readers play through your work and give feedback on continuity errors, typos, any bugs that might still be left after Quicktest and Randomtest, and any other problems or issues they encounter. You can also play-test the game yourself within CSIDE; actually, doing this before you let anyone else see it is probably a good idea!

CSIDE makes the play-test process easy and extra efficient, in part through Issues, its built-in tracking error. If the game crashes while playtesting, CSIDE logs the error as an 'Issue' and will attempt to give you the type and line number of the error.


### Debugging (Fixing Bugs)

So there's a bug in your game. What happens next? Do you give up? No, of course not; it's time to fix it! Squashing those pesky little bugs is a process called 'debugging'.

Once you know there's a bug, the next step is figuring out the cause. Debugging tools help you locate and isolate the source of any bugs.

Methods of debugging include:

- Looking through your code
- Addressing any Issues logged by CSIDE
- Using the automated tests
- Using the CSIDE Console while running a test game
- Recruiting testers to help isolate exactly when and why a bug occurs

It's important to note that testing and debugging are not necessarily separate or exclusive parts of designing your ChoiceScript game. In fact, most methods for debugging help you both find and fix bugs.

Of course, debugging sometimes reveals (or even introduces) more bugs. CSIDE Issues, Quicktest, and Randomtest can help you periodically fix bugs; you can address error reports one at a time until you have a working game. Play-testers, on the other hand, can point out continuity or scripting errors that are not game-breaking, or they can play through specific sections to isolate a known bug.

Some of the debugging tools, such as the CSIDE Console, are exceptionally helpful if the error is logical in nature; logic errors can be hard to find when hunting directly through the code. A logic error might include a bug that makes your game behave strangely in particular situations but doesn't necessarily cause it to crash, or a bug where the initial error is located in a different part of the scripting to the actual crash.

It's extremely important to test your game as you go, after each section or even after each day's work. Making sure your game is bug-free on a regular basis (or as close to bug-free as humanly possible!) makes testing and debugging simpler and quicker in the long run. (Plus, there's that nice warm fuzzy feeling when you can play all the way through your game without encountering any game-breaking problems.)


### Further Reading: Tools of the Trade

Now that you have a general idea of what testing and debugging is all about, here are some links to more in-depth topics. They cover each of the relevant features and tools provided by ChoiceScript and CSIDE.

- [Issues](topics/issues.md "Issues")

- [Console](topics/console.md "Console")

- [Stepping](topics/stepping.md "Stepping")

- [Quicktest and Randomtest](topics/quicktest-and-randomtest.md "Quicktest and Randomtest")

**Next Topic**: [Publishing and Exporting](topics/publishing-and-exporting.md "Publishing and Exporting")