[![Build Status](https://semaphoreci.com/api/v1/choicescriptide/main/branches/latest/badge.svg)](https://semaphoreci.com/choicescriptide/main)
# ChoiceScript IDE
This repository contains the main source code for the ChoiceScript IDE.

## Building

### Prerequisites
You'll want at least the following installed in order to build CSIDE:

- NodeJS v8.11.2
- Latest NPM (6.1.0+)
- Global install of latest grunt-cli (npm install grunt-cli -g)

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
