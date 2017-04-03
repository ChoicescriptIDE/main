var CSIDE_loopCodeStore;
var CSIDE_stepping = false;
var CSIDE_steppingAllowSwapBack = false;

Scene.prototype.printLoopBackup = function printLoopStepThrough() {
    var line;
    var self = this;
	if (this.finished) {
		CSIDE_steppingAllowSwapBack = true;
		return;
	}

	 if (this.lineNum >= this.lines.length)	{
		if (!this.finished) {
			this.autofinish();
			return;
		}
	 }

	line = this.lines[this.lineNum];

        var scene = findScene(stats.sceneName);
        if (scene && CSIDE_stepping) {
            scene.focusLine(this.lineNum);
        }
        else if (CSIDE_stepping) {
            scope.cside.openScene(thisProject.getPath() + stats.sceneName + '.txt', function(err, scene) {
                if (err) {
                    //I think we may as fail silently
                }
                else {
                    scene.focusLine(self.lineNum);
                }
            });
        }
        if (!trim(line)) { //skip blank lines
            this.paragraph();
			this.lineNum++;
			this.printLoop();
            return;
        }

		if (/\s*\*comment\b/.test(line) || line === "") { //skip comments
			this.lineNum++;
			this.printLoop();
			return;
		}

		//cside.console.log(line);

        var indent = this.getIndent(line);

        if (indent > this.indent) {
            // ignore indentation level of *comments#
            if (/\s*\*comment\b/.test(line)) {
				this.lineNum++;
				return;
			}
            throw new Error(this.lineMsg() + "increasing indent not allowed, expected " + this.indent + " was " + indent);
        } else if (indent < this.indent) {
            this.dedent(indent);
        }
        if (this.temps.fakeChoiceLines && this.temps.fakeChoiceLines[this.lineNum]) {
          this.rollbackLineCoverage();
          this.lineNum = this.temps.fakeChoiceEnd;
          this.rollbackLineCoverage();
          delete this.temps.fakeChoiceEnd;
          delete this.temps.fakeChoiceLines;
		  this.lineNum++;
          return;
        }
        this.indent = indent;
        if (!this.runCommand(line)) {
            if (/^\s*#/.test(line)) {
                if (this.temps.fakeChoiceEnd) {
                    this.rollbackLineCoverage();
                    this.lineNum = this.temps.fakeChoiceEnd;
                    this.rollbackLineCoverage();
                    delete this.temps.fakeChoiceEnd;
                    delete this.temps.fakeChoiceLines;
					this.lineNum++;
                    return;
                } else {
                    throw new Error(this.lineMsg() + "It is illegal to fall out of a *choice statement; you must *goto or *finish before the end of the indented block.");
                }
            }
            this.prevLine = "text";
            this.screenEmpty = false;
            this.printLine(trim(line));
            printx(' ', this.target);
        }
			this.lineNum++;

		this.save(null, "temp");
		if (this.skipFooter) {
			this.skipFooter = false;
		} else {
			printFooter();
		}

};

Scene.prototype.printLoopBackup2 = function printLoop() {
    var line;
    var self = this;
	if (this.finished) {
		CSIDE_steppingAllowSwapBack = true;
		return;
	}
	if (this.lineNum >= this.lines.length) {
        self.rollbackLineCoverage();
        if (!self.finished) {
            CSIDE_steppingAllowSwapBack = true;
            self.autofinish();
        }
    }
    if (!this.finished && this.lineNum < this.lines.length) {
        line = this.lines[this.lineNum];
        var scene = findScene(stats.sceneName);
        if (scene) {
            scene.select();
            scene.focusLine(this.lineNum);
        }
        if (!trim(line)) {
            this.paragraph();
            this.lineNum++;
            endOfStep();
            return;
        }
        var indent = this.getIndent(line);
        if (indent > this.indent) {
            // ignore indentation level of *comments
            if (/\s*\*comment\b/.test(line)) {
              this.lineNum++;
              endOfStep();
              return;
            }
            throw new Error(this.lineMsg() + "increasing indent not allowed, expected " + this.indent + " was " + indent);
        } else if (indent < this.indent) {
            this.dedent(indent);
        }
        if (this.temps.fakeChoiceLines && this.temps.fakeChoiceLines[this.lineNum]) {
          this.rollbackLineCoverage();
          this.lineNum = this.temps.fakeChoiceEnd;
          this.rollbackLineCoverage();
          delete this.temps.fakeChoiceEnd;
          delete this.temps.fakeChoiceLines;
		      this.lineNum++;
          endOfStep();
          return;
        }
        this.indent = indent;
        if (!this.runCommand(line)) {
            if (/^\s*#/.test(line)) {
                if (this.temps.fakeChoiceEnd) {
                    this.rollbackLineCoverage();
                    this.lineNum = this.temps.fakeChoiceEnd;
                    this.rollbackLineCoverage();
                    delete this.temps.fakeChoiceEnd;
                    delete this.temps.fakeChoiceLines;
			              this.lineNum++;
                    endOfStep();
                    return;
                } else {
                    throw new Error(this.lineMsg() + "It is illegal to fall out of a *choice statement; you must *goto or *finish before the end of the indented block.");
                }
            }
            this.prevLine = "text";
            this.screenEmpty = false;
            this.printLine(trim(line));
            printx(' ', this.target);
        }
        this.lineNum++
        endOfStep();
    }

    function endOfStep() {
        //self.save("");
        if (self.skipFooter) {
            self.skipFooter = false;
        } else {
            printFooter();
        }
    }
};

function swapLoop(button) {
	if (CSIDE_stepping && !CSIDE_steppingAllowSwapBack) {
		while (!CSIDE_steppingAllowSwapBack) {
			stats.scene.printLoop();
		}
	}
	else {
		CSIDE_steppingAllowSwapBack = false;
	}
 	CSIDE_loopCodeStore = Scene.prototype.printLoop;
	Scene.prototype.printLoop = Scene.prototype.printLoopBackup;
	Scene.prototype.printLoopBackup = CSIDE_loopCodeStore;
	CSIDE_stepping ? stepBtn.style.display = "none" : stepBtn.style.display = "inline";
	CSIDE_stepping ? CSIDE_stepping = false : CSIDE_stepping = true;
	CSIDE_stepping ? button.innerHTML = "Stop Stepping" : button.innerHTML = "Start Stepping";
}

function moveButtonsInline() {
	var header = document.getElementById("header");
	var tags = document.getElementsByTagName("p");
	return tags[1];
}

(function() {
	var p = moveButtonsInline();
	var button = document.createElement("button");
	button.innerHTML = "Start Stepping";
	button.setAttribute('onclick', "swapLoop(this);");
	button.setAttribute('class', "spacedLink");
	p.appendChild(button);

	button = document.createElement("button");
	button.innerHTML = "Step";
	button.style.display = "none";
	button.setAttribute('onclick', "stats.scene.printLoop();");
	button.setAttribute('id', "stepBtn");
	button.setAttribute('class', "spacedLink");
	p.appendChild(button);
})();
