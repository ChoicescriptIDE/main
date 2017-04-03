## Quicktest & Randomtest

To facilitate their ease of use, CSIDE incorporates the two automated testing routines - Quicktest and Randomtest - provided by Choice of Games LLC.

If you're familiar with the ChoiceScript scripting language, it's likely you'll already have heard of these, and you may even have used them in the past (in the form of awkward .bat or simpler but still separate .html files). CSIDE's two automated tests are the very same official ones which each and every Choice Game must pass in order to be considered for publication by CoG.

Future publication aside, however, it's actually a very good idea to make frequent and regular use of both automated tests - but especially Quicktest - to help develop your game more efficiently, by detecting any basic scripting bugs in advance of actually running your game rather than play-testing until they (inevitably) crash it. Getting into the habit of using Quicktest frequently, and Randomtest at least fairly regularly, can in fact save an awful lot of wasted replay time: it is for this reason that we have directly incorporated both automated tests within CSIDE and made them as painless as possible to employ on a routine basis.

Future updated versions of either test released by Choice of Games LLC will also be included in a CSIDE update shortly thereafter.


### CSIDE Automated Testing

You can run either Quicktest or Randomtest within CSIDE by right-clicking the Project header bar and selecting the required test under the 'Test Project' context menu option, or by selecting that option via the context menu available under the Folder icon at the extreme top-left of the user interface.

Alternatively, you can also use keyboard short-cuts to test the currently-selected project: CTRL-T will run Quicktest, and CTRL-Shift-T will launch Randomtest (Mac: CMD-T and CMD-Shift-T respectively). Note that both tests will be applied only to the latest-saved version of your scene files, so always save your latest work before running a test: CTRL-S - or CMD-S for a Mac - will apply a handy "quick save" to the file currently being worked on in the Code Editor, if this has focus (e.g. a blinking text cursor).

Both tests open in a new window. Quicktest will run immediately without further ado, while Randomtest will offer its standard configuration options before proceeding with its more detailed test. Both tests will however properly take account of all valid scenes files located in the Project folder, whether or not a particular scene file is actually currently open within CSIDE.

For more information on the mechanics of the tests themselves, please see COG's official documentation on [Testing ChoiceScript Games Automatically](https://www.choiceofgames.com/make-your-own-games/testing-choicescript-games-automatically/ "Choice of Games - Automatic Testing") or the community [Wiki page](http://choicescriptdev.wikia.com/wiki/Automatically_testing_your_game "Choicescript Wiki - Automatic Testing") on the topic.


**Related Topics**:
- [Issues](topics/issues.md "Issues")

- [Console](topics/console.md "Console")

- [Stepping](topics/stepping.md "Stepping")

- [Testing & Debugging](topics/testing-and-debugging.md "Testing & Debugging")