var CSIDE_loopCodeStore;
var CSIDE_stepping = false;
var CSIDE_steppingAllowSwapBack = false;

Scene.prototype.printLoopBackup = function printLoopStep() {
  var line, self = this;

  if (this.finished) {
    CSIDE_steppingAllowSwapBack = true;
    return;
  }

  // emulate the interpreter 'loop'
  if (this.lineNum >= this.lines.length) {
    if (!this.finished) {
      this.autofinish();
      return;
    }
  }

  line = this.lines[this.lineNum];

  // track the current line in the CSIDE editor whenever possible
  var scene = findScene(stats.sceneName);
  if (scene && CSIDE_stepping) {
    scene.focusLine(this.lineNum);
  }
  else if (CSIDE_stepping) {
    scope.cside.openScene(thisProject.getPath() + stats.sceneName + '.txt', function(err, scene) {
      if (err) {
        // Can't open the scene. I think we may as fail silently.
      }
      else {
        scene.focusLine(self.lineNum);
      }
    });
  }

  // skip black lines
  if (!trim(line)) {
    this.paragraph();
    this.lineNum++;
    return this.printLoop();
  }

  // skip comments
  if (/\s*\*comment\b/.test(line) || line === "") {
    this.lineNum++;
    return this.printLoop();
  }

  var indent = this.getIndent(line);
  if (indent > this.indent) {
    throw new Error(this.lineMsg() + "increasing indent not allowed, expected " + this.indent + " was " + indent);
  } else if (indent < this.indent) {
    this.dedent(indent);
  }

  if (this.temps._choiceEnds[this.lineNum] &&
          (this.stats["implicit_control_flow"] || this.temps._fakeChoiceDepth > 0)) {
      // Skip to the end of the choice if we hit the end of an #option
      this.rollbackLineCoverage();
      this.lineNum = this.temps._choiceEnds[this.lineNum];
      this.rollbackLineCoverage();
      if (this.temps._fakeChoiceDepth > 0) {
          this.temps._fakeChoiceDepth--;
      }
      this.lineNum++;
      return this.printLoop();
  }

  this.indent = indent;
  if (/^\s*#/.test(line)) {
      throw new Error(this.lineMsg() + "It is illegal to fall out of a *choice statement; you must *goto or *finish before the end of the indented block.");
  }
  if (!this.runCommand(line)) {
      this.prevLine = "text";
      this.screenEmpty = false;
      this.printLine(line);
  }
  // end of loop emulation

  this.lineNum++;

  this.save(null, "temp");
  if (this.skipFooter) {
    this.skipFooter = false;
  } else {
    printFooter();
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
