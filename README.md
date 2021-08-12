# ChoiceScript IDE
This repository contains the main source code for the ChoiceScript IDE.

## Status
Overview of the health of the many components that make up the ChoiceScript IDE.
| Component | upstream-merge | build + test |
|-----------|----------------|--------|
| [ChoiceScript](https://github.com/ChoicescriptIDE/choicescript) | ![merge-upstream](https://github.com/ChoicescriptIDE/choicescript/workflows/merge-upstream/badge.svg)                       | ![test](https://github.com/ChoicescriptIDE/choicescript/workflows/test/badge.svg) |
| [monaco-choicescript](https://github.com/ChoicescriptIDE/monaco-choicescript) | ![merge-upstream](https://github.com/ChoicescriptIDE/monaco-choicescript/workflows/merge-upstream/badge.svg)        | ![build](https://github.com/ChoicescriptIDE/monaco-choicescript/workflows/build/badge.svg) |
| [vscode-choicescript-languageservice](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice) | ![merge-upstream](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice/workflows/merge-upstream/badge.svg) | ![test](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice/workflows/test/badge.svg) |
| [monaco-json](https://github.com/ChoicescriptIDE/monaco-json) | ![merge-upstream](https://github.com/ChoicescriptIDE/monaco-json/workflows/merge-upstream/badge.svg)                | ![build](https://github.com/ChoicescriptIDE/monaco-json/workflows/build/badge.svg) |
| [vscode-json-languageservice](https://github.com/ChoicescriptIDE/vscode-json-languageservice) | ![merge-upstream](https://github.com/ChoicescriptIDE/vscode-json-languageservice/workflows/merge-upstream/badge.svg)| ![test](https://github.com/ChoicescriptIDE/vscode-json-languageservice/workflows/test/badge.svg) |
| [monaco-languages](https://github.com/ChoicescriptIDE/monaco-languages) | ![merge-upstream](https://github.com/ChoicescriptIDE/monaco-languages/workflows/merge-upstream/badge.svg)  | ![test](https://github.com/ChoicescriptIDE/monaco-languages/workflows/test/badge.svg) |
| [monaco-editor](https://github.com/ChoicescriptIDE/monaco-editor) | ![merge-upstream](https://github.com/ChoicescriptIDE/monaco-editor/workflows/merge-upstream/badge.svg)              | ![build](https://github.com/ChoicescriptIDE/monaco-editor/workflows/build/badge.svg) ![Upstream Editor CI](https://github.com/ChoicescriptIDE/monaco-editor/workflows/Upstream%20Editor%20CI/badge.svg) |
| CSIDE/main                          | N/A              | ![build](https://github.com/ChoicescriptIDE/main/workflows/build/badge.svg) |

## Building

### Prerequisites
You'll want the following installed in order to build CSIDE:

- NodeJS v10.X and associated version of npm
- Global install of latest grunt-cli (npm install grunt-cli -g)
- mkdocs && mkdocs-localsearch

This is what the CLI runs with. Other versions/combinations *may* work but please try this combination before reporting a build bug.

### Process
  1. Clone this repo
  2. cd main
  3. npm install
  4. grunt

Optionally you can do "grunt" + build-with-mac, or, build-with-windows, or, build-with-nwjs (both).
Otherwise the /build folder will contain the build and the /release folder will contain an nwjs .nw file.

## License
CSIDE specific code is Copyright 2017 by Carey Williams.
Used libraries/repos/modules/frameworks are treated with respect to their license(s).

A credit list is maintained at: /source/help/acknowledgements.md
Please let me know if you spot any missed acknowledgements.


