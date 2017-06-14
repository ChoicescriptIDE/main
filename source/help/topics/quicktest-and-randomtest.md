## Quicktest & Randomtest

CSIDE includes both Quicktest and Randomtest, the two automated testing routines provided by Choice of Games LLC. Both tests are seamlessly incorporated for quick and easy bug testing. If you are familiar with ChoiceScript, you've likely already heard of these tests, or even used them in .bat or .html form.

In CSIDE, both Quicktest and Randomtest are fully integrated and can be run through either the project menu or a hotkey combination. Ideally, both these tests should be run regularly. The autotests can save a lot of time in play-testing by detecting bugs in advance, allowing you to fix them before they cause the game to crash during a play-through. Quicktest is especially useful for finding basic scripting errors.

Games must pass both Quicktest and Randomtest before they are eligible to be considered for publication through Choice of Games/Hosted Games LLC. Any future updates of the autotests released by Choice of Games LLC will be included in a CSIDE update shortly after their release.


### Running Automated Tests in CSIDE

You can run Quicktest and Randomtest within CSIDE by right-clicking the project header bar and selecting one of the tests under the 'Test Project' menu, or by selecting 'Project-Test Project-Quicktest/Randomtest' from CSIDE's menu. You can also use hotkeys: CTRL-T/CMD-T runs Quicktest and CTRL-SHIFT-T/CMD-SHIFT-T launches Randomtest. The automated tests will launch in a new window. The autotests will access all valid scene files located in your project folder, whether or not that scene file is currently open in CSIDE.

Quicktest runs immediately; Randomtest offers the standard list of configuration options before proceeding. Note that both tests are only applied to the most recently saved version of your scene files. When the Code Editor is in focus (i.e. with a blinking text cursor), you can use CTRL-S/CMD-S to quickly save your file before running the automated tests.

> **Note**: The automated tests are not available in the Web version of CSIDE.

For more information on the mechanics of Quicktest and Randomtest, please see CoG's official documentation on [Testing ChoiceScript Games Automatically](https://www.choiceofgames.com/make-your-own-games/testing-choicescript-games-automatically/ "Testing ChoiceScript Games Automatically") or the community Wiki [page](http://choicescriptdev.wikia.com/wiki/Automatically_testing_your_game "Wikia Guide to Automated Testing") on the topic.

**Next Topic**: [Publishing and Exporting](topics/publishing-and-exporting.md "Publishing and Exporting")

**Related Topics**:
- [Issues](topics/issues.md "Issues")

- [Console](topics/console.md "Console")

- [Stepping](topics/stepping.md "Stepping")

- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")