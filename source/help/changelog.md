## v1.3.3 - 21/06/2019

Patch release. Upgrades ChoiceScript. Notable additions include support for the new 'create_array' and 'temp_array' commands.

### Changes
- Updated to the latest version of ChoiceScript

## v1.3.2 - 21/06/2019

Patch release. Upgrades ChoiceScript to fix some issues.

### Fixes
- Miscellaneous ChoiceScript issues

### Changes
- Updated to the latest version of ChoiceScript

## v1.3.1 - 21/06/2019

Hotfix release. Reverts atomic file writing changes from v1.3.0 due to corruption of metadata.

### Fixes
- Corrupted metadata on file writes

### Changes
- File writes are no longer atomic

## v1.3.0 - 03/06/2019

Feature release focussing on user dictionary improvements and bug fixes.

### Fixes
- Custom themes should now persist across sessions on all platforms
- Fixed an issue related to spellchecking words wrapped in quotation marks
- v1.2.1 HotFix (correctly initialize default tabs)
- Fixed a minor issue with Dropbox error handling
- CSIDE will no longer ignore the \*text_image command behaviour
- Fixed an issue with 'stepping' being unable to handle \*fake_choice
- Fixed disappearing window control/UI jumping bug
- The 'Run Project' hotkey is now documented as intended

### Additions
- User Dictionary Improvements
    - Optimised add/remove word functionality
    - Added support for importing/exporting JSON-esque dictionaries
    - Added a 'Remove All' (words) button
    - Added real-time search filter behaviour to the input box to help with navigating large dictionaries
- Added additional options to the indentation setting, and converted its settings control to a dropdown menu
- Added the line and column position of the cursor to the code editor footer
- Added an option to 'clear game data' to a running project's ChoiceScript menu
    - This will allow for clearing of earned achievements etc.
- Added support to cycle through the current project's scenes via hotkeys
    - Mac: Cmd+Alt+PgUp/PgDwn
    - Windows: Ctrl+PgUp/PgDwn
- Added hotkeys for changing font size (ctrl/cmd[+-]) [NEEDS DOCUMENTING]
- Extended custom theme scripting support:
    - Misc bug fixes and error clarifications.
    - Adds new tokens: gutter, gutter-numbers, error-lines, cursor, matches
    - See example project for usage!
- Atomic file writes (this should help combat reported file corruption)g

### Changes
- Updated internal copy of ChoiceScript to [Github commit](https://github.com/dfabulich/choicescript/commit/4301c06c909c50c0ab63d22601e3d2eeb6e5f1b9 "ChoiceScript Github commit")
- Moved the right panel tab control to be vertical
- Updated the notification library:
    - Should improve accessibility
    - Modified appearance of notifications
- Turning the 'Word Count' setting off will now disable word counting
rather than just hiding it (for performance reasons).
- Minor UI (colour) improvement for night mode's scene/project drag and drop
- Added a link to CSIDE's thread in the 'What is CSIDE?' documentation page

## v1.2.1 - 27/12/2017

Fixes a critical bug caused by turning persistent session 'off' when persistent tabs are supported.

### Fixes
- default tab order is now initialized correctly when the persistent session setting is disabled

## v1.2.0 - 18/12/2017

Feature release including custom themes, code folding and selection matching, a handful of bug fixes and some minor behaviour tweaks.

### Additions
- Code folding/collapsing
- Example projects are now runnable
- Selection matching (highlights other instances of selected text)
- Custom theme scripting (and matching example project)
- Spellcheck now supports including/excluding of command lines
- Visible indentation support for spaces
- New shortcut combos for
  - Delete line
  - Duplicate line
  - Toggle block comment

### Fixes
- 'Insert double line break' menu option now respects indentation
- Fixed a file path issue on attempts to open a project folder
- Made some changes to mitigate a possible ui/locking bug with project controls
- Misspelled words next to speech marks are now detected correctly

### Changes
- Updated internal copy of ChoiceScript to [Github commit](https://github.com/dfabulich/choicescript/commit/7c0a4a68ad6b6c780eb41249c6627b8dd7b42524 "ChoiceScript Github commit")
- 'Untitled_X' scenes are now generated with fully lowercase names
- Numerous changes to spellcheck and indentation syntax implementation
- Editor history delay has been drastically reduced which should result in smaller/more precise undo steps
- Updates:
  - Development channel warning removed
  - Name of update channel now appears in the update title
  - Development updates are now coloured in yellow
  - Update channel setting now has a description

### Removals
- The mixed scene indentation test performed on newly opened files has been disabled
- The additional temporary editor themes have been removed (in light of custom theme support)
  - Only the Light, Dark and Dichromatic themes will be supported going forward
  - Users who's config points to removed themes will be set back to the Light theme

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
