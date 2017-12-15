//var ko = require('knockout');

//var BootstrapMenu = require('bootstrap-menu');


//are we using node?
if (typeof nw === "object") {
  window.usingNode = true;
  //load our modules:
  var fs = require('fs');
  var mkdirp = require('mkdirp');
  var trash = require('trash');
  var getDirName = require('path').dirname;
  var gui = require('nw.gui');
  //var http = require('http');
  //var stream = require('stream');
  var updater = require('cside-updater');
  var win = gui.Window.get();
  win.show();
  process.on("uncaughtException", function(err) {
    bootbox.alert(err.message);
    console.log(err);
    //globally catch uncaught errors (i.e. don't crash to node-webkit stacktrace screen)
    //VERY basic error logging:
    if (cside.getPlatform() === "mac_os") {
      var usefulDirIndex = process.execPath.lastIndexOf('Choicescript IDE.app');
      var installFolderPath = process.execPath.substring(0, usefulDirIndex);
    } else {
      var installFolderPath = process.execPath.slice(0, process.execPath.lastIndexOf("\\")) + "\\";
    }
    fs.writeFile(installFolderPath + 'error-log.txt', err.message() + "\n", function(err) {
      if (err) throw err;
    });
  });
} else {
  window.usingNode = false;
  window.onbeforeunload = function(evt) {
    if (!cside.session.isDirty() || cside.getProjects().length === 0)
      return null;
    else {
      var msg = "Warning: You have unsaved changes."
      evt = evt || window.event;
      if (evt) evt.returnValue = msg;
      return msg;
    }
  }
}

// Overall viewmodel for this screen, along with initial state
function IDEViewModel() {

  //EXTENDERS
  ko.extenders.normalizePaths = function(target, option) {
    target.subscribe(function(path) {
      target(__normalizePath(path));
    });
    return target;
  };
  ko.extenders.lowerCase = function(target, option) {
    target.subscribe(function(val) {
      target(val.toLowerCase());
	});
    return target;
  };
  ko.extenders.callFunc = function(target, option) {
    target.subscribe(function() {
      option.func();
    });
    return target;
  };

  function __normalizePath(path) {
    //replace backslashes
    path = path.replace(/\\/g, '/');
    return path;
  }

  // ╔═╗┌─┐┌┐┌┌─┐┌┬┐┬─┐┬ ┬┌─┐┌┬┐┌─┐┬─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  // ║  │ ││││└─┐ │ ├┬┘│ ││   │ │ │├┬┘  ╠╣ │ │││││   │ ││ ││││└─┐
  // ╚═╝└─┘┘└┘└─┘ ┴ ┴└─└─┘└─┘ ┴ └─┘┴└─  ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘

  function CSIDEProject(projectData) {
    var self = this;

    //INSTANCE VARIABLES
    var name = ko.observable(projectData.name ? projectData.name : (getLastDirName(projectData.path) ? getLastDirName(projectData.path) : "Untitled")); //take the folder name if no name is stored
    var path = ko.observable().extend({
      normalizePaths: ""
    }); //convert relative paths to direct paths and normalize slashes
    path(projectData.path);
    var scenes = ko.observableArray([]);
    var issues = ko.observableArray([]);
    var console_logs = ko.observableArray([])
      .extend({
        rateLimit: {
          timeout: 100
        }, //method: "notifyWhenChangesStop"  //limit rate for perf reasons
        callFunc: {
          func: function() {
            setTimeout(function() {
              var ul = $("#cs-console > ul")[0];
              if (ul) ul.scrollTop = ul.scrollHeight;
            }, 100);
          }
        }
      });
    var unreadLogs = ko.observable(0);
    var consoleOpen = ko.observable(false);
    var source = projectData.source;
    var expanded = ko.observable(projectData.expanded === false ? false : true);
    var locked = ko.observable(false); //locks the project ui/prevents spam operations
    var readOnly = ko.observable(projectData.readOnly || false);
    var editing = ko.observable(false);
    var invalidName = ko.observable(false);

    //GETTER METHODS
    self.getName = ko.computed(function() {
      return name();
    }, this);
    self.getPath = ko.computed(function() {
      return path();
    }, this);
    self.getScenes = scenes;
    self.getIssues = ko.computed(function() {
      return issues();
    }, this);
    self.consoleOpen = ko.computed(function() {
      return consoleOpen();
    }, this);
    self.getLogs = ko.computed(function() {
      return console_logs();
    }, this);
    self.getUnreadLogCount = ko.computed(function() {
      return unreadLogs();
    }, this);
    self.issueCount = ko.computed(function() {
      return issues().length;
    }, this);
    self.getSource = function() {
      return source;
    };
    self.isExpanded = ko.computed(function() {
      return expanded();
    }, this);
    self.isLocked = ko.computed(function() {
      return locked();
    }, this);
    self.isReadOnly = ko.computed(function() {
      return readOnly();
    }, this);
    self.beingEdited = ko.computed(function() {
      return editing();
    }, this);
    self.nameInvalid = ko.computed(function() {
      return invalidName();
    }, this);
    self.isDirty = ko.computed(function() {
      for (var i = 0; i < scenes().length; i++) {
        if (scenes()[i].isDirty()) {
          return true;
        } else if (i === scenes().length - 1) {
          return false;
        }
      }
    });
    self.getWordCount = function(exclCommandLines, selected) {
      exclCommandLines = exclCommandLines || false;
      var wordCount = 0;
      for (var i = 0; i < scenes().length; i++) {
        wordCount = (wordCount + scenes()[i].getWordCount(exclCommandLines, selected));
      }
      return wordCount;
    }
    self.getCharCount = function(selected) {
      var charCount = 0;
      for (var i = 0; i < scenes().length; i++) {
        charCount += scenes()[i].getCharCount(selected);
      }
      return charCount;
    }
    self.logToConsole = function(log, type, meta) {
      if (typeof log !== "boolean" && typeof log !== "number" && typeof log !== "string") {
        return;
      }
      if (typeof type != "string")
        type = "";
      if (console_logs().length > 999) {
        console_logs.shift(); //limit entries
      }
      if (meta) {
        if (typeof meta.scene === "string" && typeof meta.line === "number") {
          console_logs.push({
            value: log,
            type: type || "null",
            scene: meta.scene || "",
            line: meta.line || ""
          });
        } else {
          console.log(typeof meta.scene, typeof meta.line);
          console_logs.push({
            value: "Error: attempt to log bad meta data logged to project console!",
            type: "cm-error"
          });
        }
      } else {
        console_logs.push({
          value: log,
          type: type || "null"
        });
      }
      if (!consoleOpen() && type != "system")
        unreadLogs(unreadLogs() < 8 ? unreadLogs() + 1 : "9+"); //unsafe type mix...?
    }
    self.toggleConsole = function(force) {
      if (typeof force === "boolean") {
        consoleOpen(force);
      } else {
        consoleOpen(!consoleOpen());
      }
      if (consoleOpen()) {
        unreadLogs(0);
      }
      return consoleOpen();
    }
    self.clearConsole = function() {
        console_logs.removeAll();
      }
      /* self.markConsoleRead = function() {
          unreadLogs(0);
      } */
    self.dismissAllIssues = function() {
        //so for some reason we need to buffer this into another array
        //if we store the length or use issues() directly, either not all the issues
        //are removed or we (apparently) reference a non-existent issue?
        var t = 0,
          issueBuffer = [];
        var issueList = issues();
        for (var o = 0; o < issueList.length; o++) {
          issueBuffer.push(issueList[o]);
        }
        for (var i = 0; i < issueBuffer.length; i++) {
          issueBuffer[i].dismiss();
        }
        __selectTab("game");
      }
      //SETTER METHODS
    self.setExpand = function(boole, event) {
      /*if (typeof event === "object") { NOW REDUNDANT AS WE'VE MOVED TO PROJECT DRAG HANDLE
				if (!hasClass(event.target, "project-header")) { return; } //ignore bubbling double clicks
			}*/
      if (typeof boole !== "boolean") {
        expanded() ? expanded(false) : expanded(true);
        return;
      }
      expanded(boole);
    }
    self.nameInterface = ko.pureComputed({
      read: function() {
        return name();
      },
      write: function(newValue) {
        validName(newValue, true, function(valid, errMsg) {
          invalidName(valid ? false : true);
          if (valid) {
            name(newValue)
          } else {
            console.log(errMsg);
          }
        });
      },
      owner: this
    });
    self.rename = function(data, event) {
      if (readOnly()) return;
      if (event.type == "keyup" && (event.keyCode != 13 && event.keyCode != 27)) {
        return;
      }
      if (event.type != "dblclick") {
        if (invalidName() && editing()) {
          //$(event.target).fadeOut("fast").fadeIn("fast").focus();
          return;
        } else {
          editing(false);
          __updatePersistenceList();
          return;
        }
      }
      editing(true);
      setTimeout(function() { //force select (can't then avoid initial blur)
        $(event.target).focus().select();
      }, 10);
    }
      //MISC METHODS
    self.run = function() {
      if (locked()) return;
      locked(true); //prevent run spam
      if (self.isDirty()) {
        bootbox.confirm("This project has unsaved changes, these will not appear in the test run, do you wish to continue?", function(result) {
          if (result) {
            __runProject(self);
          }
        });
      } else {
        __runProject(self);
      }
      setTimeout(function() { locked(false); }, 5000);
    }
    self.openFolder = function() {
      __openFolder(path());
    }
    self.close = function() {
      __closeProject(self);
    }
    self.select = function() {
      /* select first possible scene */
      for (var i = 0; i < scenes().length; i++) {
        if (scenes()[i].select()) return true;
      }
      return false;
    }
    self.save = function(cb) {
      if (typeof cb != "function") cb = function() {}; //ui click
      var failed = false;
      var count = scenes().length;
      scenes().forEach(function(scene, index) {
        if (failed) return;
        scene.save(null, null, function(err) {
          if (err) {
            failed = true;
            return cb(err);
          }
          if (--count == 0) cb(null);
        });
      });
    }
    self.addNewScene = function(project, event) {
      if (readOnly()) return;
      if (event) event.stopPropagation();
      addNewScene(self);
    }
    self.addScene = function(scene) {
      if (scene.getProject() !== self && scene.getProject() !== false) return; //invalid call (only at scene creation or via scene.move())
      scenes.push(scene);
    }
    self.removeScene = function(scene) {
      if (scenes().lastIndexOf(scene) === -1) {
        return;
      }
      scenes.remove(scene);
      if (scenes().length < 1) {
        projects.remove(self);
      }
    }
    self.closeScene = function(scene) {
        function closeScene() {
          if (selectedScene() == scene) {
            selectedScene(null);
            editor.setValue("");
          }
          self.removeScene(scene);
          __updatePersistenceList();
        }
        if (scene.isDirty()) {
          bootbox.confirm("This scene has unsaved changes, are you sure you wish to close it?", function(result) {
            if (result) {
              closeScene();
            } else {
              return;
            }
          });
        } else {
          closeScene();
        }
      }
      /* callback(err, success_boolean) */
    self.exportScenes = function() {
      fh.selectFolder(function(newPath) {
        if (newPath) {
          bootbox.confirm("<h3>Warning</h3><p>This will <b>overwrite</b> any files with the same name in '<i>" + newPath + "</i>'.<br>Are you sure you wish to continue?</p>",
            function(result) {
              if (result) {
                __copyProjectTo(path(), newPath, function(err) {
                  if (err) {
                    notification("Error", err.message, {
                      type: "error"
                    });
                    return;
                  }
                  var buttons = [{
                    addClass: 'btn btn-default',
                    text: 'Show Folder',
                    onClick: function(note) {
                      __openFolder(newPath);
                      note.close();
                    }
                  }]
                  var n = notification("Game Exported Successfully", "All scenes exported successfully to " + newPath, {
                    type: "success",
                    buttons: buttons
                  });
                  n.setTimeout(10000);
                });
              }
            }
          );
        }
      });
    }
    self.compile = function() {
      fh.selectFolder(function(newPath) {
        if (newPath) {
          bootbox.confirm("<h3>Warning</h3><p>This will <b>overwrite</b> any file with the same name in '<i>" + newPath + "</i>'.<br>Are you sure you wish to continue?</p>",
            function(result) {
              if (result) {
                __fullCompile(self, newPath);
              }
            }
          );
        }
      });
    }
    self.test = function(test) {
      __testProject(self, test);
    }
    self.openAllScenes = function() {
      __openAllProjectScenes(self);
    }
    self.reloadAllScenes = function() {
      for (var i = 0; i < scenes().length; i++)
        scenes()[i].load();
    }
    self.logIssue = function(err, scene) {
      var lineNum = (typeof err.lineNumber === "number") ? (err.lineNumber - 1) : null;
      var issue = new csideIssue({
        project: self,
        scene: scene,
        desc: err.message,
        lineNum: lineNum
      });
      issues.push(issue);
      //visually notify
      var buttons = [{
        addClass: 'btn btn-danger',
        text: 'Show',
        onClick: function(note) {
          note.close();
          if (issue.getLineNum()) {
            issue.show();
          }
          if (selectedProject() == self) {
            __selectTab("issues");
          } else {
            self.select();
            __selectTab("issues");
          }
        }
      }]
      var n = notification("New Issue", "New issue with project " + name(), {
        type: "error",
        buttons: buttons
      });
      n.setTimeout(5000);
    }
    self.removeIssue = function(issue) {
      issues.remove(issue);
    }
  };

  function CSIDEScene(sceneData) {
    var self = this;
    //INSTANCE VARIABLES
    var path = ko.observable("").extend({
      normalizePaths: ""
    });
    path(sceneData.path);
    var name = ko.observable("").extend({
      lowerCase: ""
    });
	name(getSceneName(path()));
    var isImportant = name().toUpperCase().match(reservedSceneNames);
    var source = sceneData.source || platform; //won't change - so doesn't need to be an observable?
    var loaded = ko.observable(false);
    var locked = ko.observable(false);
    var readOnly = ko.observable(sceneData.readOnly || false); //app relative files are always read-only
    var dirty = ko.observable(false);
    var editing = ko.observable(false);
    var colouring = ko.observable(false);
    var saving = ko.observable(false);
    var inErrState = ko.observable(false);
    var errStateMsg = ko.observable("");
    var cmDoc = CodeMirror.Doc(sceneData.contents || "", "choicescript"); //won't change - so doesn't need to be an observable?
    var charCount = ko.observable(sceneData.contents ? sceneData.contents.length : 0); //prepopulate otherwise .load() text replacement results in '0' on new startup.txts
    var wordCount = ko.observable(0);
    var selectedChars = ko.observable(0);
    var history = cmDoc.getHistory();
    var fileStats = sceneData.stats || {
      "mtime": new Date()
    }; //won't change - so doesn't need to be an observable?
    var markColour = ko.observable(sceneData.color ? sceneData.color : isImportant ? "rgb(119, 151, 236)" : "rgb(119, 119, 119)");
    //var sceneListPosition = ko.observable(self.project().scenes().length);
    var issues = ko.observableArray([]);
    var invalidName = ko.observable(false);
    var nameErrMsg = ko.observable();
    self.isLocked = ko.computed(function() {
      if (locked()) return true;
      //is another scene selected but also being 'edited'? If yes, we can't select this scene yet.
      var curScene = cside.getSelectedScene();
      if (curScene && (curScene.beingEdited() && curScene != self)) return true;
      return false;
    }, this);

    //GETTER METHODS
    self.getName = ko.computed(function() {
      return name();
    }, this);
    self.getPath = ko.computed(function() {
      return path();
    }, this);
    self.hasLoaded = ko.computed(function() {
      return loaded();
    }, this);
    self.isSaving = ko.computed(function() {
      return saving();
    }, this);
    self.isDirty = ko.computed(function() {
      return dirty();
    }, this);
    self.isReadOnly = ko.computed(function() {
      return readOnly();
    }, this);
    self.beingEdited = ko.computed(function() {
      return editing();
    }, this);
    self.isSelected = ko.computed(function() {
      return (this === selectedScene());
    }, this);
    self.beingColoured = ko.computed(function() {
      return colouring();
    }, this);
    self.getSource = function() {
      return source;
    };
    self.getProject = function() {
      return getProject(getProjectPath(path()));
    };
    self.getText = function() {
      return cmDoc.getValue();
    };
    self.getMarkColour = ko.computed(function() {
      return markColour();
    }, this);
    self.getLineHandle = function(lineNum) {
      return cmDoc.getLineHandle(lineNum);
    }
    self.getLineNumber = function(lineHandle) {
      return cmDoc.getLineNumber(lineHandle);
    }
    self.nameInvalid = ko.computed(function() {
      return invalidName();
    }, this);
    self.getNameErrorMsg = ko.computed(function() {
      return nameErrMsg();
    }, this);
    /* 		self.getIndex = ko.computed(function() {
    			return sceneListPosition();
    		}, this); */
    self.getIssues = ko.computed(function() {
      return issues();
    }, this);
    self.getContents = function() {
      return cmDoc.getValue();
    }
    self.getErrStateMsg = ko.computed(function() {
      return errStateMsg() + ' - click here to close';
    }, this);
    self.getErrState = ko.computed(function() {
      return inErrState();
    }, this);
    self.getCharCountString = function() {
      if (selectedChars() > 0) {
        return selectedChars() + " (" + charCount() + ")";
      } else {
        return charCount();
      }
    };
    self.getCharCount = function(selected) {
      if (selected) {
        return selectedChars();
      } else {
        return charCount();
      }
    };
    self.getWordCountString = function() {
      var suffix = editor.getOption("exclude_cmd_lines") ? " [excl. cmds]" : " [inc. cmds]";
      if (selectedChars() > 0) {
        var selectedWords = __wordCount(cmDoc.getSelection(), editor.getOption("exclude_cmd_lines"));
        return (selectedWords + (" (" + wordCount() + ") " + suffix));
      } else {
        return wordCount() + suffix;
      }
    };
    self.getWordCount = function(exclCommandLines, selected) {
      return selected ?  __wordCount(cmDoc.getSelection(), exclCommandLines) : __wordCount(cmDoc.getValue(), exclCommandLines);
    };
    self.getState = ko.computed(function() {
      if (saving())
        return "fa fa-spinner fa-spin";
      if (!loaded())
        return "fa fa-ban"
      return inErrState() ? "fa fa-exclamation-triangle scene-unsaved" : readOnly() ? "fa fa-lock" : dirty() ? "fa fa-save scene-unsaved" : "fa fa-save scene-saved"
    });

    //SETTER METHODS
    self.setText = function(value) {
      if (readOnly()) return;
      if (typeof value != "string") return;
      cmDoc.setValue(value);
    }
    var renameSceneFile = function(newName) {
      if (invalidName())
        return;
      saving(true);
      var newPath = self.getProject().getPath() + newName + '.txt';
      fh.renameFile(path(), newPath, function(err) {
        executeRename(err);
      });

      function executeRename(err) {
        saving(false);
        if (err) {
          bootbox.alert(err);
        } else {
          fileStats.mtime ? fileStats.mtime = new Date() : fileStats.modifiedAt = new Date();
          path(newPath);
          name(newName);
          __updatePersistenceList();
        }
      }
    }
    self.nameInterface = ko.pureComputed({
      read: function() {
        return name();
      },
      write: function(newValue) {
        validName(newValue, false, function(valid, errMsg) {
          invalidName(valid ? false : true);
          if (valid) {
            //name(newValue) but need to check it doesn't already exist - instead we do this on confirm (see self.rename)
          } else {
            nameErrMsg(errMsg);
          }
        });
      },
      owner: this
    });
    self.rename = function(data, event) {
      if (inErrState() || !loaded() || saving() || readOnly()) {
        return;
      }
      if (event.type == "keyup" && (event.keyCode != 13 && event.keyCode != 27)) {
        return;
      }
      if (event.type != "dblclick" && event.type != "click") {
        if (invalidName() && editing()) {
          $(event.target).fadeOut("fast").fadeIn("fast").focus();
          return;
        } else {
          var newName = event.target.value.trim();
          if (newName != name()) {
            sceneExists(newName, self.getProject(), function(exists) {
              if (!exists) {
                renameSceneFile(newName);
              } else {
                notification("Failed to Rename Scene", "Scene '" + event.target.value.toLowerCase() + "' already exists in this Project", {
                  type: "error"
                });
                event.target.value = name();
              }
            });
          }
          editing(false);
        }
      } else if (isImportant) {
        if (isImportant) {
          notification("", "Reserved scene cannot be renamed", {
            type: "error",
            layout: "bottomLeft"
          });
          return;
        }
      } else if (self.isLocked()) {
        return;
      } else {
        editing(true);
        setTimeout(function() { //force select (can't then avoid initial blur)
          $(event.target).focus().select();
        }, 10);
      }
    }
    self.recolour = function(data, event) {
      // only ever called from events...?
      if (event.type === "mouseleave" && !colouring()) return; // ignore mouseleave after colour select
      if (self.isLocked()) return;
      if (typeof data == "string" && data != markColour()) {
        var reg = new RegExp("(" + validSceneColours().join("|").replace(/\(/g, "\\(").replace(/\)/g, "\\)") + ")");
        if (!data.match(reg)) {
          console.log("Scene Recolour Error: Invalid colour");
          return;
        }
        markColour(data);
        __updatePersistenceList();
      }
      colouring(!colouring());
    }
    self.focusLine = function(lineNum, noArrow) {
      if (self !== selectedScene()) self.select();
      if (!noArrow) {
        editor.clearGutter("arrow-gutter");
        editor.setGutterMarker(lineNum, "arrow-gutter", document.createTextNode("→"));
      }
      editor.scrollIntoView({
        line: lineNum,
        ch: 0
      }, 20);
    }
    self.addIssue = function(issue) {
      issues.push(issue);
      if (typeof issue.getLineNum() === "number") {
        var lh = cmDoc.getLineHandle(issue.getLineNum()); //-1 for 0 based
        if (lh) {
          cmDoc.addLineClass(lh, 'background', 'CodeMirror-error-background');
          CodeMirror.on(lh, "delete", function(lineHandle, change) {
            issues.remove(issue);
          });
          return lh;
        }
        return null;
      }
    }
    self.removeIssue = function(issue) {
        if (typeof issue.getLineNum() === "number") {
          cmDoc.removeLineClass(issue.getLineNum(), 'background', 'CodeMirror-error-background');
        }
        issues.remove(issue);
      }
      //MISC METHODS
    self.load = function(callback) {
      if (saving()) return;
      loaded(false);
      saving(true);
      if (typeof callback != 'function') {
        callback = function(err) {
          if (err) {
            console.log(err.message);
          }
        }
      }

      fh.stat(path(), function(err, newfileStats) {
        if (err) {
          finishLoading(err);
        } else {
          fileStats = newfileStats;
          fh.readFile(path(), function(err, data) {
            if (err) {
              finishLoading(err);
            } else {
              finishLoading(err, data);
            }
          });
        }
      });

      function finishLoading(err, data) {
        if (err) {
          inErrState(true);
          errStateMsg(err.message);
          console.log(errStateMsg());
          callback(err);
        } else {
          inErrState(false);
          cmDoc.setValue(data);
          cmDoc.markClean();
          cmDoc.clearHistory();
          dirty(false);
          __updatePersistenceList();
          //check tab/space collsion:
          __testSceneIndentation(self);
        }
        loaded(true);
        saving(false);
        if (typeof callback != 'undefined') callback(err, self);
      }
    }
    self.save = function(scene, event, callback) {
      if (event) event.stopPropagation();
      //skip clean, error'd or currently saving scenes
      if ((!dirty() && loaded()) || inErrState() || saving() || locked() || readOnly()) {
        if (typeof callback == 'function') callback(null);
        return;
      }
      saving(true);
      var lastModifiedAt = fileStats.mtime || fileStats.modifiedAt;
      fh.stat(path(), function(err, newfileStats) {
        if (err && (err.code == 404 || err.code == "ENOENT")) {
          //new scene, we're cool, bypass:
          saveScene(callback);
        } else if (err) {
          console.log(err);
          saving(false);
          bootbox.alert("<h3>Warning</h3><p>Unable to save <b>" + name() + "</b> of <b>" + self.getProject().getName() + "</b>: " + err.message + ".</p> \
						<p>Check your internet connection.</p>");
        } else {
          checkDate(newfileStats);
        }
      });

      function checkDate(newfileStats) {
        var newlyModifiedAt = newfileStats.mtime || newfileStats.modifiedAt;
        if (newlyModifiedAt.getTime() > (lastModifiedAt.getTime() + 1000)) {
          bootbox.dialog({
            message: "'" + name() + ".txt' of <b>" + self.getProject().getName() + "</b> appears to have been modified by another program or process \
						since it was last saved. Are you sure you wish to save it?",
            title: "Conflict Warning",
            buttons: {
              cancel: {
                label: "Cancel",
                callback: function() {
                  saving(false);
				  return;
                }
              },
			  reload: {
                label: "Reload",
                callback: function() {
                  saving(false);
                  self.load(function(err, scene) {
                    if (!err) {
                      scene.select();
                    }
                  });
				  return;
                }
              },
			  yes: {
                label: "Save",
                className: "btn-primary",
                callback: function() {
                  saveScene(callback);
                }
              }
            },
            onEscape: function() {
			  saving(false);
			  return;
            }
	       });
        } else {
          saveScene(callback);
        }
      }
    }

    function saveScene(callback) {
      var data = cmDoc.getValue();
      fh.writeFile(path(), data, function(err) {
        finalizeSave(err);
      });

      function finalizeSave(err) {
        if (err) {
          console.log(err);
        } else {
          dirty(false);
          cmDoc.markClean();
          fileStats.mtime ? fileStats.mtime = new Date() : fileStats.modifiedAt = new Date();
        }
        saving(false);
        if (typeof callback == 'function') callback(err);
      }
    }
    self.select = function() {
      if (selectedScene() === self) {
        return;
      }
      if (inErrState() || !loaded() || saving() || self.isLocked()) {
        return false;
      }
      //ensure we're not already editing the name of another scene:
      editor.clearGutter("arrow-gutter");
      selectedScene(self);
      editor.swapDoc(cmDoc);
      if (!self.getProject().isExpanded()) {
        self.getProject().setExpand(true);
      }
      editor.setOption("readOnly", readOnly());
      return true;
    }
    self.close = function() {
      self.getProject().closeScene(self);
    }
    self.copyTo = function(targetProject) {
      if (typeof targetProject !== "object") return;
      if (inErrState() || !loaded() || saving()) return;
      if (targetProject.isReadOnly()) {
        notification("", "Cannot Move Scene to Read-Only Project", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      var newPath = targetProject.getPath() + name() + '.txt';
      fh.copyFile(path(), newPath, function(err, fileStat) {
        executeCopy(err);
      });

      function executeCopy(err) {
        if (err) {
          bootbox.alert(err.message);
          console.log(err);
        } else {
          var newScene = new CSIDEScene({
            "path": newPath,
            "source": source,
            "contents": cmDoc.getValue()
          });
          targetProject.addScene(newScene);
          newScene.load(); //contains _updatePersistenceList()
        }
      }
    }
    self.moveTo = function(targetProject) {
      if (typeof targetProject !== "object") return;
      if (inErrState() || !loaded() || saving() || readOnly()) return;
      if (isImportant) {
        notification("", "Cannot Move Reserved Scene", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      if (targetProject.isReadOnly()) {
        notification("", "Cannot Move Scene to Read-Only Project", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      var currentProject = self.getProject();
      if (targetProject === currentProject) return;
      var newPath = targetProject.getPath() + name() + '.txt';
      fh.renameFile(path(), newPath, function(err) {
        executeMove(err);
      });

      function executeMove(err) {
        if (err) {
          bootbox.alert(err.message);
          console.log(err);
        } else {
          currentProject.removeScene(self);
          path(newPath);
          targetProject.addScene(self);
          __updatePersistenceList();
        }
      }
    }
    self.del = function() {
        if (inErrState() || !loaded() || saving()) return;
        if (isImportant) {
          notification("", "Cannot Delete Reserved Scene", {
            type: 'error',
            closeWith: ["click"]
          });
          return;
        } else if (readOnly()) {
          notification("", "Cannot Delete Read-Only Scene", {
            type: 'error',
            closeWith: ["click"]
          });
          return;
        } else {
          bootbox.confirm("<h3>Confirm</h3><p>Are you sure you want to permanently delete '" + name() + ".txt'?</p>" + "<p style='font-size:12px;'>" + path() + "<p>",
            function(result) {
              if (result) {
                executeDeletion();
              }
            }
          );
        }

        function executeDeletion() {
          fh.deleteFile(path(), function(err) {
            if (err) {
              bootbox.alert(err.message);
            } else {
              self.close();
            }
          });
        }
      }
    //Prevent editing while saving (basically fakes a read-only document)
    CodeMirror.on(cmDoc, "beforeChange", function(cm, change) {
      if (saving() && loaded()) {
        change.cancel();
        if (change.origin == "undo" || change.origin == "redo")
          cmDoc.setHistory(history); //prevent history butchering
      }
    });
    //Update dirty status, char count etc - on change
    CodeMirror.on(cmDoc, "change", function(cm, change) {
      if (!saving())
        cmDoc.isClean() ? dirty(false) : dirty(true);
      history = cmDoc.getHistory();
      //if (editor.getOption("word_count")) { // CJW re-add this condition in at some point for performance
      charCount((charCount() - change.removed.join('\n').length) + change.text.join('\n').length);
      wordCount(__wordCount(cmDoc.getValue(), editor.getOption("exclude_cmd_lines")));
      //}
    });
    CodeMirror.on(cmDoc, "cursorActivity", function(cm) {
      selectedChars(cmDoc.getSelection().length);
    });
  }

  function csideIssue(issueData) {
    var self = this;

    //INSTANCE VARIABLES
    var scene = issueData.scene || null;
    var project = issueData.project || null;
    if (project === null) {
      return null;
    }
    var desc = issueData.desc || "No description available";
    var lineHandle = null;
    var lineNum = ((typeof issueData.lineNum === "number") && (issueData.lineNum > -1)) ? issueData.lineNum : null;
    var date, time;

    var d = new Date();
    date = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
    time = d.getHours() + ":" + d.getMinutes();

    //GETTER METHODS
    self.getScene = function() {
      return scene;
    }
    self.getDesc = function() {
      return desc;
    }
    self.getDate = function() {
      return date;
    }
    self.getTime = function() {
      return time;
    }
    self.getLineNum = function() {
      return lineHandle ? lineHandle.lineNo() : lineNum;
    };
    self.dismiss = function() {
      project.removeIssue(self);
      if (scene) {
        scene.removeIssue(self);
      }
    }
    self.show = function() {
      if (!scene) {
        return;
      }
      scene.select();
      if (typeof self.getLineNum() === "number") {
        scene.focusLine(self.getLineNum(), true);
      }
    }

    if (scene) {
      var lh = scene.addIssue(self); //register issue with scene
      if (lh) {
        lineHandle = lh;
      }
    }
  }

  function CSIDESetting(settingData) {
    var setting = this;
    var value = ko.observable(settingData.value);
    value.extend({ notify: 'always' });
    var id = settingData.id;
    var name = settingData.name;
    var selectedOption = 0;
    var type = settingData.type || "binary";
    var cat = settingData.cat || "app";
    var desc = ko.observable(settingData.desc || "");
	var visible = ko.observable(true);

    if (type === "binary") {
      var options = [{
        "desc": "on",
        "value": true
      }, {
        "desc": "off",
        "value": false
      }]
    } else {
      var options = settingData.options;
    }

    //ACCESSOR METHODS
    setting.getValue = ko.computed(function() {
      return value();
    }, this);
    setting.getId = function() {
      return id;
    }
    setting.getName = function() {
      return name;
    }
    setting.getType = function() {
      return type;
    }
    setting.getCat = function() {
      return cat;
    }
    setting.getOptions = function() {
      return options;
    }
    setting.getDesc = ko.computed(function() {
      return desc();
    }, this);
	setting.isVisible = ko.computed(function() {
      return visible();
	}, this);

    //MUTATOR METHODS
    setting.setDesc = function(val) {
      desc(val);
    }
    setting.apply = settingData.apply; //unique apply method for each setting
    setting.toggle = function(option, evt) {
      if (type != "binary") {
        value(option.value);
      } else if ((selectedOption + 1) == options.length) {
        selectedOption = 0;
        value(options[selectedOption].value);
      } else {
        selectedOption += 1;
        value(options[selectedOption].value);
      }
    }
    setting.setValue = function(newVal) {
      value(newVal);
    }
	setting.setVisibility = function(newVal) {
      if (typeof newVal == "boolean")
        visible(newVal);
	}
    value.subscribe(function(option) {
      config.settings[cat][id] = value(); //store
      setting.apply(value());
      __updateConfig(); //then write new settings object to localStorage
    });

    setting.extAPI = {
      getName: setting.getName,
      getType: setting.getType,
      getDesc: setting.getDesc,
      getValue: setting.getValue,
      value: value,
      toggle: setting.toggle,
      getOptions: setting.getOptions,
	  isVisible: setting.isVisible
    }
  }

  // ╔═╗┬ ┬┌┐ ┬  ┬┌─┐  ╔═╗┌─┐┌─┐┌─┐┌─┐
  // ╠═╝│ │├┴┐│  ││    ╚═╗│  │ │├─┘├┤
  // ╩  └─┘└─┘┴─┘┴└─┘  ╚═╝└─┘└─┘┴  └─┘

  var self = this;

  if (usingNode) {
    var CSIDE_version = gui.App.manifest.version;
    var nw_version = process.versions['node-webkit'];
    var platform = (process.platform === "darwin" ? platform = "mac_os" : platform = process.platform);
    var execPath = (platform === "mac_os") ? process.execPath.substring(0, process.execPath.lastIndexOf('/') + 1) : process.execPath.substring(0, process.execPath.lastIndexOf('\\') + 1);
    var updating = false;
    var autoSaveFn = null;
    var autoUpdateCheckFn = null;
	var autoSuggestFn = null;
    self.isUpdating = function() {
      return updating;
    }
  } else {
    var CSIDE_version = "Dropbox Alpha";
    var platform = "web-dropbox";
  }

  var CONST_IMG_PREFIX = "csideimg_";

  //INSTANCE VARIABLES
  var user = {
    "name": usingNode ? require('username').sync() : 'Dropbox User',
    "path": "/"
  }
  user.name = user.name.charAt(0).toUpperCase() + user.name.slice(1);

  var projectMenuOptions = ko.observableArray([
    new menuOption("Add new scene", function(menu) {
      menu.getTarget().addNewScene();
    }),
    new menuOption("Open all scenes", function(menu) {
      menu.getTarget().openAllScenes();
    }),
    new menuOption("Reload all scenes", function(menu) {
      menu.getTarget().reloadAllScenes();
    }),
    new menuOption("Review", function(menu) {
      //do nothing
    }, [
      new menuOption("Word count", function(menu) {
        cside.showWordCount(menu.getTarget());
      })
    ]),
    new menuOption("Export", function(menu) {
      //do nothing
    }, [
      new menuOption("All scenes to folder", function(menu) {
        menu.getTarget().exportScenes();
      })
    ]),
    new menuOption("Open folder in " + (platform === "mac_os" ? "Finder" : "Explorer"), function(menu) {
      menu.getTarget().openFolder();
    }),
    new menuOption("Show/hide project", function(menu) {
      menu.getTarget().setExpand();
    }),
    new menuOption("Close project", function(menu) {
      menu.getTarget().close();
    })
  ]);

  var sceneMenuOptions = ko.observableArray([
    new menuOption("Edit", function(menu) {
      //do nothing
    }, [
      new menuOption("Convert all spaces to tabs", function(menu) {
        __normalizeSceneIndentation(menu.getTarget(), "tabs");
      }),
      new menuOption("Convert all tabs to spaces", function(menu) {
        __normalizeSceneIndentation(menu.getTarget(), "spaces");
      })
    ]),
    new menuOption("Review", function(menu) {
      //do nothing
    }, [
      new menuOption("Word count", function(menu) {
        cside.showWordCount(menu.getTarget());
      })
    ]),
    new menuOption("Reload", function(menu) {
      menu.getTarget().load(function(err, scene) {
        if (!err && selectedScene() === menu.getTarget()) {
          scene.select();
        }
      });
    }),
    new menuOption("Close", function(menu) {
      menu.getTarget().close();
    }),
    new menuOption("Delete file", function(menu) {
      menu.getTarget().del();
    }),
  ]);

  if (usingNode) {
    sceneMenuOptions.push(
      new menuOption("Export", function(menu) {
        //do nothing
      }, [
        new menuOption("Copy file to folder", function(menu) {
          var scene = menu.getTarget();
          fh.selectFolder(function(newPath) {
            if (newPath) {
              bootbox.confirm("<h3>Warning</h3><p>This will <b>overwrite</b> any file with the same name in '<i>" + newPath + "</i>'.<br>Are you sure you wish to continue?</p>",
                function(result) {
                  if (result) {
                    fh.copyFile(scene.getPath(), newPath + scene.getName() + ".txt", function(err, data) {
                      if (err) {
                        notification("Export Failed", err.message, {
                          type: "error"
                        });
                      } else {
                        var note;
                        var buttons = [{
                          addClass: 'btn btn-default',
                          text: 'Show Folder',
                          onClick: function(note) {
                            __openFolder(newPath);
                            note.close();
                          }
                        }];
                        note = notification("Export Succesful", "Copied " + scene.getName() + " to " + newPath, {
                          type: "success",
                          buttons: buttons
                        });
                        note.setTimeout(3000);
                      }
                    });
                  }
                }
              );
            }
          });
        }),
        new menuOption("Print file", function(menu) {
          nw.Window.open("file://" + menu.getTarget().getPath(), {
            focus: true,
            width: 800,
            height: 600
          }, function(win) {
            win.window.print();
          });
        })
      ])
    );
    // Tests only allowed on desktop version
    projectMenuOptions.splice(4, 0,
      new menuOption("Import", function(menu) {
        //do nothing
      }, [
        new menuOption("Image (as scene)", function(menu) {
          if (menu.getTarget().isReadOnly()) {
            return;
          }
          fh.selectImage(function(path) {
            if (path) {
              __createImageScene(menu.getTarget(), path);
            }
          });
        })
      ])
    );
    projectMenuOptions.splice(6, 0,
      new menuOption("Test Project", function(menu) {
          //do nothing
        }, [
          new menuOption("Quicktest", function(menu) {
            menu.getTarget().test("quick");
          }),
          new menuOption("Randomtest", function(menu) {
            if (platform != "web-dropbox")
              menu.getTarget().test("random");
            else
              bootbox.alert("<h3>Apologies...</h3><p>But due to technical limitations randomtest can only be run in the Desktop version of the Choicescript IDE.</p></h3>");
          })
        ]
      )
    );
    projectMenuOptions()[5].getSubMenuOptions().push(
      new menuOption("Compiled game", function(menu) {
        menu.getTarget().compile();
      })
    );
  }

  var projects = ko.observableArray([]);
  var selectedScene = ko.observable(null)
  var selectedProject = ko.computed(function() {
    return selectedScene() ? selectedScene().getProject() : null;
  });
  self.getSelectedProject = ko.computed(function() {
    return selectedProject();
  }, this);

  if (platform === "mac_os") {
    var nativeMenuBar = new nw.Menu({
      type: "menubar"
    });
    if (process.platform === "darwin") {
      nativeMenuBar.createMacBuiltin("CSIDE");
    }
    win.menu = nativeMenuBar;
    (function() {
      var projectMenu = new nw.Menu();
      projectMenu.getTarget = selectedProject;
      var subMenu;
      var options = projectMenuOptions();
      for (var i = 0; i < options.length; i++) {
        if (options[i].getSubMenuOptions()) {
          subMenu = new nw.Menu();
          for (var o = 0; o < options[i].getSubMenuOptions().length; o++) {
            subMenu.append(new nw.MenuItem({
              label: options[i].getSubMenuOptions()[o].getLabel(),
              click: options[i].getSubMenuOptions()[o].doAction.bind(null, projectMenu)
            }));
          }
          projectMenu.append(new nw.MenuItem({
            label: options[i].getLabel(),
            click: options[i].doAction.bind(null, projectMenu),
            submenu: subMenu
          }));
        } else {
          projectMenu.append(new nw.MenuItem({
            label: options[i].getLabel(),
            click: options[i].doAction.bind(null, projectMenu)
          }));
        }
      }
      var index = ((platform === "mac_os") ? 3 : 1);
      win.menu.insert(new nw.MenuItem({
        label: "Project",
        submenu: projectMenu
      }), index);
    })();

    (function() {
      var sceneMenu = new nw.Menu();
      sceneMenu.getTarget = selectedScene;
      var subMenu;
      var options = sceneMenuOptions();
      for (var i = 0; i < options.length; i++) {
        if (options[i].getSubMenuOptions()) {
          subMenu = new nw.Menu();
          for (var o = 0; o < options[i].getSubMenuOptions().length; o++) {
            subMenu.append(new nw.MenuItem({
              label: options[i].getSubMenuOptions()[o].getLabel(),
              click: options[i].getSubMenuOptions()[o].doAction.bind(null, sceneMenu)
            }));
          }
          sceneMenu.append(new nw.MenuItem({
            label: options[i].getLabel(),
            click: options[i].doAction.bind(null, sceneMenu),
            submenu: subMenu
          }));
        } else {
          sceneMenu.append(new nw.MenuItem({
            label: options[i].getLabel(),
            click: options[i].doAction.bind(null, sceneMenu)
          }));
        }
      }
      var index = ((platform === "mac_os") ? 4 : 2);
      win.menu.insert(new nw.MenuItem({
        label: "Scene",
        submenu: sceneMenu
      }), index);
    })();

    if (platform != "mac_os") {
      nw.Window.get().menu = win.menu; // display on Windows
    }
    else {
      ko.extenders.updateMenuBarStates = function(target, option) {
        target.subscribe(function(scene) {
          var b = scene ? true : false;
          var projectIndex = ((platform === "mac_os") ? 3 : 1);
          var sceneIndex = ((platform === "mac_os") ? 4 : 2);
          win.menu = nw.Window.get().menu;
          for (var index = projectIndex; index <= sceneIndex; index++) {
            for (var item = 0; item < win.menu.items[index].submenu.items.length; item++) {
              win.menu.items[index].submenu.items[item].enabled = b;
            }
          }
          nw.Window.get().menu = win.menu;
        });
        return target;
      };
      selectedScene.extend({ updateMenuBarStates: "" });
      selectedScene.valueHasMutated(); //force initialMenubarStates call
    }
  }

  var autoFormatMap = {
    "...": "…", // ellipsis
    "--": "—" 	// emdash
  };
  var reservedSceneNames = "(STARTUP|CHOICESCRIPT_STATS)"; //Should be in upper case
  var validSceneColours = ko.observableArray(["rgb(125, 186, 125)", "rgb(172, 209, 240)", "rgb(228, 144, 150)",
    "rgb(237, 216, 161)", "rgb(161, 165, 237)", "rgb(224, 161, 237)", "rgb(163, 163, 163)", "rgb(230, 230, 230)"
  ]);
  validSceneColours = ko.observableArray(["rgb(114, 195, 116)", "rgb(119, 151, 236)", "rgb(217, 83, 79)", "rgb(165, 147, 122)", "rgb(255, 141, 43)", "rgb(224, 121, 245)", "rgb(0, 168, 195)", "rgb(119, 119, 119)"]);
  var uiColour = ko.observable().extend({ notify: 'always' });
  uiColour("90,90,90");
  var consoleOpen = ko.observable(false);
  var activeProject = ko.observable("");
  var projects = ko.observableArray([]);
  var wordCountOn = ko.observable(true);
  var config;
  var defaultConfig = {
    "settings": {
      "editor": {
        "tabtype": "spaces",
        "smartindent": true,
        "tabsize": "4",
        "linewrap": true,
        "fontsize": "12px",
        "fontfamily": "'Courier New', Courier, monospace",
        "spell_dic": "en_US",
        "theme": "cs-dark",
        "night-mode": false,
        "spellcheck": 1,
        "autosuggest": false,
        "autoformat": true,
        "word-count": 2,
        "visible-tabs": false,
        "selection-match": false,
      },
      "app": {
        "persist": true,
        "autosave": true,
        "cmdhelp": false,
        "update-channel": "stable",
        "ui-colour": "90,90,90",
        "project-path": "default" //COME BACK TO ME CJW
      }
    },
	"justUpdated": false,
    "openProjects": [],
    "userDictionary": {},
    "tabs": [
      "game",
      "issues",
      "settings",
      "help",
      "dictionary"
    ]
  };
  if (usingNode) {
    defaultConfig.tabs.push("examples");
  }
  config = defaultConfig;
  try {
    storedConfig = JSON.parse(localStorage.getItem("CSIDE_appConfig"));
    for (var item in storedConfig) { config[item] = storedConfig[item]; }
  } catch (err) {
    bootbox.alert("Sorry, there was a problem parsing your configuration settings.<br> \
		They have been repaired and reset to the defaults.<br><br> \
		<b>Error:</b> " + err.message);
    localStorage.setItem("CSIDE_appConfig", JSON.stringify(defaultConfig));
    config = defaultConfig;
  }
  var userDictionary = {};
  var fh = { //FILE HANDLER
    "writeFile": function(path, data, callback) {
      switch (platform) {
        //WRITE
        case "web-dropbox":
          db.filesUpload({path: path, contents: data, mode:{ ".tag": "overwrite" }, autorename: false})
            .then(function(response) {
              callback(null);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          mkdirp(getDirName(path), function(err) {
            if (err) {
              callback(normalizeError(err));
            } else {
              fs.writeFile(path, data, {
                encoding: 'utf8'
              }, function(err) {
                callback(normalizeError(err));
              });
            }
          });
      }
    },
    "readFile": function(path, callback) {
      switch (platform) {
        //WRITE
        case "web-dropbox":
          db.filesDownload({path:path})
            .then(function(fileData) {
              var reader = new FileReader()
              reader.addEventListener("loadend", function() {
                if (reader.result) {
                  callback(null, new TextDecoder("utf-8").decode(reader.result));
                }
                else {
                  callback({}); // unlikely reader error?
                }
              }); // fh.reader.result
              reader.readAsArrayBuffer(fileData.fileBlob);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          fs.readFile(path, {
            encoding: 'utf8'
          }, function(err, data) {
            callback(normalizeError(err), data);
          });
      }
    },
    "copyFile": function(oldPath, newPath, callback) {
      switch (platform) {
        case "web-dropbox":
          db.filesCopy({from_path:oldPath, to_path:newPath})
            .then(function(response) {
              callback(null);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          fs.readFile(oldPath, {
            encoding: 'utf8'
          }, function(err, data) {
            if (err) {
              callback(normalizeError(err));
            } else {
              fs.writeFile(newPath, data, function(err) {
                callback(normalizeError(err));
              });
            }
          });
      }
    },
    "renameFile": function(oldPath, newPath, callback) {
      switch (platform) {
        case "web-dropbox":
          db.filesMove({from_path:oldPath, to_path:newPath})
            .then(function(response) {
              callback(null);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          fs.rename(oldPath, newPath, function(err) {
            callback(normalizeError(err));
          });
      }
    },
    "deleteFile": function(path, callback) {
      switch (platform) {
        case "web-dropbox":
          db.filesDelete({path:path})
            .then(function(response) {
              callback(null);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          trash([path], function(err) {
            callback(normalizeError(err))
          });
          break;
      }
    },
    "readDir": function(path, callback, dbMetaData) {
      switch (platform) {
        case "web-dropbox":
          path = (path == "/") ? "" : path;
          db.filesListFolder({path:path})
            .then(function(response) {
              // extra db metadata for file explorer
              if (typeof dbMetaData != "undefined" && dbMetaData == true) // standardize path and folder properties
                callback(null, response.entries.map(function(item) { item.path = item.path_lower; item.isFolder = (item[".tag"] == "folder"); return item; }));
              // just return an array of paths for standard use
              else
                callback(null, response.entries.map(function(item) { return getLastDirName(item.path_lower); }));
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          fs.readdir(path, function(err, filePathArray) {
            callback(normalizeError(err), filePathArray);
          });
          break;
      }
    },
    "makeDir": function(path, callback) {
      switch (platform) {
        case "web-dropbox":
          if (path.slice(-1, path.length) == "/") {
            path = path.slice(0, -1); // db API doesn't allow trailing slashes
          }
          db.filesCreateFolder({path:path})
            .then(function(response) {
              callback(null);
            })
            .catch(function(error) {
              if (err && err.status == 403) { //FOLDER ALREADY EXISTS ??? 409??
                delete err.status;
                err.code = "EEXIST";
              }
              callback(normalizeError(err));
            });
          break;
        default:
          mkdirp(path, function(err) {
            callback(normalizeError(err));
          });
          break;
      }
    },
    "stat": function(path, callback) {
      switch (platform) {
        case "web-dropbox":
          db.filesGetMetadata({path: path})
          .then(function(response) {
            callback(null, {mtime: new Date(response.client_modified) })
          })
          .catch(function(err) {
            callback(normalizeError(err));
          });
          break;
        default:
          fs.stat(path, function(err, fileStats) {
            callback(normalizeError(err), fileStats);
          });
          break;
      }
    },
    "selectFolder": function(callback) {
      switch (platform) {
        case "web-dropbox":
          fileBrowser.selectFolders(function(selection) {
            if (selection.length > 0) {
              callback(selection[0].path + '/');
            } else {
              callback(null);
            }
          });
          break;
        default:
          var chooser = $("#selectFolder");
          chooser.off().change(function(evt) {
            callback($(this).val() + '/');
            $(this).val("");
          });
          setTimeout(function() {
            chooser.trigger("click");
          }, 200);
      }
    },
    "selectImage": function(callback) {
      switch (platform) {
        case "web-dropbox":
          bootbox.alert("TODO: Image scene import not yet implemented on the web-version.")
          break;
        default:
          var chooser = $("#getImagePaths");
          chooser.off().change(function(evt) {
            callback($(this).val());
            $(this).val("");
          });
          setTimeout(function() {
            chooser.trigger("click");
          }, 200);
      }
    }
  }

  var normalizeError = function(err) {
    if (!err) return null;
    if (typeof err.message == 'undefined') {
      try {
        err.message = JSON.parse(err.responseText).error;
      } catch (e) {
        err.message = "Unable to get an error description";
      }
    }
    if (typeof err.code == 'undefined') {
      err.code = err.status || "Unknown Error Code";
    }
    // New Dropbox SDK errors (409 = General, 429 = API Rate Limit or similar)
    if (err.code == 409 || err.code == 429) {
      try { err.error = JSON.parse(err.error); err.code = err.error.error[err.error.error[".tag"]][".tag"]; err.message = "Dropbox: " + err.error.error_summary; }
      catch(e) {};
    }
    switch (err.code) {
      case "not_found":
      case "ENOENT":
      case 404:
        err.code = 404;
        break;
      case "EEXIST":
        //FILE ALREADY EXISTS
        break;
      case 403:
      case "EACCES":
        //DENIED ACCESS or FORBIDDEN operation
        break;
      default:
        break;
    }
    return err;
  }

  var notification = function(title, message, options) {
    var options = options || {};
    options.theme = "cside_noty";
    options.layout = options.layout || "bottomRight";
    options.type = options.type || "default";
    options.timeout = options.timeout === false ? false : options.timeout || 5000;
    options.closeWith = options.closeWith === false ? false : options.closeWith || ["click"];
    options.buttons = options.buttons || null;
    options.animation = {
      open: {
        opacity: 'toggle'
      }, // jQuery animate function property object
      close: {
        opacity: 'toggle'
      }, // jQuery animate function property object
      easing: 'swing', // easing
      speed: 250 // opening & closing animation speed
    }

    function wrapMessage(title, msg) {
      return "<h5>" + title + "</h5>\
					 <p>" + msg + "</p>";
    }
    options.text = wrapMessage(title, message);
    if (options.progress) {
      options.text += "<progress value='0' max='100'></progress>";
    }
    var n = noty(options);
    if (options.progress) {
      n.setProgress = function(val) {
        n.$message.find(".noty_text").find("progress").val(val);
      }
    }
    return n;
  }
  self.notification = function(title, message, options) {
    notification(title, message, options);
  };

  // initiate dropbox:
  if (platform == "web-dropbox") {

    if (!!utils.parseQueryString(window.location.hash).access_token) {
      var db = new Dropbox({ accessToken: utils.parseQueryString(window.location.hash).access_token });
      db.setClientId("hnzfrguwoejpwbj");
    }
    else {
      var db = new Dropbox({ clientId: "hnzfrguwoejpwbj" });
      var authUrl = db.getAuthenticationUrl(window.location);
      window.location = authUrl;
    }

    // try and source the DB username:
    db.usersGetCurrentAccount().then(function(acc) {
      user.name = acc.name.display_name;
    })
    .catch(function(err) {}); // we don't mind errors, we'll just stick with the default name

  }

  window.db = db;

  var dropboxAuthorised = ko.observable(false);
  var typo = new Typo("", "", "", {
    platform: 'any'
  }); //spellchecking library var to avoid initial errors (we'll init it properly via settings)

  //GETTER METHODS
  self.dbAuth = ko.computed(function() {
    return dropboxAuthorised();
  }, this);
  self.getProjects = projects;
  self.getSelectedScene = ko.computed(function() {
    return selectedScene();
  }, this);
  self.getActiveProject = ko.computed(function() {
    return activeProject();
  }, this);
  self.getValidSceneColours = ko.computed(function() {
    return validSceneColours();
  }, this);
  self.getPlatform = function() {
    return platform;
  }
  self.wordCountOn = ko.computed(function() {
    return wordCountOn();
  });
  self.getUIColour = function(delta) {
    delta = delta || 0;
    if (config.settings.app["night-mode"]) {
      delta -= 30;  // darken night-mode colours even further
    }
    var rgb = uiColour().split(",");
    var val;
    for (var i = 0; i < rgb.length; i++) {
      val = (parseInt(rgb[i]) + delta);
      if (val < 0) {
        val = 0;
      } else if (val > 255) {
        val = 255;
      }
      rgb[i] = val;
    }
    var color = rgb.join(",");
    return ("rgb(" + color + ")");
  };

  self.selectTab = function(tab) {
    var tabs = self.tabs();
    for (var i = 0; i < tabs.length; i++) {
      if (tab === tabs[i].id) {
        __selectTab(tab);
        break;
      }
    }
  }

  //MUTATOR METHODS

  //MISC METHODS
  self.readFile = function(url, callback) {
    fh.readFile(url, callback);
  };
  self.selectScene = function(scene) {
    scene.select();
  }
  self.session = {
    "save": function(cb) {
      var failed = false;
      var count = projects().length;
      if (count < 1) {
        cb(null);
        return;
      }
      projects().forEach(function(project, index) {
        project.save(function(err) {
          if (err) {
            if (failed) return;
            failed = true;
            return cb(err);
          }
          if (--count == 0) cb(null);
        });
      });
    },
    "isDirty": ko.computed(function() {
      for (var i = 0; i < projects().length; i++) {
        if (projects()[i].isDirty()) {
          return true;
        }
      }
      return false;
    })
  }

  //frameless window control interface
  self.session.win = function() {
    var fullScreen = ko.observable(true);
    return {
      "isFullscreen": ko.computed(function() {
        return fullScreen();
      }, this),
      "toggleMaximize": function() {
        if (fullScreen()) {
          win.restore();
          //platform === "mac_os" ? win.leaveFullscreen() : win.restore();
        } else {
          platform === "mac_os" ? win.enterFullscreen() : win.maximize();
        }
        fullScreen(!fullScreen());
      }
    }
  }();

  if ((platform == "mac_os") || ((platform == "web-dropbox") && (window.navigator.platform == "MacIntel"))) {
    var keymap = {
      "Cmd-S": function(ed) {
        selectedScene().save();
      },
      "Cmd-W": function(ed) {
        selectedScene().close();
      },
      "Cmd-N": function(ed) {
        selectedProject().addNewScene();
      },
      "Cmd-Q": function(ed) {
        if (usingNode) {
          win.close();
        }
      },
      "Shift-Cmd-S": function(ed) {
        selectedProject().save();
      },
      "Shift-Cmd-W": function(ed) {
        selectedProject().close();
      },
      "Shift-Cmd-N": function(ed) {
        self.createProject();
      },
      "Shift-Cmd-,": function(ed) {
        self.scenePanel();
      },
      "Shift-Cmd-.": function(ed) {
        self.tabPanel();
      },
      "Shift-Cmd-O": function(ed) {
        selectedProject().openAllScenes();
      },
      "Shift-Tab": function(ed) {
        ed.indentSelection("subtract");
      },
      "Cmd-O": function(ed) {
        self.openFileBrowser();
      },
      "Cmd-D": function(ed) {
        insertTextTags("${", "}");
      },
      "Cmd-B": function(ed) {
        insertTextTags("[b]", "[/b]");
      },
      "Cmd-I": function(ed) {
        insertTextTags("[i]", "[/i]");
      },
      "Cmd-T": function(ed) {
        selectedProject().test("quick");
      },
      "Shift-Cmd-T": function(ed) {
        selectedProject().test("random");
      },
      "Shift-Cmd-Enter": function(ed) {
        selectedProject().run();
      },
      "Shift-Cmd-C": function(ed) {
        var open = selectedProject().toggleConsole();
        if (open) $("#cs-console > input").focus();
      },
      "Cmd-Alt-Down": function(ed) {
        self.moveSelection("down");
      },
      "Cmd-Alt-Up": function(ed) {
        self.moveSelection("up");
      },
      "F11": function(ed) {
        ed.setOption("fullScreen", !ed.getOption("fullScreen"));
      },
      "Esc": function(ed) {
        ed.setOption("fullScreen", !ed.getOption("fullScreen"));
      },
      //Mac cut, copy and paste don't work by default? MIGHT be a node-webkit thing.
      /*	"Cmd-X": function(ed) {
				document.execCommand("cut");
			},
			"Cmd-C": function(ed) {
				document.execCommand("copy");
			},
			"Cmd-V": function(ed) {
				document.execCommand("paste");
			} */
    }
  } else {
    var keymap = {
      "Ctrl-S": function(ed) {
        selectedScene().save();
      },
      "Ctrl-W": function(ed) {
        selectedScene().close();
      },
      "Ctrl-N": function(ed) {
        selectedProject().addNewScene();
      },
      "Ctrl-O": function(ed) {
        self.openFileBrowser();
      },
      "Shift-Ctrl-O": function(ed) {
        selectedProject().openAllScenes();
      },
      "Shift-Ctrl-S": function(ed) {
        selectedProject().save();
      },
      "Shift-Ctrl-W": function(ed) {
        selectedProject().close();
      },
      "Shift-Ctrl-N": function(ed) {
        self.createProject();
      },
      "Shift-Ctrl-,": function(ed) {
        self.scenePanel();
      },
      "Shift-Ctrl-.": function(ed) {
        self.tabPanel();
      },
      "Shift-Ctrl-Q": function(ed) {
        if (usingNode) {
          win.close();
        }
      },
      "Shift-Tab": function(ed) {
        ed.indentSelection("subtract");
      },
      "Ctrl-D": function(ed) {
        insertTextTags("${", "}");
      },
      "Ctrl-B": function(ed) {
        insertTextTags("[b]", "[/b]");
      },
      "Ctrl-I": function(ed) {
        insertTextTags("[i]", "[/i]");
      },
      "Ctrl-T": function(ed) {
        selectedProject().test("quick");
      },
      "Shift-Ctrl-T": function(ed) {
        selectedProject().test("random");
      },
      "Shift-Ctrl-Enter": function(ed) {
        selectedProject().run();
      },
      "Shift-Ctrl-C": function(ed) {
        var open = selectedProject().toggleConsole();
        if (open) $("#cs-console > input").focus();
      },
      "Shift-Ctrl-Down": function(ed) {
        self.moveSelection("down");
      },
      "Shift-Ctrl-Up": function(ed) {
        self.moveSelection("up");
      },
      "F11": function(ed) {
        ed.setOption("fullScreen", !ed.getOption("fullScreen"));
      },
      "Esc": function(ed) {
        ed.setOption("fullScreen", !ed.getOption("fullScreen"));
      }
    }
  }

  //define the editor instances and apply behaviour tweaks
  var editor = CodeMirror.fromTextArea(document.getElementById("code-textarea"), {
    //inputStyle: "contenteditable", accessibility
    mode: {
      name: "choicescript",
      version: 2,
      singleLineStringErrors: false
    },
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 4,
    indentUnit: 4,
    indentWithTabs: true,
    matchBrackets: true,
    extraKeys: keymap,
    foldGutter: true,
    historyEventDelay: 500,
    gutters: ["arrow-gutter", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    highlightSelectionMatches: {
      style: "matchhighlight",
      minChars: 2,
      delay: 200,
      wordsOnly: false,
      annotateScrollbar: false,
      showToken: false,
      trim: true
    }
  });

  self.moveSelection = function(direction) {
    if (direction !== "up" && direction !== "down") {
      return;
    }
    var selections = editor.listSelections();
    for (var i = 0; i < selections.length; i++) {
      var top = selections[i].from();
      var bottom = selections[i].to();
      var alpha = (direction === "down" ? 1 : -1);
      if (typeof editor.getLine(top.line + alpha) == 'undefined' || typeof editor.getLine(bottom.line + alpha) == 'undefined') {
        return;
      }
      if (bottom.ch === 0) {
        bottom.line--;
        bottom.ch = editor.getLine(bottom.line).length;
      }
      var storeLine = (direction === "down" ? editor.getLine(bottom.line + alpha) : editor.getLine(top.line + alpha));
      var movingLines = editor.getRange({
        line: top.line,
        ch: 0
      }, {
        line: bottom.line,
        ch: editor.getLine(bottom.line).length
      });
      editor.replaceRange(movingLines, {
        line: top.line + alpha,
        ch: 0
      }, {
        line: bottom.line + alpha,
        ch: editor.getLine(bottom.line + alpha).length
      }); //move lines down
      if (direction === "down")
        editor.replaceRange(storeLine, {
          line: top.line,
          ch: 0
        }, {
          line: top.line,
          ch: editor.getLine(top.line).length
        }); //replace the old top
      else
        editor.replaceRange(storeLine, {
          line: bottom.line,
          ch: 0
        }, {
          line: bottom.line,
          ch: editor.getLine(bottom.line).length
        }); //replace the old bottom
      editor.setSelection({
        line: top.line + alpha,
        ch: 0
      }, {
        line: bottom.line + alpha,
        ch: editor.getLine(bottom.line + alpha).length
      });
    }
  }

  var speller = function() {
    var word = new RegExp(/([A-Za-z\u00C0-\u00FF\u0100-\u017F]+'[A-Za-z\u00C0-\u00FF\u0100-\u017F]+|[A-Za-z\u00C0-\u00FF\u0100-\u017F]{2,}|[AaI]'?)(?=$|[\s\.,:;\?'\-\!—…])/g);
    var cmd = new RegExp(/^\s*\*[A-Za-z_]+\b/);
    var variable = new RegExp(/\{.*\}/g); //new RegExp(/\{[A-Za-z0-9_\[\]]+\}/g);

    return {
      token: function(stream) {
        if (stream.pos === 0) {
          var cmd_match = cmd.exec(stream.string);
          if (cmd_match) {
            if (editor.options.spellcheck === 2) { // EXCLUDE CMD LINES FROM SPELL CHECK
              stream.skipToEnd();
            }
            else {
              stream.pos += cmd_match[0].length || 1;
            }
          }
        }
        word.lastIndex = stream.pos;
        var word_match = word.exec(stream.string);
        if (word_match && word_match.index == stream.pos) {
          stream.pos += word_match[0].length || 1;
          return cside.spellCheck(word_match[0]) ? style = 'null' : style = "spell-error";
        } else if (word_match) {
          stream.pos++; //??
        } else {
          stream.skipToEnd();
        }

        /*query.lastIndex = stream.pos;
        var match = query.exec(stream.string);
        if (match && match.index == stream.pos) {
          stream.pos += match[0].length || 1;
          return "searching";
        } else if (match) {
          stream.pos = match.index;
        } else {
          stream.skipToEnd();
        }*/
      }
    };
  }
  editor.addOverlay(speller());
  /* 	editor.on("change", function(cm, change) {
  		if (change.origin != "paste" || change.text.length < 2) return;
  		cm.operation(function() {
  			if (!editor.getLine(change.to.line)) return; //occasionally bugs out on normal paste events without this
  			var targetLine = change.to.line;
  			var currentIndent = CodeMirror.countColumn(editor.getLine(change.to.line), null, 1, 0, 0);
  			for (var line = change.from.line, end = CodeMirror.changeEnd(change).line; line < end + 1; ++line) {
  				if (line != targetLine) {
  					var i = 0;
  					while (i < currentIndent) {
  						cm.indentLine(line, "add");
  						i++;
  					}
  				}
  			}
  		});
  	}); */
  //
  editor.on("dragover", function(cm, e) {
    $('.CodeMirror-cursors .CodeMirror-cursor').css("visibility", "visible");
    var xy = {
      "left": e.x,
      "top": e.y
    };
    var newPos = editor.coordsChar(xy);
    editor.setCursor(newPos);
  });
  editor.on("dragstart", function(cm, e) {
    e.dataTransfer.setData("Text", editor.getSelection());
  });
  editor.on("renderLine", function(cm, line, elt) {
    var charWidth = editor.defaultCharWidth(),
      basePadding = 4;
    var off = CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
    var pixelTabSize = 8 * editor.options.tabSize;
    var indentLevel = off / pixelTabSize;
    var leftMargin = pixelTabSize * indentLevel;
    elt.style.paddingLeft = leftMargin + "px";
    elt.style.textIndent = "-" + (leftMargin / (indentLevel + 1)) + "px";
  });

  editor.on("inputRead", function(cm, change) {
	if (change.text.length == 1) {

	  if (editor.getOption("autoformat")) { // auto-replace em-dash etc.
	    var tok = cm.getTokenAt(change.from); // try ?precise option if there are future issues
	    if (tok.type == "formattable") {
	      var replacement = autoFormatMap[tok.string];
	      if (typeof replacement != "undefined") {
		    cm.changeGeneration(true);
		    cm.replaceRange(replacement, {line: change.from.line, ch: tok.start}, {line: change.from.line, ch: tok.end});
	      }
	    }
	  }

	  if (editor.getOption("autosuggest")) {
	    if (change.text[0].match(/\w$/)) { //only fire on word characters
		  if (autoSuggestFn) {
		    clearTimeout(autoSuggestFn);
		  }
		  autoSuggestFn = setTimeout(function() {
		    CodeMirror.showHint(cm, null, {
			  completeSingle: false,
			  extraKeys: {
			    Enter: function() {
			      return false;
			    }
			  }
		    });
		  }, 150);
	    }
	  }
	}
  });



  editor.refresh();

  editor["forceSyntaxRedraw"] = function() { //ALIAS METHOD
      editor.setOption("mode", "choicescript");
    }
    //$('.CodeMirror, cm-s-choicescript').hide();

  //cside.noteEditor.refresh();

  var insertTextTags = function(tagStart, tagEnd, allowSpecialLines) {
    var text = editor.getSelection();
    var cursorLoc = "around";
    if (!text) {
      text = tagStart + tagEnd;
      cursorLoc = "start";
    } else {
      var line;
      var whitespace;
      text = text.split("\n");
      for (var i = 0; i < text.length; i++) {
        line = text[i];
        if (line === "") continue; //ignore blank lines
        if (!allowSpecialLines && (line.match(/^\s*\*[A-Za-z_]+\b/) || line.match(/^\s*#/))) continue; //ignore full command or option lines
        if (whitespace = line.match(/^\s+/g)) { //retain leading whitespace
          line = line.replace(/^\s+/g, "");
        }
        if ((line.substring(0, tagStart.length) === tagStart) && (line.substring(line.length - tagEnd.length, line.length) === tagEnd)) {
          line = line.substring(tagStart.length, line.length - tagEnd.length); //remove tags
        } else {
          line = tagStart + line + tagEnd; //add tags
        }
        whitespace = whitespace || "";
        text[i] = (whitespace + line);
      }
      text = text.join("\n");
    }
    editor.replaceSelection(text, cursorLoc);
    if (cursorLoc === "start") {
      editor.setCursor(editor.getCursor().line, editor.getCursor().ch + tagStart.length);
    }
  }

  var __csideTabs = {
    "game": {
      "id": "game",
      "title": "Game",
      "showTitle": true,
      "iconClass": "fa fa-cube",
      "href": ko.observable(""),
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ko.computed(function() {
        return (activeProject() ? activeProject().getName() : "Run a Project");
      }, this)
    },
    "issues": {
      "id": "issues",
      "title": "Issues",
      "showTitle": true,
      "iconClass": "fa fa-exclamation-triangle",
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ko.computed(function() {
        return (selectedProject() ? ("Issues with " + selectedProject().getName()) : "Select a Project");
      }, this)
    },
    "settings": {
      "id": "settings",
      "title": "Settings",
      "showTitle": false,
      "iconClass": "fa fa-cog",
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ""
    },
    "help": {
      "id": "help",
      "title": "Help & Information",
      "showTitle": true,
      "iconClass": "fa fa-question-circle",
      "href": "help/index.html",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": "Help & Information"
    },
    "dictionary": {
      "id": "dictionary",
      "title": "User Dictionary",
      "showTitle": true,
      "iconClass": "fa fa-book",
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": "User Dictionary"
    },
    "examples": {
      "id": "examples",
      "title": "Example Projects & Templates",
      "showTitle": true,
      "iconClass": "fa fa-lightbulb-o",
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": "Example Projects & Templates"
    }
  }
  self.tabs = ko.observableArray([]);

  if (usingNode) {

    self.cs_examples = [
      {
        title: "Interactive CSIDE Tutorial",
        desc: "A great starting point tutorial - developed by Vendetta. Useful for those new to both Choicescript and the Choicescript IDE.",
        path: "cs_examples/CSIDE Tutorial/"
      },
      {
        title: "ChoiceScript Basics Tutorial",
        desc: "A simple tutorial template by FairyGodfeather. This example project is designed to get you started with handling name, gender and relationship stats in your ChoiceScript games. A great starting point for any new project!",
        path: "cs_examples/Basics Tutorial/"
      },
      {
        title: "Pronouns with Gender-Neutral Options Template",
        desc: "A template for including gender neutral pronouns in your game (they/them), created by Lynnea Glasser. This includes a variable system to make sure your verbs and pronouns will match (\"They go on ahead\"/\"She goes on ahead\").",
        path: "cs_examples/GNO Pronoun Template/"
      },
      {
        title: "Editor Theme Configuration Template",
        desc: "An example script that customizes the custom editor theme.",
        path: "cs_examples/Theme Template/"
      }
    ];

    self.runExample = function(data) {
     __runProject(new CSIDEProject({ "path": data.path }));
    }

    self.cloneExample = function(data) {
      self.createProject("", function(err, project) {
        if (err) {
          notification("Error", err.message, {
            type: "error"
          });
          return;
        }
        __copyProjectTo(data.path, project.getPath(), function(err) {
          if (err) {
            notification("Error", err.message, {
              type: "error"
            });
            return;
          }
          project.openAllScenes();
          notification("Import Successful", data.title + " imported to " + project.getPath(), {
            type: "success"
          });
        });
      }, true);
    }
  }

  function __getTab(id) {
    var tabs = self.tabs();
    for (var i = 0; i < tabs.length; i++) {
      if (id === tabs[i].id) {
        return tabs[i];
      }
    }
    return null;
  }

  // obtain CSIDEHelp object for interacting with help and information tab
  function __getCSIDEHelp() {
    for (var i = 0; i < frames.length; i++)
      if (frames[i].csideHelp)
        return frames[i].csideHelp;
    return null;
  }

  var settings = {
    'editor': ko.observableArray([
      new CSIDESetting({
        "id": "smartindent",
        "name": "Smart Indentation",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Automatically indent (or dedent) the cursor after flow-control commands",
        "apply": function(val) {
          if (val) {
            editor.setOption("smartIndent", true);
          } else {
            editor.setOption("smartIndent", false);
          }
        }
      }),
      new CSIDESetting({
        "id": "linewrap",
        "name": "Line Wrapping",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Wrap lines that exceed the editor's width (no horizontal scrolling)",
        "apply": function(val) {
          if (val) {
            editor.setOption("lineWrapping", true);
            editor.on("renderLine", function(cm, line, elt) {
              var off = CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * editor.defaultCharWidth();
              var pixelTabSize = 8 * editor.options.tabSize;
              var indentLevel = off / pixelTabSize;
              var leftMargin = pixelTabSize * indentLevel;
              elt.style.paddingLeft = leftMargin + "px";
              elt.style.textIndent = "-" + (leftMargin / (indentLevel + 1)) + "px";
            });
            editor.refresh();
          } else {
            delete editor._handlers.renderLine;
            editor.setOption("lineWrapping", false);
            editor.refresh();
          }
        }
      }),
      new CSIDESetting({
        "id": "autosuggest",
        "name": "Auto Suggest",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Prompt quick-complete word suggestions as you type",
        "apply": function(val) {
          editor.setOption("autosuggest", val);
        }
      }),
      new CSIDESetting({
        "id": "autoformat",
        "name": "Auto Format",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Automatically replace certain character combinations with their formatted equivalents",
        "apply": function(val) {
          editor.setOption("autoformat", val);
        }
      }),
      new CSIDESetting({
        "id": "selection-match",
        "name": "Selection Match",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Highlight matching instances of selected text",
        "apply": function(val) {
          editor.setOption("highlightSelectionMatches", val);
          editor.forceSyntaxRedraw();
        }
      }),
      new CSIDESetting({
        "id": "spellcheck",
        "name": "Spell Check",
        "value": 2,
        "type": "variable",
        "cat": "editor",
        "options": [{
          "desc": "Exclude cmd lines",
          "value": 2
        }, {
          "desc": "Include cmd lines",
          "value": 1
        }, {
          "desc": "Off",
          "value": 0
        }],
        "desc": "Underline any mispelt words in the active scene text",
        "apply": function(val) {
          //conditional is handled in choicescript.js CodeMirror mode
          editor.setOption("spellcheck", val);
          editor.forceSyntaxRedraw();
        }
      }),
      new CSIDESetting({
        "id": "spell_dic",
        "name": "Spell Check Dictionary",
        "value": "en_US",
        "type": "variable",
        "cat": "editor",
        "options": [{
          "desc": "US",
          "value": "en_US"
        }, {
          "desc": "GB",
          "value": "en_GB"
        }],
        "desc": "The dictionary to spellcheck against",
        "apply": function(val) {
          typo = new Typo(val, typo._readFile("lib/typo/dictionaries/" + val + "/" + val + ".aff"), typo._readFile("lib/typo/dictionaries/" + val + "/" + val + ".dic"), {
            platform: 'any'
          });
          editor.forceSyntaxRedraw();
        }
      }),
      new CSIDESetting({
        "id": "visible-tabs",
        "name": "Visible Tabs",
        "value": false,
        "type": "binary",
        "cat": "editor",
        "desc": "Provides visible indentation levels when using Tabs as the indentation unit",
        "apply": function(val) {
          if (val) {
            document.getElementById("editor-wrap").classList.add("visible-tabs");
          } else {
            document.getElementById("editor-wrap").classList.remove("visible-tabs");
          }
        }
      }),
      new CSIDESetting({
        "id": "word-count",
        "name": "Word Count",
        "value": 2,
        "type": "variable",
        "cat": "editor",
        "desc": "Display the current scene's word and character counts at the bottom of the editor window",
        "options": [{
          "desc": "Exclude cmd lines",
          "value": 2
        }, {
          "desc": "Include cmd lines",
          "value": 1
        }, {
          "desc": "Off",
          "value": 0
        }],
        "apply": function(val) {
          wordCountOn(val > 0); // 0 == false? off
          editor.setOption("word_count", val > 0);
          editor.setOption("exclude_cmd_lines", (val > 1));
        }
      }),
      new CSIDESetting({
        "id": "tabtype",
        "name": "Tab Type",
        "value": "tabs",
        "type": "variable",
        "cat": "editor",
        "desc": "",
        "options": [{
          "desc": "Tabs",
          "value": "tabs"
        }, {
          "desc": "Spaces",
          "value": "spaces"
        }],
        "desc": "Sets the indentation unit (used by smart indent)",
        "apply": function(val) {
          if (val == "spaces") {
            editor.setOption("indentWithTabs", false);
            keymap["Tab"] = function(cm) {
              if (cm.somethingSelected()) {
                cm.indentSelection("add");
              } else {
                var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                cm.replaceSelection(spaces);
              }
            }
          } else {
            editor.setOption("indentWithTabs", true);
            keymap["Tab"] = function() {
              editor.execCommand("defaultTab");
            }
          }
        }
      }),
      new CSIDESetting({
        "id": "tabsize",
        "name": "Tab/Indent Block Size",
        "value": "4",
        "type": "variable",
        "cat": "editor",
        "options": [{
          "desc": "2",
          "value": "2"
        }, {
          "desc": "4",
          "value": "4"
        }, {
          "desc": "6",
          "value": "6"
        }, {
          "desc": "8",
          "value": "8"
        }],
        "desc": "The number of spaces to indent by, or the visual size of tabs (used by smart indent)",
        "apply": function(val) {
          var intVal = parseInt(val, 10);
          editor.setOption("indentUnit", intVal);
          editor.setOption("tabSize", intVal);
        }
      }),
      new CSIDESetting({
        "id": "fontsize",
        "name": "Font Size (px)",
        "value": "12px",
        "type": "variable",
        "cat": "editor",
        "options": [{
          "desc": "10",
          "value": "10px"
        }, {
          "desc": "12",
          "value": "12px"
        }, {
          "desc": "14",
          "value": "14px"
        }, {
          "desc": "16",
          "value": "16px"
        }],
        "desc": "The size of the font in the editor window",
        "apply": function(val) {
          $('#editor-wrap').css("font-size", val);
          editor.refresh();
        }
      }),
      new CSIDESetting({
        "id": "fontfamily",
        "name": "Font Family",
        "value": "'Century Gothic', AppleGothic, Arial, Helvetica, sans-serif",
        "type": "dropdown",
        "cat": "editor",
        "options": [{
          "desc": "Mono",
          "value": "'Courier New', Courier, monospace"
        }, {
          "desc": "Sans-Serif",
          "value": "Arial, Helvetica, sans-serif"
        }, {
          "desc": "Serif",
          "value": "'Times New Roman', Times, serif"
        }, {
          "desc": "Gothic",
          "value": "'Century Gothic', AppleGothic, Arial, Helvetica, sans-serif"
        }],
        "desc": "The font family used in the editor window",
        "apply": function(val) {
          $('#editor-wrap').css("font-family", val);
          editor.refresh();
        }
      }),
      new CSIDESetting({
        "id": "theme",
        "name": "Editor Theme",
        "value": "cs-light",
        "type": "dropdown",
        "cat": "editor",
        "options": [
          { "desc": "Dark", "value": "cs-dark"},
          { "desc": "Dichromatic", "value": "cs-dichromatic"},
          { "desc": "Light", "value": "cs-light"},
          { "desc": "Abcdef", "value": "abcdef"},
          { "desc": "Ambiance", "value": "ambiance"},
          { "desc": "Blackboard", "value": "blackboard"},
          { "desc": "Dracula", "value": "dracula"},
          { "desc": "Icecoder", "value": "icecoder"},
          { "desc": "Solarized", "value": "solarized"},
          { "desc": "Custom", "value": "cs-custom"}
        ],
        "desc": "Sets the colour and style of the editor window and its text",
        "apply": function(val) {
          //conditional is handled in choicescript.js CodeMirror mode
          if (val == "lesser-dark" || val == "choicescript" || val == "erlang-dark") {
            val = "cs-light";
          } //handle any old config values
          editor.setOption("theme", val);
          $("#code-footer, #cs-console").removeClass().addClass("CodeMirror cm-s-" + val);
        }
      })
    ]),
    "app": ko.observableArray([
      new CSIDESetting({
        "id": "version",
        "name": "Version: " + CSIDE_version,
        "value": "",
        "type": "variable",
        "options": [],
        "desc": "",
        "apply": function(val) {}
      }),
      new CSIDESetting({
        "id": "autosave",
        "name": "Autosave Scenes & Projects",
        "value": false,
        "type": "binary",
        "desc": "Save all unsaved changes automatically (every 5 minutes)",
        "apply": function(val) {
          if (typeof autoSaveFn != "undefined" && autoSaveFn) {
            clearInterval(autoSaveFn);
          }
          if (val) {
            autoSaveFn = setInterval(function() {
              ///var status = notification("Saving...", "Please wait", {closeWith: false, timeout: false});
              self.session.save(function(err) {
                if (err) {
                  bootbox.alert("<h3>Save Error</h3>" + err.message);
                }
                //status.close();
              });
            }, 300000);
          } else {}
        }
      }),
      new CSIDESetting({
        "id": "persist",
        "name": "Persistent Session",
        "value": false,
        "type": "binary",
        "desc": "Retain open scenes & project data between sessions",
        "apply": function(val) {
          if (val) {
            //self.updatePersistenceList(); causes issues
          }
        }
      }),
      new CSIDESetting({
        "id": "cmdhelp",
        "name": "Command Help (prompts & links)",
        "value": false,
        "type": "binary",
        "desc": "Commands in the editor window will link to their appropriate choicescriptdev.wikia page when double-clicked",
        "apply": function(val) {
          if (val) {
            $(".CodeMirror").off()
              .on('mouseover', '.cm-builtin, .cm-keyword', function() {
                //var text = $(this).html();
                //var commandName = text.match(/^\*[\w]+/)[0].substring(1, text.length); //regex = no spaces
                $(this).css("cursor", "pointer");
                $(this).attr("title", "Double-Click for help with this command");
                //$(this).attr("title", "Click for help on *" + commandName);
              })
              .on('mouseout', '.cm-builtin, .cm-keyword', function() {
                $(this).css("cursor", "");
                $(this).removeAttr("title");
              })
              .on('dblclick', '.cm-builtin, .cm-keyword', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var cmdEle = $(this).parent().children(":first-child");
                var text = cmdEle.text().trim();
                var commandName = text.match(/^\*[\w_]+/);
                if (!commandName) {
                  return;
                } else {
                  commandName = commandName[0].substring(1, text.length); //regex = no spaces
                }
                //frames[1].csideHelp.breadcrumbs = [{ 'url' : 'home.html', 'title': 'Home' }, { 'url' : $(this).attr('href'), 'title' : commandName }];
                //frames[1].csideHelp.history = ['home.html', $(this).attr('href')];
                //frames[1].csideHelp.drawPage('commands/' + commandName + '.html'); //CJW needs to not be a magic number?
                //__selectTab("help");
                var url = "http://www.choicescriptdev.wikia.com/" + commandName;
                if (usingNode) {
                  gui.Shell.openExternal(url); //Link to wiki command page directly
                } else {
                  window.open(url);
                }
              });
          } else {
            $(".CodeMirror").off();
          }
        }
      }),
      new CSIDESetting({
        "id": "night-mode",
        "name": "Night Mode",
        "value": false,
        "type": "binary",
        "desc": "Toggle between a light and dark application interface",
        "apply": function(val) {
          var help = __getCSIDEHelp();
          if (val) {
            $("body").addClass("night");
            if (help)
              $(help.document.body).addClass("night");
          }
          else {
            $("body").removeClass("night");
            if (help)
              $(help.document.body).removeClass("night");
          }
          uiColour(uiColour()); // refresh night/day shade
        }
      }),
      new CSIDESetting({
        "id": "project-path",
        "name": "Project Folder",
        "value": "default",
        "type": "custom",
        "options": [{
          "desc": "Select",
          "value": "select"
        }, {
          "desc": "Default",
          "value": "default"
        }, ],
        "desc": "",
        "apply": function(val) {
          var self = this;
          if (val == "default") {
            if (usingNode) {
              var userDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
            }
            var path = usingNode ? (userDir + "/Documents/Choicescript Projects/") : ("/Choicescript Projects/");
            self.setDesc(path);
            user.path = path;
          } else if (val == "select") {
            fh.selectFolder(function(path) {
              if (path) {
                /* this is a bit hacky, ideally I will improve settings management to allow for proper custom value settings CJW */
                path = __normalizePath(path); //deal with Windows backslashes etc.
                self.setValue(path);
                self.setDesc(path);
                user.path = path;
                config.settings[self.getCat()][self.getId()] = path;
                __updateConfig();
              }
            });
            //make sure 'select' isn't the option stored in config
            self.setValue(user.path);
            config.settings[self.getCat()][self.getId()] = user.path;
            __updateConfig();
          } else {
            self.setDesc(val);
            user.path = val;
          }
        }
      }),
      new CSIDESetting({
        "id": "update-channel",
        "name": "Update Channel",
        "value": "stable",
        "type": "variable",
        "options": [{
          "desc": "Stable",
          "value": "stable"
        }, {
          "desc": "Latest",
          "value": "latest"
        }, {
         "desc": "Development",
         "value": "development"
        }, {
          "desc": "None",
          "value": "none"
        }],
        "desc": "Speed and stability of the updates CSIDE will receive",
        "apply": function(channel) {
          var self = this;
          if (platform == "web-dropbox") {  // no update-channel on web version
            self.setVisibility(false);
            return;
          }
          if (typeof autoUpdateCheckFn != "undefined" && autoUpdateCheckFn) {
            clearInterval(autoUpdateCheckFn);
          }
          if (channel != "none" && usingNode) {
            var autoUpdate = function() {
              if (self.prompt && !self.prompt.closed) // prevent notification stacking
                return;
              var n = notification("", "<i class='fa fa-refresh fa-spin'></i> Checking for updates...", { closeWith: false, timeout: false });
              updater.checkForUpdates({
                cside: CSIDE_version,
                nw: nw_version
              }, channel, function(err, update) {
                n.close();
                if (err) {
                  notification("Connection Error", "Failed to obtain update data from server. " + err.message, { type: "error" });
                } else if (update) {
                  self.prompt = __showUpdatePrompt(channel, update);
                }
              });
            }
            autoUpdateCheckFn = setInterval(autoUpdate, 1000 * 60 * 60);
            autoUpdate();
          }
          else {}
        }
      }),
      new CSIDESetting({
        "id": "ui-colour",
        "name": "Colour Scheme",
        "value": "rgb(90, 90, 90)",
        "type": "variable",
        "desc": "",
        "options": [{
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(90, 90, 90)'></div>",
          "value": "granite"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(175, 93, 111)'></div>",
          "value": "garnet"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(147, 122, 175)'></div>",
          "value": "amethyst"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(107, 166, 125)'></div>",
          "value": "emerald"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(94,104,121)'></div>",
          "value": "slate"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(129,127,122)'></div>",
          "value": "sandstone"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(51, 164, 164)'></div>",
          "value": "jade"
        }, {
          "desc": "<div class='setting-colour-swatch' style='background-color: rgb(76,91,152)'></div>",
          "value": "sapphire"
        }],
        "apply": function(val) {
          var colour;
          switch (val) {
            case "granite":
              colour = "90,90,90";
              break;
            case "amethyst":
              colour = "147,122,175";
              break;
            case "garnet":
              colour = "175,93,111";
              break;
            case "emerald":
              colour = "60,100,80";
              break;
            case "slate":
              colour = "94,104,121";
              break;
            case "sandstone":
              colour = "129,127,122";
              break;
            case "jade":
              colour = "51,164,164";
              break;
            case "sapphire":
              colour = "76,91,152";
              break;
            default:
              colour = "90,90,90";
          }
          uiColour(colour);
        }
      })
    ]),
    "asObject": function(settingType) {
      if (typeof settings[settingType] != 'undefined') {
        var arr = settings[settingType]();
        var obj = {};
        for (var i = 0; i < arr.length; i++) {
          obj[arr[i].getId()] = arr[i].getValue();
        }
        return obj;
      } else {
        console.log("Invalid settings type passed to settings.asObject function.");
      }
    }
  };

  self.getEditorSettings = ko.computed(function() {
    return settings.editor().map(function(setting) {
      return setting.extAPI;
    });
  });
  self.getAppSettings = ko.computed(function() {
    return settings.app().map(function(setting) {
      return setting.extAPI;
    });
  });

  self.scenePanel = function(action) {
    if ($('#page-content-wrapper').is(':animated') || $('#sidebar').is(':animated')) {
      return;
    }
    var sidebarLeft = $('#sidebar').css("left");
    if (parseInt(sidebarLeft.slice(0, sidebarLeft.length - 2)) < 0) {
      $('#page-content-wrapper').animate({
        "left": 230
      }, 300, function() {
        editor.refresh();
      });
      $('#sidebar').animate({
        "left": 0
      }, 300, function() {
        editor.refresh();
      });
    } else {
      $('#page-content-wrapper').animate({
        "left": 0
      }, 300, function() {
        editor.refresh();
      });
      $('#sidebar').animate({
        "left": -230
      }, 300, function() {
        editor.refresh();
      });
    }
  }

  var consoleCmdBuf = [];
  var consoleCmdBufPtr = 0;
  var consoleIndicator = ko.observable(0);
  self.consoleInput = function(data, evt) {
    var consoleCommands = /^\*(console_)?(clear|track|untrack|track_all_off|track_all_on|track_list|help)/
    var validCSCommands = /^\*(?:set|temp|rand|achieve|restart|goto|goto_scene)/
    if (!evt) {
      return;
    }
    var element = evt.originalEvent.target;
    var input = element.value;
    if (evt.keyCode === 38) { //up arrow
      if (consoleCmdBuf.length <= 0) return;
      if (--consoleCmdBufPtr < 0) {
        consoleCmdBufPtr = (consoleCmdBuf.length - 1);
      }
      element.value = consoleCmdBuf[consoleCmdBufPtr];
    } else if (evt.keyCode === 40) { //down arrow
      if (consoleCmdBuf.length <= 0) return;
      if (++consoleCmdBufPtr > (consoleCmdBuf.length - 1)) {
        consoleCmdBufPtr = 0;
      }
      element.value = consoleCmdBuf[consoleCmdBufPtr];
    }
    if (!input || evt.keyCode !== 13) {
      return;
    }
    if (consoleCmdBuf.length > 9) {
      consoleCmdBuf.shift(); //keep no more than 10 entries
    }
    consoleCmdBuf.push(input);
    consoleCmdBufPtr = consoleCmdBuf.length;
    selectedProject().logToConsole(input, input.substring(0,1) == "*" ? "cm-builtin" : "cm-variable");
    // Must have a running game
    var gameFrame = document.getElementById("game-tab-frame").contentWindow || document.getElementById("#game-tab-frame");
    if (typeof gameFrame === 'undefined' || typeof gameFrame === 'undefined' || typeof gameFrame.stats === 'undefined') {
      selectedProject().logToConsole("Error: no choicescript game running", "cm-error");
      element.value = "";
      return;
    }
    // Prevent the confusing use of commands through non active project consoles
    if (selectedProject() != activeProject()) {
      selectedProject().logToConsole("Error: this project is not the one running", "cm-error");
      element.value = "";
      return;
    }
    try {
      var toks;
      if (input.match(/^\*/)) {
        if ((toks = input.match(validCSCommands)) || (toks = input.match(consoleCommands))) { //input is a command
          if (toks.length > 1) { //console_ command
            if (toks[1] !== "console_") {
              input = ("*console_" + input.substring(1, input.length));
            }
          }
          if (input.match(/^\*goto/)) {
            if (input.match(/^\*goto\s+/)) {
              input = input.replace(/^\*goto\s+/, ""); //convert *goto label into (*goto_scene) current_scene label
              gameFrame.stats.scene.CSIDEConsole_goto(input);
            } else {
              input = input.replace(/^\*goto_scene\s+/, "");
              gameFrame.stats.scene.CSIDEConsole_goto_scene(input);
            }
          } else if (!gameFrame.stats.scene.runCommand(input)) {
            selectedProject().logToConsole("Error: an unknown error occured whilst attempting to execute that command", "cm-error");
          }
        } else {
          selectedProject().logToConsole("Error: invalid console command", "cm-error");
        }
      } else { //assume expression:
        var stack = gameFrame.stats.scene.tokenizeExpr(input);
        var result = gameFrame.stats.scene.evaluateExpr(stack);
        if (typeof result === "string") {
          result = '"' + result + '"';
        } else if (!result) {
          result = "false";
        }
        selectedProject().logToConsole(result, "output"); //←
      }
    } catch (e) {
      //strip error scene & line num - as the information is irrelevant
      e.message = e.message.replace(/line [0-9]+ of\s\w+: /, "");
      selectedProject().logToConsole("Error: " + e.message, "cm-error");
    }
    element.value = "";
  }
  self.tabPanel = function(action) {
    if ($('.left-wrap').is(':animated') || $('.right-wrap').is(':animated')) {
      return;
    }

    function calcWidth(ele) {
      var width = ele.width();
      var parentWidth = ele.offsetParent().width();
      var percent = 100 * width / parentWidth;
      return percent;
    }

    var isOpen = true;
    if (calcWidth($('.left-wrap')) > 60) {
      isOpen = false;
    }

    if (action == "close" && isOpen || !action && isOpen) {
      $('.right-wrap').animate({
        right: '-50%'
      }, 500, function() {
		editor.refresh();
	  });
      $('.left-wrap').animate({
        width: '100%'
      }, 500, function() {
        editor.refresh();
      });
      $("#expand-collapse-bar").addClass("collapsed");
    } else if (action == "open" && !isOpen || !action && !isOpen) {
      $('.left-wrap').animate({
        width: '50%'
      }, 500, function() {
		editor.refresh();
	  });
      $('.right-wrap').animate({
        right: '0%'
      }, 500, function() {
        editor.refresh();
      });
      $("#expand-collapse-bar").removeClass("collapsed");
    } else {
      return isOpen;
    }
  }

  // used by nodeCSIDE.js drag/drop file opening
  self.openScene = function(path, callback) {
    __openScene(path, callback);
  }
  self.openFileBrowser = function() {
    if (usingNode) {
      var chooser = $("#getFilePaths");
      chooser.off().change(function(evt) {
        var selection = $(this).val().split(";");
        if (selection.length === 1 && selection[0] === "") {
          return;
        }
		$(this).val("");
        __openScenes(selection, true);
      });
      chooser.trigger("click");
    } else {
      fileBrowser.open(function(selection) {
        if (selection.length < 1) {
          return;
        }
        selection = selection.filter(function(file) {
            return !file.isFolder();
          })
          .map(function(file) {
            return file.path;
          });
        __openScenes(selection, true);
      });
    }
  }

  function __openScenes(paths, selectLast) {
      var lastIndex = selectLast ? (paths.length - 1) : paths.length;
      for (var i = 0; i < lastIndex; i++) {
        __openScene(paths[i], function() {});
      }
      if (selectLast) {
        __openScene(paths[lastIndex], function(err, scene) {
          if (!err) scene.select();
        });
      }
    }
    /* 	self.pinScene = function(scene) {
    		var x = scene.document.linkedDoc();
    		self.noteEditor.swapDoc(x);
    		self.noteEditor.refresh();
    	} */
  self.spellCheck = function(word) {
    if (editor.options.spellcheck)
      return typo.check(word) || userDictionary.check(word.toLowerCase()) || word.match(/^\d+$/);
    return true; //always OK
  }
  userDictionary = {
    "persistentList": {
      //always ignore these words
    },
    "persistentListArray": ko.observableArray([
      //for GUI display
    ]),
    "sessionList": {
      //for this session only
    },
    "add": function(word, list) {
      //CJW needs to only allow WORDS i.e. add a regex match
      userDictionary[list + "List"][word.toLowerCase()] = true;
      userDictionary.update(list);
    },
    "remove": function(word, list) {
      if (userDictionary[list + "List"]) {
        delete userDictionary[list + "List"][word];
      }
      userDictionary.update(list);
    },
    "check": function(word) {
      var pList = this.persistentList;
      var sList = this.sessionList;
      if (sList[word] || pList[word]) {
        return true;
      } else {
        return false;
      }
    },
    "load": function() {
      try {
        userDictionary.persistentList = JSON.parse(localStorage.getItem("userDictionary")) || {};
        for (var i in userDictionary.persistentList) {
          if (userDictionary.persistentList.hasOwnProperty(i)) {
            userDictionary.persistentListArray.push(i);
          }
        }
      } catch (err) {
        if (err) {
          //no userDictionary.json file - write it:
          userDictionary.update();
        } else {
          bootbox.alert("Sorry, there was a problem loading or parsing your user dictionary data.<br>" + "If you're seeing this message frequently please file a bug report.");
        }
      }
    },
    "update": function(list) {
      if (typeof list == 'undefined' || list == "persistent") {
        var newDictionary = JSON.stringify(userDictionary.persistentList, null, "\t");
        localStorage.setItem("userDictionary", newDictionary);
        userDictionary.persistentListArray.removeAll();
        for (var i in userDictionary.persistentList) {
          if (userDictionary.persistentList.hasOwnProperty(i)) {
            userDictionary.persistentListArray.push(i);
          }
        }
      }
      editor.forceSyntaxRedraw();
    }
  }
  self.dictWord = ko.observable("");
  self.addToDictionary = function(obj, e) {
    if (e.type == "click" || e.type == "keyup" && e.keyCode == 13) {
      if (!self.dictWord().match(/^([A-Za-z\u00C0-\u00FF\u0100-\u017F]+'[A-Za-z\u00C0-\u00FF\u0100-\u017F]+|[A-Za-z\u00C0-\u00FF\u0100-\u017F]{2,}|[AaI]'?)$/)) { //word chars, accented chars, apostrophes
        bootbox.alert("<h3>Error</h3>Unable to add to user dictionary: not a word!");
        return;
      }
      userDictionary.add(self.dictWord(), "persistent");
      self.dictWord("");
    }
  };
  self.removeFromDictionary = function(word) {
    if (userDictionary.persistentList.hasOwnProperty(word)) {
      userDictionary.remove(word, "persistent");
    }
  };
  self.getDictionaryArray = ko.computed(function() {
    return userDictionary.persistentListArray().sort();
  }, this);
  self.init = function() {
    if (!usingNode) {
      user.name = "dropbox-user";
    }
    if (config.settings.app.persist) {
      var thisProjectData = [];
      for (var i = 0; i < config.openProjects.length; i++) {
        thisProjectData = config.openProjects[i];
        var project = new CSIDEProject(thisProjectData);
        __addProject(project);
        for (var n = 0; n < thisProjectData.openScenes.length; n++) {
          var scene = new CSIDEScene(thisProjectData.openScenes[n]);
          project.addScene(scene);
          scene.load();
        }
      }
      for (var e = 0; e < config.tabs.length; e++) {
        self.tabs.push(__csideTabs[config.tabs[e]]);
      }
    }
    var scope = settings.editor();
    for (var i = 0; i < scope.length; i++) {
      var val = typeof config.settings.editor[scope[i].getId()] != 'undefined' ? config.settings.editor[scope[i].getId()] : defaultConfig.settings.editor[scope[i].getId()];
      scope[i].setValue(val);
    }
    scope = settings.app();
    for (var i = 0; i < scope.length; i++) {
      var val = typeof config.settings.app[scope[i].getId()] != 'undefined' ? config.settings.app[scope[i].getId()] : defaultConfig.settings.app[scope[i].getId()];
      scope[i].setValue(val);
    }

    // load userDictionary
    userDictionary.load();

    // ensure the tab panel starts open and on the 'help' tab
    __selectTab("help");

    // hook post-update behaviour here
    if (config.justUpdated || typeof config.justUpdated === "undefined") {
      config.justUpdated = false;
      __updateConfig();
	  var n = notification("Updated to v" + CSIDE_version, "A full list of changes can be found under 'Changelog' in the help and information tab.", {
		buttons: [{ addClass: 'btn btn-default', text: 'Show Changelog',
			onClick: function(note) {
				var csideHelp = __getCSIDEHelp();
				if (csideHelp) {
					csideHelp.breadcrumbs = [{ 'url' : 'home.html', 'title': 'Home' }, { 'url' : 'changelog.md', 'title' : 'Changelog' }];
					csideHelp.history = ['home.html', 'changelog.md'];
					csideHelp.drawPage('changelog.md');
				}
				note.close();
			}
		}]
	  });
	  n.setTimeout(5000);
	  __getCSIDEHelp();
	}
  }

  //animations
  self.slideUpAndOut = function(elem) {
    $(elem).parent().find("ul").remove();
    $(elem).animate({
      minHeight: 0,
      height: 0,
      padding: 0
    }, 400, function() {
      $(elem).remove();
    })
  };
  self.slideDownAndIn = function(elem) {
    $(elem).hide().slideDown(400)
  };
  self.fadeIn = function(elem) {
    $(elem).hide().fadeIn("fast")
  };
  self.fadeOutAndUp = function(elem) {
    $(elem).animate({
      opacity: 0,
      height: 0,
      padding: 0
    }, 400, function() {
      $(elem).remove();
    })
  };

  self.showWordCount = function(sceneOrProject) {
    var incWordCount = sceneOrProject.getWordCount();
    var exWordCount = sceneOrProject.getWordCount(true);
    var charCount = sceneOrProject.getCharCount();
	var type = sceneOrProject.constructor.name.substring("CSIDE".length, sceneOrProject.constructor.name.length);
	var selectedTitle = (type == "Scene") ? "Currently Selected Text (this scene)" : "Currently Selected Text (in all scenes)";
    var title = (type + " - " + sceneOrProject.getName());
	var msg = "<h5>Word Count</h5> \
		    Including command lines: " + sceneOrProject.getWordCount() +
      "<br>Excluding command lines: " + sceneOrProject.getWordCount(true);
    msg += "<br>Characters: " + sceneOrProject.getCharCount();
	incWordCount = sceneOrProject.getWordCount(false, true);
	exWordCount = sceneOrProject.getWordCount(true, true);
	charCount = sceneOrProject.getCharCount(true);
	msg += "<br><br><h5>" + selectedTitle + "</h5> \
				Words including command lines: " + incWordCount +
	  "<br>Words excluding command lines: " + exWordCount +
	  "<br>Characters: " + charCount;
    msg += "<br><br>Please note that these figures are only approximations.<br>Project word counts only include those of open scenes.";
    bootbox.alert({message: msg, title: title});
  }

  function __createImageScene(project, path) {

    var image = new Image();

    image.onload = function() {
      var canvas = document.createElement('canvas');
      var fileExt = getFileExtension(path);
      var imgSceneName = (CONST_IMG_PREFIX + getLastDirName(path).replace(fileExt, "")).replace(/\s/g, "_").toLowerCase();
      var scenePath = (project.getPath() + imgSceneName + ".txt");
      canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
      canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size
      if (canvas.width <= 0 && canvas.height <= 0) {
        notification("Image Import Failed", path, {
          type: 'error'
        });
        return;
      }
      canvas.getContext('2d').drawImage(image, 0, 0);
      sceneExists(imgSceneName, project, function(exists) {
        if (exists) {
          bootbox.prompt({
            title: "That Image Already Exists - Copy & Paste Code Below",
            value: "*gosub_scene " + imgSceneName,
            callback: function(result) {}
          });
        } else {
          var newScene = new CSIDEScene({
            "path": scenePath,
            "source": platform
          });
          var dataUrl = canvas.toDataURL(); //'image/' + fileExt
          newScene.setText("*comment ENCODED IMAGE FILE - DO NOT EDIT\n*comment source: " + path + "\n*comment usage: *gosub_scene " + newScene.getName() + "\n*image " + dataUrl + "\n*return");
          newScene.save(null, null, function(err) {
            if (err) {
              bootbox.alert(err.message);
            } else {
              notification("Image Import Successful", "", {
                type: 'success'
              });
              bootbox.prompt({
                title: "Copy & Paste Code Below",
                value: "*gosub_scene " + newScene.getName(),
                callback: function(result) {}
              });
            }
          });
        }
      });
    }
    image.onabort = image.onerror = function() {
      notification("Image Import Failed", path, {
        type: 'error'
      });
    }
    image.src = "file://" + path;
  }

  function __promptForString(callback, title, placeholder) {
    bootbox.prompt({
      title: title || "Please enter text",
      value: placeholder || "",
      callback: function(str) {
        if (typeof str != "string") {
          callback("");
        }
        else {
          callback(__trimWhitespace(str));
        }
      }
    });
  }

  /* blank is an optional boolean, default is false: creates with startup & choicescript_stats */
  self.createProject = function(projectName, cb, blank) {
    blank = blank || false;
    if (typeof cb != "function")
      cb = function(err, project) { if (!err) notification("Project created", project.getPath(), { type: 'success', layout: 'bottomRight' }); };
    function __create(projectName) {
      validName(projectName, true, function(valid, err) {
        if (valid) {
          projectExists(user.path + projectName, function(exists) {
            if (!exists) {
              __createProject(projectName, cb, blank);
            }
            else {
              notification("Project Naming Error", "A Project with that name already exists in the project directory", { type: "error" });
            }
          });
        } else {
          notification("Project Naming Error", err, { type: "error" });
        }
      });
    }
    if (typeof projectName != "string" || projectName == "") {
      __promptForString(function(str) {
          if (str)
            __create(str);
      }, "Name of Project?");
    }
    else {
      __create(projectName);
    }
  }

  // ╔═╗┬─┐┬┬  ┬┌─┐┌┬┐┌─┐  ╔═╗┌─┐┌─┐┌─┐┌─┐
  // ╠═╝├┬┘│└┐┌┘├─┤ │ ├┤   ╚═╗│  │ │├─┘├┤
  // ╩  ┴└─┴ └┘ ┴ ┴ ┴ └─┘  ╚═╝└─┘└─┘┴  └─┘

  function addNewScene(project, name) {
    if (typeof project !== "object") return;
    var sceneName = name || "untitled";
    generateName(sceneName);

    function generateName(newName) {
      sceneExists(newName, project, function(exists) {
        if (exists) {
          var n = newName.substring(newName.lastIndexOf("_") + 1, newName.length);
          if (isNaN(n)) {
            n = 0;
          } else {
            n = (parseInt(n) + 1)
          };
          generateName("untitled_" + n);
        } else {
          var scenePath = project.getPath() + newName + '.txt';
          var newScene = new CSIDEScene({
            "path": scenePath,
            "source": platform,
            "readOnly": project.isReadOnly()
          });
          project.addScene(newScene);
          newScene.save(null, null, function(err) {
            if (err) {
              bootbox.alert(err.message);
            } else {
              newScene.load(function(err, scene) {
                if (!err) scene.select();
              });
            }
          });
        }
      });
    }
  }

  function __addProject(project) {
    if (project instanceof CSIDEProject) {
      projects.unshift(project);
      return;
    }
    bootbox.alert("Error: Unable to add non-CSIDE Project.");
  }

  /* blank is an optional boolean, default is false: if true, startup & choicescript_stats scenes are not created */
  function __createProject(projectName, cb, blank) {
    blank = blank || false;
    function createProjectFolder(cpf_cb) {
      var projectPath = user.path + (projectName + '/');
      fh.makeDir(projectPath, function(err) {
        if (err && err.code == "EEXIST") {
          bootbox.alert("Error: That Project folder could not be created because it already exists.");
          cpf_cb(true);
        } else if (err) {
          bootbox.alert("Error: Unable to create the project folder, check your permissions.");
          cpf_cb(true);
        } else {
          cpf_cb(false, projectPath);
        }
      });
    }
    createProjectFolder(function(err, projectPath) {
      if (err) {
        cb(err);
      }
      var project = new CSIDEProject({
        'name': projectName,
        'path': projectPath,
        'source': platform
      });
      __addProject(project);
      var startupContents = "*title " + projectName + "\n*author " + user.name + "\n*comment your code goes here\n*finish";
      //var globalContents = "*comment This is a global scene file, any code added to this file will be appended to each and every other file upon project compilation (aside from startup + choicescript_stats)";
      var scenes = blank ? [] : [
        new CSIDEScene({
          'path': projectPath + 'choicescript_stats.txt',
          'contents': "",
          'source': platform
        }),
        new CSIDEScene({
          'path': projectPath + 'startup.txt',
          'contents': startupContents,
          'source': platform
        })
        //new CSIDEScene({'path': projectPath + 'global.txt', 'contents': globalContents, 'source': platform})
      ];
      scenes.forEach(function(scene, index) {
        scene.save(null, null, function(err) {
          if (err) {
            bootbox.alert(err.message);
            return;
          }
          project.addScene(scene);
          scene.load(function(err, scene) {
            if (!err) {
              scene.select();
            }
          });
        });
      });
      cb(null, project);
    });
  }

  function __saveSceneTo(scene, callback) {
    var chooser = $('#saveSceneTo');
    chooser.attr("nwsaveas", scene.getName() + ".txt."); //default name, no idea why it needs the trailing . but it does
    chooser.off().change(function(evt) {
      var savePath = $(this).val();
      if (!savePath) return;
      fs.writeFile(savePath, scene.document.getValue(), function(err) {
        if (err) {
          bootbox.alert(err.message);
          return;
        } else {
          //success doesn't do anything (as our original version may still be dirty etc)
        }
      });
    });
    setTimeout(function() {
      chooser.trigger('click');
    }, 200);
  }

  function __openScene(sceneDataOrPath, callback) {
    if (typeof sceneDataOrPath === "string") {
      var newScene = new CSIDEScene({
        "path": sceneDataOrPath,
        "source": platform
      });
    }
    /*else if (typeof path === "object" && typeof sceneOrPath.path === "string") {
        var newScene = new CSIDEScene(sceneDataOrPath);
    }*/
    else {
      throw new Error("Error: Bad sceneData or scenePath - cannot be resolved into scene.");
      return;
    }
    var sceneProjectPath = getProjectPath(newScene.getPath());
    var sceneProject = projectIsOpen(sceneProjectPath);
    if (!sceneProject) {
      sceneProject = new CSIDEProject({
        "path": sceneProjectPath,
        "source": platform
      });
      __addProject(sceneProject);
    } else {
      if (sceneAlreadyOpen(newScene.getName(), sceneProject)) {
        newScene.select();
        return; //should we callback?
      }
    }
    sceneProject.addScene(newScene);
    newScene.load(callback);
  }

  function hasClass(el, cls) { //https://gist.github.com/jjmu15/8646098
    return el.className && new RegExp("(\\s|^)" + cls + "(\\s|$)").test(el.className);
  }

  function getSceneName(scenePath) {
    var sceneName = getLastDirName(scenePath);
    return sceneName.substring(0, sceneName.length - 4); //gets rid of .txt extension ... => USED to .toLowerCase(), but it caused problems with capitals in *scene_list (keep an eye!)
  }

  function getLastDirName(path) {
    if ((path.charAt(path.length - 1) == "/" || path.charAt(path.length - 1) == "\\") && path.length > 2)
      path = path.substring(0, path.length - 1);
    if (path.lastIndexOf("/") != -1) {
      var divider = "/";
    } else {
      var divider = "\\";
    }
    return path.substring(path.lastIndexOf(divider) + 1, path.length);
  }

  function getFileExtension(scenePath) {
    return scenePath.substring(scenePath.lastIndexOf("."), scenePath.length);
  }

  function getProject(projectPath) {
    for (var n = 0; n < projects().length; n++) {
      if (projects()[n].getPath() === projectPath) {
        return projects()[n];
      }
    }
    return null; //project doesn't exist
  }

  function getProjectPath(scenePath) {
    return scenePath.substring(0, scenePath.lastIndexOf("/") + 1);
  }

  function sceneAlreadyOpen(sceneName, project) {
    var scenes = project.getScenes();
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].getName() === sceneName) {
        return scenes[i];
      } else if (i === scenes.length - 1) {
        return false;
      }
    }
  }

  function projectIsOpen(projectPath) {
    for (var i = 0; i < projects().length; i++) {
      if (projects()[i].getPath() === projectPath) {
        return projects()[i];
      } else if (i === projects().length - 1) {
        return false;
      }
    }
  }

  function validName(name, allowSpaces, callback) {
    var err;
    var valid = false;
    if (!name || name === "" || /^\s*$/.test(name)) {
      err = "Name required";
    } else if (!name.match(/^[\w-\s]+$/) && allowSpaces) {
      err = "Name contains invalid characters."; //Please use only letters, spaces, numbers, underscores and hypens
    } else if (!name.match(/^[\w-]+$/) && !allowSpaces) {
      err = "Name contains invalid characters."; // Please use only letters, numbers, underscores and hypens
    } else if (name.toUpperCase().match(reservedSceneNames)) {
      err = "That name is reserved";
    } else {
      valid = true;
    }
    callback(valid, err);
  }

  function __trimWhitespace(str) {
    str = str.trim() //cull preceding and trailing whitespace
    str = str.replace(/\s{2,}/g, " "); //remove repetitive whitespace
    return str;
  }

  function __wordCount(string, exclCommandLines) {
    exclCommandLines = exclCommandLines || false;
    var wordCount = 0;
    if (exclCommandLines) {
      var nonCommandLines = string.replace(/\*.+$/gm, "");
      nonCommandLines.replace(/^\s+|\s+$/g, "").split(/\s+/).length;
      wordCount = nonCommandLines.replace(/^\s+|\s+$/g, "").split(/\s+/).length;
    } else {
      wordCount = string.replace(/^\s+|\s+$/g, "").split(/\s+/).length; //split remaining lines into words
    }
    if (wordCount === 1 && string === "") {
      wordCount = 0;
    }
    return wordCount;
  }

  function __copyProjectTo(oldPath, newPath, callback) {
    fh.readDir(oldPath, function(err, filenames) {
      if (err) {
        callback(err);
        return;
      }
      filenames = filenames.filter(function(file) {
        return (getFileExtension(file) === ".txt");
      });
      var count = filenames.length;
      for (var i = 0; i < filenames.length; i++) {
        fh.copyFile((oldPath + filenames[i]), (newPath + filenames[i]), function(err, data) {
          if (err) {
            callback(err);
            return;
          } else if (--count === 0) {
            callback(null);
          }
        });
      }
    });
  }

  function __openFolder(path) {
    if (usingNode) {
      gui.Shell.openItem(path);
    } else {
      fileBrowser.open(path, function(selection) {
        if (selection.length < 1) {
          return;
        }
        selection = selection.filter(function(file) {
            return !file.isFolder();
          })
          .map(function(file) {
            return file.path;
          });
        __openScenes(selection, true);
      });
    }
  }

  function projectExists(projectPath, callback) {
    fh.stat(projectPath, function(err, stat) {
      if (err && err.code == 404) {
        callback(false);
      } else if (stat.isRemoved !== 'undefined' && stat.isRemoved == true) {
        callback(false);
      } else {
        callback(true);
      }
    });
  }

  function sceneExists(sceneName, project, callback) {
    var scenePath = project.getPath() + sceneName + '.txt';
    fh.stat(scenePath, function(err, stat) {
      if (err && err.code == 404) {
        callback(false);
      } else if (stat.isRemoved !== 'undefined' && stat.isRemoved == true) {
        callback(false);
      } else {
        callback(true);
      }
    });
  }

  function __closeProject(project, ask) {
    if (!project.isDirty()) {
      if (project === selectedProject()) {
        if (selectedProject() == activeProject()) {
          activeProject(null);
        }
        selectedScene("");
        editor.setValue("");
        __getTab("game").href("");
      }
      projects.remove(project);
      __updatePersistenceList();
    } else {
      bootbox.confirm("This project has unsaved scenes, are you sure you wish to close it?", function(result) {
        if (result) {
          if (project === selectedProject()) {
            if (selectedProject() == activeProject()) {
              activeProject(null);
            }
            selectedScene("");
            editor.setValue("");
            __getTab("game").href("");
          }
          projects.remove(project);
          __updatePersistenceList();
        } else {
          return;
        }
      });
    }
  }

  function __testSceneIndentation(scene) {
    var tabs = false;
    var spaces = false;
    var lines = scene.getText().split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\t+/))
        tabs = true;
      else if (lines[i].match(/^\s+/))
        spaces = true;
      if (spaces && tabs) {
        bootbox.confirm("<h3>Warning</h3><p><b>" + scene.getName() + ".txt</b> of <b>" + scene.getProject().getName() + "</b> uses both tabs and spaces for indentation. Would you like the IDE to automatically normalize all indents to your settings preference?</p>", function(result) {
          if (result) {
            __normalizeSceneIndentation(scene);
          }
        });
        break;
      }
    }
  }

  function __normalizeSceneIndentation(scene, indentUnit) {
    var tabSize = settings.asObject("editor")["tabsize"];
    indentUnit = indentUnit || settings.asObject("editor")["tabtype"];
    var lines = scene.getText().split("\n");
    if (indentUnit == "spaces") {
      for (var i = 0; i < lines.length; i++) {
        var oldIndent = lines[i].match(/^\t+/);
        if (oldIndent) {
          var newIndent = "";
          for (var c = 0; c < oldIndent[0].length * tabSize; c++)
            newIndent += " ";
          lines[i] = lines[i].replace(/^\t+/, newIndent);
        }
      }
    } else if (indentUnit == "tabs") {
      for (var i = 0; i < lines.length; i++) {
        var oldIndent = lines[i].match(/^\s+/);
        if (oldIndent) {
          var newIndent = "";
          for (var c = 0; c < oldIndent[0].length / tabSize; c++)
            newIndent += "\t";
          lines[i] = lines[i].replace(/^\s+/, newIndent);
        }
      }
    } else {
      throw new Error("Scene Normalization: Bad indent unit: " + indentUnit);
    }
    scene.setText(lines.join("\n"));
  }

  function __testProject(project, test) {
    if (test != "random" && test != "quick") {
      alert("Error: no such test as " + test + "test!");
      return;
    }
    if (typeof project === "undefined" || project === "") {
      alert("Error: no project given to " + test + "test!");
      return;
    }
    var path = ("node_modules/cside-choicescript/" + test + "test.html");
    activeProject(project);
    if (platform === "web-dropbox") {
      project.test_win = window.open(path, "Quicktest", "toolbar=0,location=0,status=0,menubar=0,scrollbars,resizable,width=500,height=400");
      project.test_win.addEventListener("beforeunload", function(event) {
        project.test_win = null;
      });
      setTimeout(function() {
        project.test_win.title = test.toUpperCase() + "TEST - " + project.getName();
      }, 200);
    } else {
      if (project.test_win) {
        //re-run (open)
        project.test_win.close();
        project.test_win = null;
        __testProject(project, test);
      } else {
        nw.Window.open(path, {
          focus: true,
          width: 500,
          height: 500,
          title: ""
        }, function(test_win) {
          project.test_win = test_win;
          test_win.on("closed", function() {
            //project.test_win.leaveFullscreen();
            project.test_win.hide();
            project.test_win.close(true);
            project.test_win = null;
          });
        });
      }
    }
    //__reloadTab(self.tabs()[0], "lib/choicescript/" + test + "test.html");
  }

  function __openAllProjectScenes(project) {
    var projectPath = project.getPath();
    fh.readDir(projectPath, function(err, filepaths) {
      load(err, filepaths);
    });

    function load(err, filepaths) {
      if (err) {
        console.log(err);
      } else {
        __openScenes(filepaths.filter(function(filepath) {
            return (getFileExtension(filepath) === ".txt" && !filepath.match(CONST_IMG_PREFIX)); //only .txt files, ignore img scenes
          }, false)
          .map(function(filepath) {
            return (projectPath + filepath);
          })
        );
      }
    }
  }

  function __reloadTab(tab, path) { //refreshes iframe tabs, or changes target if second param is passed
    var href = path || tab.href();
    tab.href('');
    tab.href(href);
  }

  function __selectTab(id) {
    $("#tabs").tabs("option", "active", $("#" + id).index() - 1);
  }

  function __runProject(project) {
    __shortCompile(project, function(err, allScenes) {
      if (err) {
        bootbox.alert("<h3>Compilation Error</h3>" + err.message);
        console.log(err);
      } else {
        cside.allScenes = allScenes;
        notification("Running", project.getName(), {
          timeout: 2000
        });
        activeProject(project);
        __reloadTab(__getTab("game"), 'run_index.html?restart=true');
        cside.tabPanel("open");
        __selectTab("game");
      }
    });
  }

  var loadedSceneJS = false;

  function __shortCompile(project, cb, transpile) {
    var statusBox = notification("Compiling... ", project.getName(), {
      closeWith: false,
      timeout: false
    });
    var allScenes = {};
    var failed = false;
    var projectPath = project.getPath();

    getProjectFileList();

    function getProjectFileList() {
      fh.readDir(projectPath, function(err, fileNames) {
        if (err) {
          statusBox.close();
          return cb(err);
        }
        var fileNames = fileNames.filter(function(fileName) {
          return (getFileExtension(fileName) === ".txt");
        });
        var count = fileNames.length;
        fileNames.forEach(function(fileName, index) {
          fh.readFile(projectPath + fileName, function(err, data) {
            if (failed) return;
            if (err) {
              failed = true;
              statusBox.close();
              if (err.code == 404)
                err = new Error("File not found: " + fileName);
              return cb(err);
            }
            if (err = addScene(fileName, data)) {
              statusBox.close();
              return cb(err);
            }
            if (--count == 0) {
              statusBox.close();
              cb(null, allScenes);
            }
          });
        });
        if (failed) {
          statusBox.close();
          return cb(err);
        }
      });
    }

    function addScene(fileName, data) {
      var scene = new Scene();
      var sceneName = getSceneName(fileName);
      try {
        scene.loadLines(data);
      } catch (err) {
        statusBox.close();
        return new Error(err.message + " - " + sceneName + ".txt");
      }
      if (transpile) {
        var changes = [];
        for (var lineNum = 0; lineNum < scene.lines.length; lineNum++) {
          var command = /^\s*\*(\w+)(.*)/.exec(scene.lines[lineNum]);
          if (!command)
            continue;
          else if (cse[command[1]]) {
            var block_size = 1;
            while (scene.getIndent(scene.lines[lineNum + block_size]) > scene.getIndent(scene.lines[lineNum]))
              block_size++;
            //Array.prototype.splice.apply(scene.lines, [lineNum, block_size].concat(cse[command[1]].transpile(scene, command[2])));
            changes.push({
              targetLine: lineNum,
              targetLength: block_size,
              change: cse[command[1]].transpile(scene, command[2], lineNum, block_size)
            });
          }
        }
        // reintegrate the changes
        for (var c = 0; c < changes.length; c++) {
          Array.prototype.splice.apply(scene.lines, [changes[c].targetLine, changes[c].targetLength].concat(changes[c].change));
        }
      }
      allScenes[sceneName] = {};
      allScenes[sceneName].crc = scene.temps.choice_crc;
      allScenes[sceneName].labels = scene.labels;
      allScenes[sceneName].lines = scene.lines;
      return false;
    }
  }

  var cse = {
    "getFreeLabelName": function(scene, prefix) {
      for (var i = 0; i < prefix; i++) {
        if (typeof scene.labels[prefix + ("_" + i)] === 'undefined')
          break;
      }
      return (prefix + ("_" + i));
    },
    "while": {
      "transpile": function(scene, expr, line, block_size) {
        var lines = [];
        var label = cse.getFreeLabelName(scene, "while_loop");
        lines.push("*label " + label);
        lines.push("*if" + expr);
        lines = lines.concat(scene.lines.slice(line + 1, line + block_size));
        lines.push("\t*goto " + label);
        return lines;
      }
    }
  }

  function __fullCompile(project, path) {
    __shortCompile(project, function(err, allScenes) {
      fh.readFile("compile_head.txt", function(err, headContents) {
        fh.readFile("compile_tail.txt", function(err, tailContents) {
          fh.writeFile(path + project.getName() + ".html", headContents + "<script>allScenes = " + JSON.stringify(allScenes) + "</script>" + tailContents, function(err) {
            if (err) {
              throw new Error("Export failed!");
            } else {
              var buttons = [{
                addClass: 'btn btn-default',
                text: 'Show Folder',
                onClick: function(note) {
                  __openFolder(path);
                  note.close();
                }
              }]
              var n = notification("Game Exported Successfully", project.getName(), {
                type: "success",
                buttons: buttons
              });
              n.setTimeout(10000);
            }
          });
        });
      });
    });
  }

  function __rollbackUpdate() {
    updater.restore(function(err) {
      if (err) {
        notification("Warning - Rollback failed: Package Corrupt", err.message, {
          type: "error", timeout: 10000
        });
      } else {
        notification("Rollback Succesful", "The previous app package has been restored");
      }
    });
  }

  function __update(channel) {
    if (updating) return; //don't allow simultaneous updates
    var status = notification("Downloading Update", "Do not close the program", { progress: true, closeWith: false, timeout: false });
    var eventHandlers = {
      progress: function(val) {
        if (!isNaN(val)) {
         status.setProgress(val);
        }
      },
      error: function(title, msg) {
        notification(title, msg, { type: "error" });
      }
    }
    updating = true;
    updater.update(channel, eventHandlers, function(err) {
      status.close();
      updating = false;
      if (err) {
        notification("Update Failed", err.message, { type: "error", timeout: 10000 });
        __rollbackUpdate();
      } else {
        config.justUpdated = true;
        __updateConfig();
        notification("Update Complete", "Please restart the application.", { closeWith: false, timeout: false, type: "success" });
      }
    });
  }

  function __showUpdatePrompt(channel, update) {
    var buttons = [{
      addClass: 'btn btn-default',
      text: 'Download',
      onClick: function(note) {
        note.close();
        __update(channel);
      }
    },
    {
      addClass: 'btn btn-default',
      text: 'Cancel',
      onClick: function(note) {
        note.close();
      }
    }];
    return notification("Update Available on " + (channel.charAt(0).toUpperCase() + channel.slice(1)), update.desc, { closeWith: false, timeout: false, buttons: buttons, type: (channel === "development") ? "warning" : "default" });
  }

  function __updateConfig() {
    var newConfig = JSON.stringify(config, null, "\t");
    localStorage.setItem("CSIDE_appConfig", newConfig);
  }

  function __updatePersistenceList() {
    config.openProjects = [];
    config.tabs = [];
    var thisProject;
    for (var i = 0; i < projects().length; i++) {
      thisProject = {
        "path": projects()[i].getPath(),
        "source": projects()[i].getSource(),
        "name": projects()[i].getName(),
        "expanded": projects()[i].isExpanded(),
        "openScenes": []
      };
      var thisScene;
      for (var n = 0; n < projects()[i].getScenes().length; n++) {
        thisScene = {
          "path": projects()[i].getScenes()[n].getPath(),
          "source": projects()[i].getScenes()[n].getSource(),
          //"readOnly": projects()[i].getScenes()[n].isReadOnly(),
          "color": projects()[i].getScenes()[n].getMarkColour()
        }
        thisProject.openScenes.push(thisScene);
      }
      config.openProjects.unshift(thisProject);
    }
    for (var e = 0; e < self.tabs().length; e++) {
      config.tabs[e] = self.tabs()[e].id;
    }
    __updateConfig();
  }
  self.updatePersistenceList = function() {
    __updatePersistenceList();
  }
  self.makeSortable = function(data) {
    __makeSortable(data);
  }

  /*
    arg.item - the actual item being moved
    arg.sourceIndex - the position of the item in the original observableArray
    arg.sourceParent - the original observableArray
    arg.sourceParentNode - the container node of the original list
    arg.targetIndex - the position of the item in the destination observableArray
    arg.targetParent - the destination observableArray
    arg.cancelDrop - this defaults to false and can be set to true to indicate that the drop should be cancelled.
  */
  function dragSceneEvent(arg, event, ui) {
    console.log(arg, arg.item, arg.targetParent, arg.targetParent(), event, ui, ui.target);
    console.log();
    if (arg.sourceParent == arg.targetParent)
      return;

    var targetProject = ko.dataFor(event.target);
    var movingScene = arg.item;
    arg.cancelDrop = true;

    function execute(action) {
      sceneExists(arg.item.getName(), targetProject, function(exists) {
        if (exists) {
          $(ui.sender).sortable('cancel');
          arg.cancelDrop = true;
          bootbox.alert("This project already has a scene by that name.");
        } else {
          action();
        }
      });
    }
    bootbox.dialog({
      message: "Would you like to <b>move</b> or <b>copy</b> this scene to this project?",
      title: "What would you like to do?",
      buttons: {
        copy: {
          label: "Copy",
          className: "btn-primary",
          callback: function() {
            execute(function() {
              movingScene.copyTo(targetProject);
            });
          }
        },
        move: {
          label: "Move",
          callback: function() {
            execute(function() {
              movingScene.moveTo(targetProject);
            });
          }
        },
        cancel: {
          label: "Cancel",
          callback: function() {
          }
        }
      }
    });
  }

  self.dragSceneEvent = dragSceneEvent;

  ko.bindingHandlers.bindIframe = {
    init: function(element, valueAccessor) {
      function bindIframe() {
        try {
          var iframeInit = element.contentWindow.initChildFrame,
            iframedoc = element.contentDocument.body;
        } catch (e) {
          // ignored
        }
        if (iframeInit)
          iframeInit(ko, valueAccessor());
        else if (iframedoc) {
          ko.applyBindings(valueAccessor(), iframedoc);
        }
      };
      bindIframe();
      ko.utils.registerEventHandler(element, 'load', bindIframe);
    }
  };
  ko.bindingHandlers.enableTextInput = {
    init: function(element, valueAccessor) {
      // Initially set the element to be disabled
      $(element).prop("readOnly", true);
    },
    update: function(element, valueAccessor) {
      // Whenever the value subsequently changes, slowly fade the element in or out
      // var value = valueAccessor();
      //element.readOnly = ko.utils.unwrapObservable(valueAccessor());
      $(element).prop("readOnly", !ko.utils.unwrapObservable(valueAccessor()));
    }
  }
  ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
      // Initially set the element to be instantly visible/hidden depending on the value
      var value = valueAccessor();
      $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function(element, valueAccessor) {
      // Whenever the value subsequently changes, slowly fade the element in or out
      var value = valueAccessor();
      ko.utils.unwrapObservable(value) ? $(element).show().animate({
        'opacity': 1
      }, 250) : $(element).animate({
        'opacity': 0
      }, 250, function() {
        $(this).hide();
      });
    }
  };
  ko.bindingHandlers.fadeAndSlideVisible = {
    init: function(element, valueAccessor) {
      // Initially set the element to be instantly visible/hidden depending on the value
      var value = valueAccessor();
      $(element).toggle(ko.unwrap(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function(element, valueAccessor) {
      // Whenever the value subsequently changes, slowly fade the element in or out
      var value = valueAccessor();
      ko.unwrap(value) ? $(element).slideDown(500).animate({
        'opacity': 1
      }, {
        queue: false,
        duration: 350
      }) : $(element).slideUp(500).animate({
        'opacity': 0
      }, {
        queue: false,
        duration: 350
      });
    }
  };
  ko.bindingHandlers.initFiles = {
    init: function(element, valueAccessor) {
      $(element).draggable({
        cursor: "move",
        cursorAt: {
          left: 5,
          top: 5
        },
        scroll: true,
        start: function(event, ui) {
          //selection.push($(this));
          ui.helper.appendTo($('body'));
        },
        helper: function() {
          var newElement = $("<div></div>");
          newElement.addClass("helper");
          newElement.text($('folder.selected').length);
          return $(newElement);
        }
      });
    },
    update: function(element, valueAccessor, allBindings) {
      // Leave as before
    }
  };
  ko.bindingHandlers.initFolders = {
    init: function(element, valueAccessor) {
      $(element).droppable({
          accept: ".file, .folder-ul",
          over: function(event, ui) {
            $(this).css("background-color", "#F7F7E1");
          },
          out: function(event, ui) {
            $(this).css("background-color", "");
          },
          drop: function(event, ui) {
            $(this).delay(100).fadeOut().fadeIn('slow');
            var targetFolder = $(this);
            $('.folder-selected').each(function() {
              moveDropboxItem($(this), targetFolder);
            });
          }
        })
        .draggable({
          cursor: "move",
          cursorAt: {
            left: 5,
            top: 5
          },
          scroll: true,
          start: function(event, ui) {
            //selection.push($(this));
            ui.helper.appendTo($('body'));
          },
          helper: function() {
            var newElement = $("<div></div>");
            newElement.addClass("helper");
            return $(newElement);
          }
        });
    },
    update: function(element, valueAccessor, allBindings) {
      // Leave as before
    }
  }

  if (!usingNode) {
    function fileBrowser() {
      //key events
      var shiftPressed = false;
      var ctrlPressed = false;
      $(document).keydown(function(e) {
        if (e.keyCode == 17) {
          e.preventDefault();
          ctrlPressed = true;
        }
        if (e.keyCode == 16) {
          e.preventDefault();
          shiftPressed = true;
        }
      });
      $(document).keyup(function(e) {
        if (e.keyCode == 17) {
          e.preventDefault();
          ctrlPressed = false;
        }
        if (e.keyCode == 16) {
          e.preventDefault();
          shiftPressed = false;
        }
      });
      //end key events
      var self = this;
      var visible = ko.observable(false);
      var loading = ko.observable(false);
      var curPath = ko.observable("");
      var buttonText = ko.observable("Open");
      var browserTitle = ko.observable("Open scenes");
      var stateDesc = ko.observable("");
      var error = ko.observable(false);
      self.getButtonText = ko.computed(function() {
        return buttonText();
      }, this);
      self.getBrowserTitle = ko.computed(function() {
        return browserTitle() + ": " + curPath();
      }, this);
      self.isVisible = ko.computed(function() {
        return visible();
      }, this);
      self.isLoading = ko.computed(function() {
        return loading();
      }, this);
      self.getStateDesc = ko.computed(function() {
        return stateDesc();
      }, this);
      self.hasErrored = ko.computed(function() {
        return error();
      }, this);
      self.path = ko.computed(function() {
        return curPath();
      }, this);
      self.selectingFolder = false;
      self.filesAndFolders = ko.observableArray([]);
      self.selection = ko.observableArray([]);

      function fileFolderItem(data) {
        var thisFileFolder = this;
        thisFileFolder.is_folder = (data[".tag"] == "folder") || data.isFolder || data.is_folder;
        thisFileFolder.name = data.name;
        thisFileFolder.path = data.path;
        thisFileFolder.icon = data.icon ? data.icon : data.isFolder ? 'fa fa-folder-o fa-lg' : 'fa fa-file-o fa-lg';
        thisFileFolder.selected = ko.observable(false);
        thisFileFolder.index = data.listIndex;
        thisFileFolder.select = function(data, event, forcedValue, skipKeyCheck) {
          if (!skipKeyCheck) {
            var selectedList = self.selection();
            var fullList = self.filesAndFolders();
            if (!ctrlPressed && !shiftPressed && selectedList.length > 0) {
              for (var s in selectedList) {
                fullList[selectedList[s].index].selected(false);
              }
              self.selection([]);
            } else if (shiftPressed) {
              selectedList.sort(function(a, b) {
                return a.index - b.index
              }); //sort our selection array, so it's in sync with visual shift select
              var topToBottom = false;
              if (self.selection() < 1) {
                for (var i = 0; i < thisFileFolder.index; i++) {
                  fullList[i].select({}, {}, true, true);
                }
              } else {
                //are we top to bottom or bottom to top
                for (var i = 0; i < thisFileFolder.index; i++) {
                  if (fullList[i].selected()) { //bottom to top
                    topToBottom = true;
                    break;
                  }
                }
                if (topToBottom) {
                  for (var i = selectedList[0].index; i < thisFileFolder.index; i++) {
                    if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
                  }
                } else {
                  for (var i = selectedList[selectedList.length - 1].index; i > thisFileFolder.index; i--) {
                    if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
                  }
                }
              }
            }
          }
          forcedValue ? thisFileFolder.selected(forcedValue) : thisFileFolder.selected() ? thisFileFolder.selected(false) : thisFileFolder.selected(true);
          self.selection.push(thisFileFolder);
        }
        if (data.isFolder) {
          thisFileFolder.open = function() {
            self.redraw(thisFileFolder.path);
          }
        } else {
          thisFileFolder.open = function() {
            if (typeof self.callback == "function") {
              self.selection = ko.observableArray([thisFileFolder]);
              self.executeTask();
            } else {
              self.close();
            }
          }
        }
        thisFileFolder.dateModified = data.modifiedAt || "";
        if (thisFileFolder.dateModified != "") {
          var parsedDate = {};
          parsedDate.day = data.modifiedAt.getDate();
          parsedDate.month = data.modifiedAt.getMonth();
          parsedDate.year = data.modifiedAt.getFullYear();
          parsedDate.hours = data.modifiedAt.getHours();
          parsedDate.mins = data.modifiedAt.getMinutes();
          if (parsedDate.mins.toString().length < 2) {
            parsedDate.mins = '0' + parsedDate.mins.toString();
          }
          thisFileFolder.dateModified = " - last modified at " + parsedDate.day + '/' + parsedDate.month + '/' + parsedDate.year + ' at ' + parsedDate.hours + ':' + parsedDate.mins;
        }
        thisFileFolder.isFolder = function() {
          return thisFileFolder.is_folder;
        }
      }
      this.cancel = function() {
        if (typeof self.callback === "function") {
          self.callback([]);
        }
        self.close();
      }
      this.close = function() {
        var selectedList = self.selection();
        var fullList = self.filesAndFolders();
        for (var s in selectedList) {
          fullList[selectedList[s].index].selected(false);
        }
        self.selection([]);
        self.callback = null;
        self.selectingFolder = false;
        visible(false);
      }
      this.open = function(path, callback) {
        if (typeof path == "function") {
          callback = path;
          path = "";
        }
        if (self.selectingFolder) {
          buttonText("Select");
          browserTitle("Select a Folder");
        } else {
          buttonText("Open");
          browserTitle("Open scenes");
        }
        self.callback = callback;
        path = path || curPath();
        self.redraw(path);
        visible(true);
      }
      this.redraw = function(path) {
        stateDesc('Connecting...');
        loading(true);
        error(false);
        curPath(path);
        self.filesAndFolders([]);
        self.selection([]);
        var position = 0;
        fh.readDir(path, function(err, listStats) {
          if (err) {
            error(true);
            stateDesc("Failed to connect. Please check your internet connection.");
          } else {
            if (curPath() != "/" && curPath() != "") {
              //backup option
              var array = curPath().split("/");
              array.pop(); //remove deepest folder
              var parentPath = array.join("/");
              self.filesAndFolders.push(new fileFolderItem({
                "name": "Up a level",
                "path": parentPath,
                "isFolder": true,
                "icon": 'fa fa-level-up fa-lg',
                'listIndex': position
              }));
              position++;
            }
            for (var i = 0; i < listStats.length; i++) {
              if (!listStats[i].isFolder && getFileExtension(listStats[i].path) != '.txt') continue; //ignore anything but folders and .txt files
              listStats[i].listIndex = position;
              if (!self.selectingFolder || listStats[i].isFolder) { //don't list files when mode is set to selecting a folder
                position++;
                self.filesAndFolders.push(new fileFolderItem(listStats[i]));
              }
            }
          }
          loading(false);
        }, true);
      }
      this.selectFolders = function(callback) {
        self.selectingFolder = true;
        self.open("", callback);
      }
      this.executeTask = function() {
        /* 				var fullList = self.filesAndFolders();
        				var selectedList = self.selection();
        				for (var s in selectedList) {
        					fullList[selectedList[s].index].open();
        				} */
        if (!self.selectingFolder && (self.selection().length == 1 && self.selection()[0].isFolder()))
          self.selection()[0].open(); //special case for opening folders with 'open' button
        else {
          self.callback(self.selection());
          self.close();
        }
      };
    }
  }
  if (!usingNode) {
    var fileBrowser = new fileBrowser();
    ko.applyBindings(fileBrowser, $('#file-browser-canvas')[0]);
    self.webFileBrowserClosed = ko.computed(function() {
      return !fileBrowser.isVisible();
    });
  }

  function contextMenu(newTarget, newOptions) {
    var self = this;
    var target = newTarget;
    var options = newOptions;
    self.getTitle = function() {
      return title;
    }
    self.getOptions = ko.computed(function() {
      return options();
    }, this);
    self.getTarget = function() {
      return target;
    }
  }

  function menuOption(newLabel, newAction, newSubMenu) {
    var self = this;
    var label = newLabel;
    var action = newAction;
    var subMenu = newSubMenu;

    self.getLabel = function() {
      return label;
    }
    self.getSubMenuOptions = function() {
      return subMenu;
    }
    self.doAction = action;
  }
  var fileMenuOptions = ko.observableArray([
    new menuOption("Open Scene", function(menu) {
      menu.getTarget().open();
    })
  ]);
  var folderMenuOptions = ko.observableArray([
    new menuOption("Open Folder", function(menu) {
      menu.getTarget().open();
    })
  ]);

  if (platform !== "mac_os") {
    function toolbarMenu(data) {
      var menu = this;
      var title = ko.observable(data.title || "");
      var expanded = ko.observable(false);
      menu.isActive = data.active || true;
      menu.getTarget = data.target;
      menu.doAction = function(option) {
        expanded(false);
        option.doAction(menu);
      }
      menu.isExpanded = ko.computed(function() {
        return expanded();
      }, this);
      menu.toggle = function(force) {
        if (typeof force === "boolean") {
          expanded(force)
        } else {
          expanded() ? expanded(false) : expanded(true);
        }
      }
      menu.getTitle = function() {
        return title();
      }();
      menu.getOptions = ko.computed(function() {
        return data.options();
      }, this);
    }

    var toolbarMenus = ko.observableArray(
      [
        new toolbarMenu({
          title: "<span title='Project' class='fa fa-folder-open-o '>",
          active: self.getSelectedProject,
          options: ko.computed(function() {
            return (new contextMenu(selectedProject(), projectMenuOptions).getOptions())
          }, this),
          target: ko.computed(function() {
            return selectedProject()
          }, this)
        }),
        new toolbarMenu({
          title: "<span title='Scene' class='fa fa-file-text-o'>",
          active: self.getSelectedScene,
          options: ko.computed(function() {
            return (new contextMenu(selectedScene(), sceneMenuOptions).getOptions())
          }, this),
          target: ko.computed(function() {
            return selectedScene()
          }, this)
        })
      ]
    );
    self.getToolbarMenus = ko.computed(function() {
      return toolbarMenus();
    }, this);
  }

  //ACCESSOR METHODS

  function CSIDE_ContextMenu() {
    var self = this;
    self.isReady = function() {
      return true;
    }
    var menu = ko.observable();
    self.getContextMenu = ko.computed(function() {
      return menu();
    }, this);
    $(function() {
      if (usingNode) {
        function Menu(cutLabel, copyLabel, pasteLabel) {
          var gui = require('nw.gui'),
            menu = new nw.Menu(),
            cut = new nw.MenuItem({
              label: cutLabel || "Cut",
              click: function() {
                document.execCommand("cut");
              }
            }),
            copy = new nw.MenuItem({
              label: copyLabel || "Copy",
              click: function() {
                document.execCommand("copy");
              }
            }),
            paste = new nw.MenuItem({
              label: pasteLabel || "Paste",
              click: function() {
                document.execCommand("paste");
              }
            }),
            indent = new nw.MenuItem({
              label: pasteLabel || "Indent",
              click: function() {
                editor.execCommand("indentMore");
              }
            }),
            dedent = new nw.MenuItem({
              label: pasteLabel || "Dedent",
              click: function() {
                editor.execCommand("indentLess");
              }
            }),
            select = new nw.MenuItem({
              label: "Select all",
              click: function() {
                editor.execCommand("selectAll");
              }
            }),
            comment = new nw.MenuItem({
              label: "Toggle block comment",
              click: function() {
                insertTextTags("*comment ", "", true);
              }
            }),
            dblLinebreak = new nw.MenuItem({
              label: "Insert double line break",
              click: function() {
                editor.replaceSelection("\n*line_break\n*line_break\n", "end");
                editor.focus();
              }
            });

          menu.append(cut);
          menu.append(copy);
          menu.append(paste);
          menu.append(indent);
          menu.append(dedent);
          menu.append(select);
          menu.append(dblLinebreak);
          menu.append(comment);

          return menu;
        }
        $(".CodeMirror-scroll").on("contextmenu", function(e) {
          e.preventDefault();
        }); //prevent default context menu
        $("body").on("contextmenu", ".CodeMirror-code", function(e) {
          var menu = new Menu( /* pass cut, copy, paste labels if you need i18n*/ );
          e.preventDefault();
          menu.popup(e.originalEvent.x, e.originalEvent.y);
        });
      }
    });
    //project & scene context menus
    $(function() {
      $('#sidebar').contextmenu({
        target: '#context-menu',
        scopes: '.project-header',
        before: function(event, element) {
          var project = ko.dataFor(element.parent().get(0));
          menu(new contextMenu(project, projectMenuOptions));
          return true;
        }
      });
      $('#main-project-wrap').contextmenu({
        target: '#context-menu',
        scopes: '.scene',
        before: function(event, element) {
          var scene = ko.dataFor(element.get(0));
          if (scene.getErrState() || !scene.hasLoaded() || scene.isSaving() || scene.isLocked()) //disallow allow context-menus for unloaded scenes etc
            return false;
          menu(new contextMenu(scene, sceneMenuOptions));
          return true;
        }
      });
      $('#file-browser-ul').contextmenu({
        target: '#context-menu',
        scopes: '.file',
        before: function(event, element) {
          var fileFolder = ko.dataFor(element.get(0));
          if (fileFolder.isFolder())
            menu(new contextMenu(fileFolder, folderMenuOptions));
          else
            menu(new contextMenu(fileFolder, fileMenuOptions));
          return true;
        }
      });
      $('.CodeMirror-code').contextmenu({
        target: '#context-menu',
        scopes: '.cm-spell-error',
        before: function(e, element) {
          if (typo.working) return;
          typo.working = true;
          var menuElement = this.getMenu()[0];
          menu(new contextMenu(null, ko.observableArray([new menuOption("Working...", function() {})]))); //blank is better than an old context menu
          var pos = editor.coordsChar({
            "left": e.originalEvent.x,
            "top": e.originalEvent.y
          });
          editor.setCursor(pos); //manually position the cursor as the context menu prevents default
          //var tok = editor.getTokenAt(pos);
          var wordCoords = editor.findWordAt(pos);
          editor.setSelection(wordCoords.anchor, wordCoords.head);
          var word = element.text();
          /*if (word != editor.getRange(wordCoords.anchor, wordCoords.head)) {
						return false; //word clicked and word found do not match, abort.
					}*/
          var menuOptions = ko.observableArray([]);

          function replaceText(text, undo) {
            editor.replaceSelection(text); //, wordCoords.anchor, wordCoords.head);
            if (undo) {
              editor.getDoc().undo();
            }
            editor.focus();
          }
          typo.suggest(word, 5, function(suggestions) {
            if (suggestions.length < 1) {
              menuOptions.push(new menuOption("No suggestions for " + word, function(menu) {}));
            }
            for (var i = 0; i < suggestions.length; i++) {
              (function(i) {
                var thisSuggestion = suggestions[i];
                menuOptions.push(new menuOption(thisSuggestion, function(menu) {
                  replaceText(thisSuggestion, false);
                  editor.focus();
                }));
              })(i);
            }
            //defaults
            menuOptions.push(new menuOption("Ignore '" + word + "' this session", function() {
              userDictionary.add(word, "session");
              editor.focus();
            }));
            menuOptions.push(new menuOption("Add '" + word + "' to user dictionary", function() {
              userDictionary.add(word, "persistent");
              editor.focus();
            }));
            typo.working = false;
            menu(new contextMenu(null, menuOptions));
            //Horrible DOM hack to force menu to show upwards
            var offsetBottom = window.innerHeight - menuElement.offsetTop;
            if (offsetBottom < (25 * menuOptions().length))
              menuElement.style.top = (menuElement.style.top.slice(0, menuElement.style.top.length - 2) - (18 * menuOptions().length)) + "px";
          });
          return true;
        }
      });
    });
  }

  var myContextMenuViewModel = new CSIDE_ContextMenu();
  ko.applyBindings(myContextMenuViewModel, $('#context-menu')[0]);

}

window.cside = new IDEViewModel();
ko.applyBindings(cside, $('.main-wrap')[0]);
cside.init();
//label finding regex: cside.projects()[0].scenes()[0].document.getValue().match(/\^*label.+$/gm,"");
