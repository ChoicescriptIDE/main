# ChoiceScript IDE
This repository contains the main source code for the ChoiceScript IDE.

## Status
Overview of the health of the components that make up the ChoiceScript IDE.
| Component | upstream-merge | build / test |
|-----------|----------------|--------|
| CSIDE/main                          | N/A              | ![build](https://github.com/ChoicescriptIDE/main/workflows/build/badge.svg) |
| [ChoiceScript](https://github.com/ChoicescriptIDE/choicescript)                                               | [![merge-upstream](https://github.com/ChoicescriptIDE/choicescript/actions/workflows/merge-upstream.yml/badge.svg)](https://github.com/ChoicescriptIDE/choicescript/actions/workflows/merge-upstream.yml)   | [![test](https://github.com/ChoicescriptIDE/choicescript/actions/workflows/test.yml/badge.svg)](https://github.com/ChoicescriptIDE/choicescript/actions/workflows/test.yml) |
| [monaco-editor](https://github.com/ChoicescriptIDE/monaco-editor)                                             | [![merge-upstream](https://github.com/ChoicescriptIDE/monaco-editor/actions/workflows/merge-upstream.yml/badge.svg)](https://github.com/ChoicescriptIDE/monaco-editor/actions/workflows/merge-upstream.yml) | [![CI](https://github.com/ChoicescriptIDE/monaco-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/ChoicescriptIDE/monaco-editor/actions/workflows/ci.yml)     |
| [vscode-choicescript-languageservice](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice) |                                                                                           N/A                                                                                                               | [![test](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice/actions/workflows/test.yml/badge.svg)](https://github.com/ChoicescriptIDE/vscode-choicescript-languageservice/actions/workflows/test.yml) |
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


