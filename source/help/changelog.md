## v1.1.2 - 7/10/2017

Includes a permission issue fix (from v1.1.1), some changes to support updates on Linux, and the latest copy of ChoiceScript.

### Additions
- Basic support for updates on Linux(esque) machines

### Fixes
- Fixes deleting (moving files to Trash) on MAC

### Changes
- Updated internal copy of ChoiceScript to [Github commit](https://github.com/dfabulich/choicescript/commit/65fb2ded8f67a29dcf5815abfbcf6625d44be15c "ChoiceScript Github commit")

## v1.1.1 - 01/10/2017

ChoiceScript update, package (update) size reduction and an aesthetic bug fix.

### Fixes
- Fixed out of sync scenes/projects panel animation

### Changes
- Updated internal copy of ChoiceScript to [Github commit](https://github.com/dfabulich/choicescript/commit/9f27853f6e57c9e378d9bd4bd51fcccb491156b8 "ChoiceScript Github commit")
- Fixed issues with the build process that caused updates to be unnecessarily large
 - Updates will be smaller
 - Application should also open more quickly

## v1.1.0 - 08/07/17

ChoiceScript update, additional aesthetic options and a variety of additional tweaks and bug-fixes.

### Additions
- 'Night Mode' setting (allows selection of a dark UI theme)
- Tab order is now both sortable and persistent across sessions
- Additional (temporary) editor window themes
- Option to select font-family used by the editor window
- New level of update channel which allows quick access to future (untested) updates
- Support for select/dropdown settings
- Vastly increased unicode support / latin alphabet word recognition
- Added a slight scale animation when hovering over colour selectors
- Added support for 'warning' type notifications

### Fixes
- Incorrect variable referenced in FG's Basic's Tutorial
- Fixed \*sound command
- Find/Replace button text is now visible in dark themes
- Spell-checking will now work on words with a variety of trailing punctuation (!?:; etc.)
- \*disable_reuse should now be highlighted correctly when used inline
- Fixed a bug in setVar override that allowed for rerunning of \*set via showStats, in certain circumstances

### Changes
- Updated internal copy of ChoiceScript to [Github commit](https://github.com/dfabulich/choicescript/commit/8d368b135125d7a25f8880d8e50656eaa447e60e "ChoiceScript Github commit")
  - *gosub_scene *params
  - Ability to disable control flow (i.e. no forced *goto in choices)
- Heavily reduced help docs page load animation time
- Help docs body font size increased by 2px (to 14px)
- Modified some help docs margin values to further aid legibility
- Project header bars are now slightly darker than the top UI bar  
- CSIDE will now warn users about its inability to play .mp3 files (due to legal reasons)
- Replace some references to deprecated NWJS APIs
- The CS console will now 'inherit' styling/colour theme from the code editor
- Simplified injection of Popout button to ChoiceScript index.html

## v1.0.1 - 14/06/17

Pre-release update. Fixes a number of minor bugs, and makes some stylistic changes.
Introduces an in-app changelog, autoformat setting, support for ChoiceScript's new accessibility options and a cross-scene selected text wordcount.
An updated version of the Interactive CSIDE Tutorial is also included.

Due to an APPNAME change, you may also need to port your persistent data.

Read on for full details.

### Additions
- In-app accessible Changelog (under help & information tab)
- Notification on first post-update launch, prompting user to view the changelog
- Via ChoiceScript's in-game menu, changing text size and background colour are now supported
- New Autoformat option in Settings - automatically converts -- to emdash and ... to an ellpisis
- Support for selected word count across all scenes (Project -> Selected Word Count)
- Added a help topic on Image Scenes

### Removals
- \*print is no longer supported in the console
- \*setref is no longer supported in the console (use {var} notation)

### Fixes
- Fixed an obscure bug that prevented the same scene being opened, then closed, then opened again
- Fixed a bug that left the name of a previously running project on the game tab after it was closed
- Fixed a bug that caused the help tab to be selected on double-clicking a command for help
- Fixed a bug preventing the Project/Scene (context) menu buttons appearing in Windows
- Hiding/showing panels and clicking/typing afterwards should no longer cause 'magic cursor' jumps
- CSIDE 'Update Available' prompts will no longer stack if left unattended
- Fixed an issue preventing the selection of non-root level folders in the Web version

### Changes
- APPNAME changed to CSIDE (from ChoiceScript IDE)
 - This is likely to invalidate previous session data (settings/scene list etc.)
- Minor changes to the layout of the word count prompt
- The "Update Channel" setting will no longer appear on the Web version
- Added a slight tolerance to the file conflict check
- Updated Vendetta's CSIDE Tutorial to v1.01
- All newly created scene names will now be forced to lowercase
- Console commands \*untrack_all and \*track_all have been renamed \*track_all_on and \*track_all_off
- HEAVILY revised documentation + proofing
  - Removed references to "OS X"
  - Renamed Mac's ALT to OPT
  - Reworded most topics
  - Fixed a number of spelling mistakes
  - Reorganised home index (into basic + advanced topics)
  - Added 'next topic' links to some topics
  - Added additional hotlinks throughout various topics
  - Removed mentions to Dropbox
  - Added mentions about Dashingdon Hosting
- ChoiceScript's in-game menu is now functional (minus link/email options)
