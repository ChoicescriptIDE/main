## Testing & Debugging

Regular testing and debugging are key to making sure your game works properly, so your readers can enjoy your work! If you're already familiar with the general concepts of testing and debugging, feel free to skip to the CSIDE-specific topic links at the bottom of this page. If it's all still a bit new to you but you're eager to learn more, read on!

We all have those days when we've written all that clever code, and woven it around that wonderful story, only to find that it doesn't quite work as expected. Things just don't add up. In short, it's broken.

You made a few mistakes, we all do, and that's OK. Really. It is. So how do you go about finding and fixing those mistakes? If it's a coding mistake (a scripting bug or logic error), then CSIDE has your back! If it's a literary mistake, that's a little out of our domain, but fret not, there's still plenty of help out there. You can always try the [Choice of Games Forum](https://forum.choiceofgames.com/ "Choice of Games Forum") for starters.


### Testing (Finding Bugs)

So, you have a 'working' game. Congratulations! It might be finished, or it might just be at an early stage of playable, or anywhere in-between. Time to give it a shake and see if any bugs fall out! This stage is called testing, or finding.

There are three basic types of testing for ChoiceScript games: 

1. Human testing (i.e. people playing the game and watching for errors) 

2. Quicktest

3. Randomtest

Play-testing ('human testing' just sounded awful) goes something like this: You've just released a game, or perhaps passed on an early version to a friend or a tester to play. Your tester comes back to you saying, "Hey, that was pretty cool... right up until it crashed [or insert another thing it shouldn't have done right here]!". Well, grrreat... That's probably not what you wanted to hear!

You can also play-test the game yourself within CSIDE, of course. Actually, doing so before you let anyone else play it is probably a good idea! Not only does CSIDE make this easier / more efficient than normal in a number of ways, it also has a built-in error tracking system called 'Issues'. If you manage to crash your game while play-testing it, CSIDE logs the error as an 'Issue' and more often than not will neatly point you to the exact line in your scripting where the error occurs.

Quicktest and Randomtest are two automated testing and debugging tools provided by Choice of Games for debugging your code. You can run them both within CSIDE simply by right-clicking on your Project header bar and selecting Test Project. If there is a detectable scripting bug in your game, the test will identify the type of bug, which file it was found in, and the line number where the problem occurs.


### Debugging (Fixing Bugs)

So, there's a bug in your game. What happens next? Do you give up? Throw in the towel? No, you fix it! It's time to squash those pesky little bugs or fix those irksome little errors - a process called debugging.

You may not know exactly what causes a bug, even once you know it exists. That's where debugging tools come in - they help you locate and isolate the source of the problem. You can debug by: looking through your code; addressing any Issues logged by CSIDE; activating the CSIDE Console while running a test game; recruiting testers to help isolate the exact circumstances under which a particular bug occurs; or by using the automated tests to at least help point you in the right direction.

With that said, it's very important to understand that testing and debugging are not necessarily separate, nor mutually exclusive. In actual fact, most tools and methods of debugging help you find bugs AND fix them.

Of course, debugging may lead you into finding (or even introducing!) more bugs than you had in the first place. Play-testers can help by reporting crashes as they play through your game, or by specifically replaying a certain portion in an attempt to isolate a known bug, while the CSIDE 'Issues' system and Quicktest / Randomtest will all give you a scene name, line number and an error type to help you find the source of the problem.

Some of the debugging tools, such as the CSIDE Console, can also be extremely helpful if the error is logical in nature: i.e. a bug that makes your game behave strangely in particular situations but doesn't actually cause the game to crash - which can sometimes make it extremely difficult to track down just by looking through your code!

It's very important to test your game as you go - after each section, or even each day's work. Making sure your game is bug-free on a regular basis (or as close as is humanly possible!) can make testing and debugging simpler and quicker in the long run - AND it gives you a nice warm fuzzy feeling when you manage to play all the way through without running into any problems!


### Further Reading: Tools of the Trade

Now that you have a general idea of what testing and debugging is all about, here are some links to more in-depth topics. They cover each of the relevant tools and features provided by ChoiceScript and CSIDE.

- [Issues](topics/issues.md "Issues")

- [Console](topics/console.md "Console")

- [Stepping](topics/stepping.md "Stepping")

- [QuickTest & RandomTest](topics/quicktest-and-randomtest.md "QuickTest & RandomTest")

**Next Topic**: [Publishing & Exporting](topics/publishing-and-exporting.md "Publishing & Exporting")