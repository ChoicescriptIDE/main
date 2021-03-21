//var ko = require('knockout');

//var BootstrapMenu = require('bootstrap-menu');

var amdRequire = require;
amdRequire.config({
  baseUrl: 'node_modules/monaco-editor/release/min'
});

//are we using node?
if (typeof nw === "object") {
  require = nodeRequire;
  require.nodeRequire = require;

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
    bootbox.alert("<h3>Uncaught Exception <span aria-hidden=\"true\">=(</span></h3><p>" + err.message + "\
        </p><p>Something went (unexpectedly!) wrong.<br/>Please close \
        and restart the application (then report this!).");
    try {
      fs.appendFileSync(gui.App.dataPath + '/cside-errors.txt', new Date(Date.now()) + ": " + err.message + "\n" + err.stack + "\n");
    } catch (err) { /* Failed to write to error log */ }
  });
} else {
  window.usingNode = false;
  var getDirName = function(path) { return path.substring(0, path.lastIndexOf("/") + 1); }
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
    target.subscribe(function(val) {
      option.func(val);
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
    self.getSearchResults = ko.computed(function() {
      return ko.utils.arrayMap(scenes(), function(scene) {
        return scene.getSearchResults();
      }).filter(function(sceneResults) { return sceneResults.getResults().length > 0; });
    }, this);
    self.replaceAllScenesSearchResults = function() {
      var _scenes = scenes();
      for (var s = 0; s < _scenes.length; s++) {
        _scenes[s].replaceAllSearchResults();
      }
    }
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
      monaco.editor.colorize(log, "choicescript").then(function(formatString) {
        if (typeof type != "string")
          type = "";
        if (console_logs().length > 999) {
          console_logs.shift(); //limit entries
        }
        if (meta) {
          if (typeof meta.scene === "string" && typeof meta.line === "number") {
            console_logs.push({
              value: formatString,
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
            value: formatString,
            type: type || "null"
          });
        }
        if (!consoleOpen() && type != "system")
          unreadLogs(unreadLogs() < 8 ? unreadLogs() + 1 : "9+"); //unsafe type mix...?
      });
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
    self.searchByEnterKey = function(data, event, domObj) {
      if (event.type == "keyup" && SEARCH.CONF.searchOnType())
        return self.search("", "", SEARCH.MODES.SEARCH) || true; // allow the char input to take place
      else if (event.type != "keydown")
        return true;
      if (event.keyCode == 13) {
        if (!event.ctrlKey) {
          return self.search("", "", SEARCH.MODES.SEARCH) && false; // don't allow the Enter press to affect the textarea
        } else { // match monaco's in-model search linebreak behaviour (ctrl+enter)
          event.target.value += "\n";
          event.target.scrollTop = event.target.scrollHeight;
        }
      }
      return true;
    }
    self.search = function(searchStr, replaceStr, newSearchMode) {
      var curSearchMode = (typeof newSearchMode === "number") ? newSearchMode : searchMode();
      if (typeof searchStr != "string" || searchStr === "")
        searchStr = document.getElementById("searchBox").value;
      if (curSearchMode === SEARCH.MODES.REPLACE) {
        replaceStr = replaceStr || document.getElementById("replaceBox").value;
        bootbox.confirm(self.getSearchResultDesc() + "<br>Replace them with '" + replaceStr + "'?",
          function(result) {
            if (result) {
              scenes().forEach(function(scene) { scene.search(searchStr, replaceStr, false /* forceExpand */, curSearchMode); });
            }
          }
        );
      }
      else {
        scenes().forEach(function(scene) {
          /* Once a Scene's results tab has been manually expanded it is likely that the user wishes to continue to see those results, so we'd rather
             not have them re-collapse on every re-search. However, there's the issue of performance (and screen estate) when multiple scene's with large
             result sets are left open.
             So, what we do here is make the collapse/expand state for each scene remain honoured *up until* it returns 0 results,
             implying that it is no longer relevant.
             This essentially adds a natural 'reset' that makes sure scenes are re-collapsed scenes over time, rather than expecting the user to close them,
             whilst still allowing for a user to view result changes in their scenes of interest.
          */
          var forceExpand = scene.getSearchResults() && (scene.getSearchResults().keepOpen() && scene.getSearchResults().getLength() > 0);
          scene.search(searchStr, replaceStr, forceExpand, curSearchMode);
        });
      }
      return false; // prevent form submission
    }
    self.getSearchResultCount = function() {
      var count = 0;
      for (var i = 0; i < self.getSearchResults().length; i++)
        count += self.getSearchResults()[i].getLength();
      return count;
    }
    self.getSearchResultDesc = function() {
      return ("Found " + self.getSearchResultCount() + " results in " + self.getSearchResults().length + " scene(s).");
    }
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
    self.dispose = function() {
      scenes().forEach(function(scene) {
        scene.dispose(); // clean up the monaco models
      });
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
    self.closeScene = function(scene, callback) {
        function closeScene() {
          if (selectedScene() == scene) {
            selectedScene(null);
          }
          self.removeScene(scene);
          __updatePersistenceList();
          scene.dispose();
          if (typeof callback === 'function') callback(true);
        }
        if (scene.isDirty()) {
          bootbox.confirm("This scene has unsaved changes, are you sure you wish to close it?", function(result) {
            if (result) {
              closeScene();
            } else {
              if (typeof callback === 'function') callback(false);
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
                    addClass: 'btn',
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
      var issue = new csideIssue({
        project: self,
        scene: scene,
        desc: err.message,
        lineNum: err.lineNumber
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

  function CSIDESearchResults(data) {
    var self = this;
    var searchTerm = data.searchTerm || "";
    var searchResults = ko.observableArray(data.results || []).extend({ rateLimit: 500 });
    var keepOpen = data.keepOpen || false; // TODO
    var expanded = ko.observable(data.expanded || false)
      .extend({callFunc: { func: function(expand) {
        // Create search result descriptions as they become visible.
        if (expand)
          self.createResultDescriptions();
        }}
      });
    var versionId = data.versionId || null; // state of editor when search initiated
    var scene = data.scene || null;

    self.getResults = ko.computed(function() {
      return searchResults();
    }, this);
    self.isExpanded = ko.computed(function() {
      return expanded();
    }, this);
    self.getLength = function () {
      return searchResults().length;
    }
    self.getLengthString = function() {
      var len = self.getLength();
      return len >= 999 ? "999+" : len.toString();
    }
    self.getScene = function() {
      return scene;
    }
    self.getVersionId = function() {
      return versionId;
    }
    self.getSearchTerm = function() {
      return searchTerm;
    }
    self.keepOpen = function() {
      return keepOpen;
    }
    self.expand = function(expand, stayOpen) {
      if (typeof expand === "boolean") {
        expanded(expand);
      }
      else {
        expanded(!expanded());
      }
      keepOpen = expanded() ? (stayOpen || false) : false;
    }
    /* Determines before/after line text for the search result to provide context. */
    self.createResultDescriptions = function() {
      var SEARCH_MAX_LINE_LEN = 30;
      var descriptiveResults = searchResults(); // matches.match.matches
      for (var i = 0, result = descriptiveResults[i]; i < descriptiveResults.length; result = descriptiveResults[++i]) {
        // preceding match
        result.preText = result.range.startColumn > 0 ?
          scene.getLineContent(result.range.startLineNumber).slice(0, result.range.startColumn-1) : "";
          if (result.preText.length > SEARCH_MAX_LINE_LEN)
            result.preText = "…" + result.preText.slice(result.range.startColumn-(SEARCH_MAX_LINE_LEN+1),result.range.startColumn-1);
        // post match
        var endLineLen = scene.getLineLength(result.range.endLineNumber);
        result.postText = result.range.endColumn < endLineLen ?
          scene.getLineContent(result.range.endLineNumber).slice(result.range.endColumn-1, endLineLen) : "";
        if (result.postText.length > SEARCH_MAX_LINE_LEN)
          result.postText = result.postText.slice(0,SEARCH_MAX_LINE_LEN) + "…";
        // replace text
        result.replaceText = document.getElementById("replaceBox").value || "";
        if (SEARCH.CONF.useRegex())
          result.replaceText = monaco.cside.parseReplaceString(result.replaceText).buildReplaceString(descriptiveResults[i].matches, SEARCH.CONF.preserveCase());
      }
      searchResults(descriptiveResults);
    }
    // Only (re-)create result descriptions if they're visible.
    if (scene && expanded) {
      self.createResultDescriptions();
    }
  }

  function CSIDEScene(sceneData) {
    var self = this;
    //INSTANCE VARIABLES
    var edModel; // holds the Monaco editor document model
    self.dispose = function() { edModel.dispose(); };
    var path = ko.observable(__normalizePath(sceneData.path)).extend({
      normalizePaths: "",
      callFunc: {
        func: function(newPath) {
          // automatically replace the Monaco model on renames to keep its Uri in sync
          var oldModel = edModel;
          try {
            edModel = monaco.editor.createModel(edModel ? edModel.getValue() : "", "choicescript", monaco.Uri.file(newPath));
            edModel.csideScene = self;
            if (oldModel) oldModel.dispose();
            if (selectedScene() == self) vseditor.setModel(edModel);
            edModel.onDidChangeContent(updateOnModelEdit);
          } catch (err) {
            bootbox.alert("Unrecoverable Error: Couldn't update URI for scene.<br><br>" + err.message + ".<br><br> Please restart the application and report this.");
          }
        }
      }
    });
    var name = ko.observable("").extend({
      lowerCase: ""
    });
    name(getFileName(path()));
    var isImportant = name().toUpperCase().match(reservedSceneNames);
    var source = sceneData.source || platform; //won't change - so doesn't need to be an observable?
    var loaded = ko.observable(false);
    var locked = ko.observable(false);
    var readOnly = ko.observable(sceneData.readOnly || false); //app relative files are always read-only
    var editing = ko.observable(false);
    var colouring = ko.observable(false);
    var saving = ko.observable(false);
    var inErrState = ko.observable(false);
    var errStateMsg = ko.observable("");
    var searchVersionId = null;
    var searchResults = ko.observable(new CSIDESearchResults({results: []}))
      .extend({ rateLimit: { rateLimit: 1000, method: "notifyWhenChangesStop" }});

    // create initial model
    var edModel = monaco.editor.createModel(sceneData.contents || "", "choicescript", monaco.Uri.file(path()));
    edModel.onDidChangeContent(updateOnModelEdit);
    edModel.csideScene = self;

    // used for dirtyness
    var lastVersionId = edModel.getAlternativeVersionId();
    var dirty = ko.observable(false);
    var editorViewState = null;
    //won't change - so doesn't need to be an observable?
    var charCount = ko.observable(sceneData.contents ? sceneData.contents.length : 0); //prepopulate otherwise .load() text replacement results in '0' on new startup.txts
    var wordCount = ko.observable(0);
    var fileStats = sceneData.stats || {
      "mtime": new Date()
    }; //won't change - so doesn't need to be an observable?
    var markColour = ko.observable(sceneData.color ? sceneData.color : isImportant ? "rgb(119, 151, 236)" : "rgb(119, 119, 119)");
    //var sceneListPosition = ko.observable(self.project().scenes().length);
    var issues = ko.observableArray([]);
    issues.subscribe(function(val) {
      if (self == selectedScene()) {
        __updateEditorDecorations(self);
      }
    });
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
    self.decorations = [];
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
      return edModel.getValue();
    };
    self.getMarkColour = ko.computed(function() {
      return markColour();
    }, this);
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
      return edModel.getValue();
    }
    self.getLineContent = function(range) {
      // {} => endColumn, endLineNumber, startColumn, startLineNumber
      return edModel.getLineContent(range);
    }
    self.getLineLength = function(lineNum) {
      return edModel.getLineLength(lineNum);
    }
    self.getSearchResults = ko.computed(function() {
      return searchResults();
    }, this);
    self.getErrStateMsg = ko.computed(function() {
      return errStateMsg() + ' - click here to close';
    }, this);
    self.getErrState = ko.computed(function() {
      return inErrState();
    }, this);
    self.getCharCountString = function() {
      if (selectedChars() > 0) {
        return charCount() + " (" + selectedChars() + ")";
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
      var suffix = (wordCountOn() > 1) ? " [excl. cmds]" : " [inc. cmds]";
      if (selectedChars() > 0) {
        var selectedWords = __wordCount(vseditor.getModel().getValueInRange(vseditor.getSelection()), wordCountOn() > 1);
        return (wordCount() + (" (" + selectedWords + ") " + suffix));
      } else {
        return wordCount() + suffix;
      }
    };
    self.getWordCount = function(exclCommandLines, selected) {
      return selected ?  __wordCount(vseditor.getModel().getValueInRange(vseditor.getSelection()), exclCommandLines) : __wordCount(edModel.getValue(), exclCommandLines);
    };
    self.getState = ko.computed(function() {
      if (saving())
        return "fa fa-spinner fa-spin";
      if (!loaded())
        return "fa fa-ban"
      return inErrState() ? "fa fa-exclamation-triangle scene-unsaved" : readOnly() ? "fa fa-lock" : dirty() ? "fa fa-save scene-unsaved" : "fa fa-save scene-saved"
    });
    // FIXME: See tabtype setting for explanation
    self.updateTabSize = function(val) {
      if (typeof val === "undefined")
        val = settings.asObject("editor")["tabsize"];
      edModel.updateOptions({tabSize: val});
    }
    self.updateTabType = function(val) {
      if (typeof val === "undefined")
        val = settings.asObject("editor")["tabtype"];
      edModel.updateOptions({insertSpaces: val});
    }
    self.refreshIndentationSettings = function() {
      self.updateTabSize();
      self.updateTabType();
    }

    //SETTER METHODS
    self.setText = function(value) {
      if (readOnly()) return;
      if (typeof value != "string") return;
      edModel.setValue(value);
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
    self.showSearchResult = function(index, data) {
      if (searchVersionId != edModel.getAlternativeVersionId()) {
        notification("Stale Search Results", "This scene has been modified since the last search was performed. Please search again.", {type: 'error'});
        return;
      }
      self.focusLine(data, true);
      vseditor.setSelection(data.range);
    }
    self.replaceSearchResult = function(index, data, event) {
      if (event) event.stopPropagation();
      if (searchVersionId != edModel.getAlternativeVersionId()) {
        notification("Stale Search Results", "This scene has been modified since the last search was performed. Please search again.", {type: 'error'});
        return;
      }
      self.focusLine(data, true);
      vseditor.setSelection(data.range);
      var oldText = data.matches[0];
      var newText = document.getElementById("replaceBox").value || "";
      if (SEARCH.CONF.useRegex())
        newText = monaco.cside.parseReplaceString(newText).buildReplaceString(data.matches, SEARCH.CONF.preserveCase());
      var oldRange = new monaco.Range(data.range.startLineNumber, data.range.startColumn, data.range.endLineNumber, data.range.endColumn);
      var newRange = oldRange;
      var newSelections = edModel.pushEditOperations([new monaco.Selection(oldRange.startLineNumber, oldRange.startColumn, oldRange.endLineNumber, oldRange.endColumn)], [{text: newText, range: oldRange}], function() {
        // Calculate new cursor position(s)
        if (monaco.Range.spansMultipleLines(data.range)) {
          // TODO handle tricky multi-line change range calculations
          return [data.range.collapseToStart()]; // BROKEN?
        }
        // column only differences
        var columnDiff = -1*(oldText.length - newText.length);
        if (columnDiff != 0)
          newRange = oldRange.setEndPosition(oldRange.endLineNumber, oldRange.endColumn + columnDiff);
        return [new monaco.Selection(oldRange.startLineNumber, oldRange.startColumn, newRange.endLineNumber, newRange.endColumn)];
      });
      edModel.pushStackElement();
      if (self.isSelected())
        vseditor.setSelections(newSelections);
      self.search(self.getSearchResults().getSearchTerm(), newText, true, SEARCH.MODES.SEARCH);
    }
    self.replaceAllSearchResults = function(uiConfirmation) {
      var searchStr = document.getElementById("searchBox").value;
      var replaceStr = replaceStr || document.getElementById("replaceBox").value;
      if (uiConfirmation)
        bootbox.confirm("Replace all matches in this scene?",
          function(result) {
            if (result) {
              self.search(searchStr, replaceStr, false /* forceExpand */, SEARCH.MODES.REPLACE);
            }
          }
        );
      else
        self.search(searchStr, replaceStr, false /* forceExpand */, SEARCH.MODES.REPLACE);
      //edModel.pushStackElement(); // Undo stack breakpoint.
    }
    self.focusLine = function(lineNum, noArrow) {
      if (typeof lineNum !== "number") {
        if (lineNum.range && typeof lineNum.range.startLineNumber === "number")
          lineNum = lineNum.range.startLineNumber;
        else
          return;
      } else {
        lineNum += 1;
      }

      self.select(function(selected) {
        if (!selected) return;
        if (!noArrow) {
          __updateEditorDecorations(self, [
            {
              range: new monaco.Range(lineNum,1,lineNum,1),
              options: {
                isWholeLine: false,
                className: '',
                glyphMarginClassName: 'arrow-gutter'
              }
            }
          ]);
        }
        vseditor.revealLineInCenter(lineNum, monaco.editor.ScrollType.Immediate);
      });
      // fail silently
    }
    self.addIssue = function(issue) {
      issues.push(issue);
    }
    self.removeIssue = function(issue) {
      issues.remove(issue);
    }
    self.updateViewState = function() {
      if (self === selectedScene())
        return (editorViewState = vseditor.saveViewState());
      return null;
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
          edModel.setValue(data);
          dirty(false);
          __updatePersistenceList();
          //check tab/space collsion:
          //__testSceneIndentation(self);
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
      var data = edModel.getValue();
      fh.writeFile(path(), data, function(err) {
        finalizeSave(err);
      });

      function finalizeSave(err) {
        if (err) {
          console.log(err);
        } else {
          dirty(false);
          lastVersionId = edModel.getAlternativeVersionId();
          fileStats.mtime ? fileStats.mtime = new Date() : fileStats.modifiedAt = new Date();
        }
        saving(false);
        if (typeof callback == 'function') callback(err);
      }
    }
    self.select = function(callback) {
      if (typeof callback !== "function") callback = function(){};
      if (selectedScene() === self) {
        callback(true);
        return;
      }
      //ensure we're not already editing the name of another scene:
      if (inErrState() || !loaded() || saving() || self.isLocked()) {
        callback(false);
        return;
      }
      if (selectedScene())
        selectedScene().updateViewState();
      selectedScene(self);

      self.refreshIndentationSettings();

      vseditor.setModel(edModel);
      cursorPos(vseditor.getPosition());
      __updateEditorDecorations(self);
      if (editorViewState) {
        vseditor.restoreViewState(editorViewState);
      }
      if (!self.getProject().isExpanded()) {
        self.getProject().setExpand(true);
      }
      vseditor.focus();
      callback(true);
    }
    self.search = function(searchStr, replaceStr, forceExpand, newSearchMode) {
      if (locked())
        return null;
      locked(true);
      newSearchMode = (typeof newSearchMode === "number") ? newSearchMode : searchMode();
      var replacePattern = monaco.cside.parseReplaceString(replaceStr);
      var matches = edModel.findMatches(searchStr, false, SEARCH.CONF.useRegex(), SEARCH.CONF.preserveCase(), getWordSeperationValue(), true);
      // calculate the replace value for display, even if we're just searching:
      matches = matches.map(function(match) {
        // Add the .text attribute to convert it to a valid IIdentifiedSingleEditOperation for use in pushEditOperations below
        match.text = SEARCH.CONF.useRegex() ? replacePattern.buildReplaceString(match.matches, SEARCH.CONF.preserveCase()) : replaceStr;
        return match;
      });
      if ((newSearchMode === SEARCH.MODES.REPLACE) && (matches.length > 0)) {
        var newSelections = edModel.pushEditOperations([new monaco.Selection(matches[0].range.startLineNumber, matches[0].range.startColumn, matches[0].range.endLineNumber, matches[0].range.endColumn)], matches, function() {
            return [new monaco.Selection(1,1,1,1)];
        });
      }
      if (newSearchMode === SEARCH.MODES.REPLACE) // re-run initial search after a replace (to keep displayed results valid)
        matches = edModel.findMatches(searchStr, false, SEARCH.CONF.useRegex(), SEARCH.CONF.preserveCase(), getWordSeperationValue(), true);
      locked(false);
      searchVersionId = edModel.getAlternativeVersionId();
      // Continue to signal expansion of any result updates, unless the expansion is due to the collpaseThreshold (rather than user request).
      var expandSceneResults = forceExpand || (matches.length < SEARCH.CONF.collapseThreshold());
      searchResults(new CSIDESearchResults({ searchTerm: searchStr, scene: self, versionId: searchVersionId, results: matches, expanded: expandSceneResults, keepOpen: forceExpand }));
      return searchResults();
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
            "contents": edModel.getValue()
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

    //Update dirty status, char count etc - on change
    function updateOnModelEdit() {
      if (!saving())
        lastVersionId !== edModel.getAlternativeVersionId() ? dirty(true) : dirty(false);
      if (searchResults().getSearchTerm() != "")
        searchResults().getVersionId !== edModel.getAlternativeVersionId() ? self.search(searchResults().getSearchTerm(), null /* replaceStr */, searchResults() && searchResults().isExpanded() /* forceExpand */, SEARCH.MODES.SEARCH) : null;
      charCount(edModel.getValueLength());
      if (wordCountOn() > 0)
        wordCount(__wordCount(edModel.getValue(), (wordCountOn() > 1)));
    }
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
      scene.addIssue(self); //register issue with scene
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
      var options = ko.observableArray([{
        "desc": "on",
        "value": true
      }, {
        "desc": "off",
        "value": false
      }]);
    } else {
      var options = ko.observableArray(settingData.options);
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
    setting.getOptions = ko.computed(function() {
      return options();
    }, this);
    setting.getSelectedOptionId = function () {
      for (var i = 0; i < options().length; i++)
        if (value() == options()[i].value)
          return i;
      return null;
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
    setting.apply = settingData.apply; // unique apply method for each setting
    setting.toggle = function(option, evt) {
      if (type != "binary") {
        value(option.value);
      } else if ((selectedOption + 1) == options().length) {
        selectedOption = 0;
        value(options()[selectedOption].value);
      } else {
        selectedOption += 1;
        value(options()[selectedOption].value);
      }
    }
    setting.setOptions = function(optionList) {
      options(optionList);
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
        vseditor.getAction('editor.action.indentationToTabs').run();
      }),
      new menuOption("Convert all tabs to spaces", function(menu) {
        vseditor.getAction('editor.action.indentationToSpaces').run();
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
      var scene = menu.getTarget();
      var callback = function(err, scene) {
        if (!err && selectedScene() === menu.getTarget()) {
          scene.select();
        }
      }
      if (scene.isDirty()) {
        bootbox.confirm("<h3>Warning</h3><p>The scene '" + scene.getName() + "' has unsaved changes. Are you sure you wish to reload it?</p>", function(result) {
          if (result)
            scene.load(callback);
        });
      } else {
        scene.load(callback);
      }
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
                          addClass: 'btn',
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

  var vseditor = null;
  var projects = ko.observableArray([]);
  var cursorPos = ko.observable({lineNumber: 0, column: 0});
  var selectedChars = ko.observable(0);
  var selectedScene = ko.observable(null);
  var selectedProject = ko.computed(function() {
    return selectedScene() ? selectedScene().getProject() : null;
  });
  var SEARCH = {
    MODES: { SEARCH: 0, REPLACE: 1 },
    CONF: {
      wordSeperators: "`~!@#$%^&*()-=+[{]}\|;:'\",.<>/?",
      // The number of results that triggers an automatic UI collapse
      collapseThreshold: ko.observable(6),
      // Controls whether the find box expects regexes and the replace box replace patterns
      useRegex: ko.observable(false).extend({ callFunc: { func: function() { selectedProject().search("", "", SEARCH.MODES.SEARCH); }}}),
      preserveCase: ko.observable(true).extend({ callFunc: { func: function() { selectedProject().search("", "", SEARCH.MODES.SEARCH); }}}),
      matchWholeWord: ko.observable(false).extend({ callFunc: { func: function() { selectedProject().search("", "", SEARCH.MODES.SEARCH); }}}),
      searchOnType: ko.observable(true)
    }
  }
  self.SEARCH_MODES = SEARCH.MODES;
  function getWordSeperationValue() {
    if (SEARCH.CONF.matchWholeWord())
      return SEARCH.CONF.wordSeperators;
    return null;
  }
  var searchMode = ko.observable(SEARCH.MODES.SEARCH);
  searchMode.extend({ callFunc:
    {
      func: function(newVal) {
        setTimeout(function() { document.getElementById((newVal == SEARCH.MODES.REPLACE) ? "replaceBox" : "searchBox").focus(); }, 200);
        selectedProject().search("", "", SEARCH.MODES.SEARCH);
      }
    }
  });
  self.toggleSearchMode = function(newSearchMode) {
    if (typeof newSearchMode === "number") {
      searchMode(newSearchMode);
    } else {
      switch(searchMode()) {
        case SEARCH.MODES.REPLACE:
          newSearchMode = SEARCH.MODES.SEARCH;
          break;
        case SEARCH.MODES.SEARCH:
          newSearchMode = SEARCH.MODES.REPLACE;
          break;
        default:
          throw new Error("Unrecognized search mode: " + searchMode() + ". Please report this.");
      }
      searchMode(newSearchMode);
    }
  }
  self.inReplaceMode = ko.computed(function() {
    return searchMode() === SEARCH.MODES.REPLACE;
  }, this);
  self.searchToggles = ko.observableArray([
    { title: "Match Whole Word", cssClass: 'codicon-whole-word', value: SEARCH.CONF.matchWholeWord },
    { title: "Use Regular Expression", cssClass: 'codicon-regex', value: SEARCH.CONF.useRegex },
    { title: "Match Case", cssClass: 'codicon-case-sensitive', value: SEARCH.CONF.preserveCase },
    { title: "Search on Type", cssClass: 'codicon-record-keys', value: SEARCH.CONF.searchOnType }
  ]);
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
        "tabtype": true,
        "smartindent": true,
        "tabsize": "4",
        "linewrap": true,
        "fontsize": "12px",
        "fontfamily": "'Courier New', Courier, monospace",
        "spell_dic": "en_US",
        "theme": "cs-dark",
        "night-mode": false,
        "spellcheck": true,
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
      "search",
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
    },
    "selectFiles": function(callback, options) {
      options = options || {};
      if (usingNode) {
        var extensions = options.extensions || [".txt", ".log"];
        var chooser = $("#getFilePaths");
        chooser.attr("accept", extensions.join(","));
        chooser.off().change(function(evt) {
          var selection = $(this).val().split(";");
          if (selection.length === 1 && selection[0] === "") {
            callback(null);
          }
          $(this).val("");
          callback(selection);
        });
        chooser.trigger("click");
      } else {
        fileBrowser.open(function(selection) {
          if (selection.length < 1) {
            callback(null);
          }
          selection = selection.filter(function(file) {
              return !file.isFolder();
            })
            .map(function(file) {
              return file.path;
            });
            callback(selection);
        }, options);
      }
    },
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
    // Dropbox's new API format is rather strange, so we do what we can here.
    // With luck we'll migrate to dashingdon in the near future.
    if (typeof err.code != "undefined" && err.code == 409) {
      if (err.error.error[err.error.error[".tag"]][".tag"] == "not_found")
        err.code = 404;
      err.message = "Dropbox: " + err.error.error_summary;
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
    options.theme = "bootstrap-v3";
    options.layout = options.layout || "bottomRight";
    options.type = options.type || "alert";
    options.timeout = options.timeout === false ? false : options.timeout || 5000;
    options.closeWith = options.closeWith === false ? false : options.closeWith || ["click"];
    options.buttons = options.buttons || null;
    if (options.buttons) {
      options.buttons = options.buttons.map(function(btn) {
        return Noty.button(btn.text, btn.addClass, function(note) {
            btn.onClick(note);
          }
        );
      });
    }

    function wrapMessage(title, msg) {
      return "<h5>" + title + "</h5>\
					 <p>" + msg + "</p>";
    }
    options.text = wrapMessage(title, message);
    if (options.progress) {
      options.text += "<progress value='0' max='100'></progress>";
    }
    var n = new Noty(options);
    if (options.progress) {
      n.setProgress = function(val) {
        $(n.barDom).find(".noty_body").find("progress").val(val);
      }
    }
    n.show();
    return n;
  }
  self.notification = function(title, message, options) {
    return notification(title, message, options);
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

  function registerEditorActions(editor) {

    editor.addAction({
      id: 'replace-project-scenes',
      label: 'Replace in Project Scenes',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        if (!cside.getSelectedProject())
          return;
        cside.toggleSearchMode(SEARCH.MODES.REPLACE);
        __selectTab("search");
        document.getElementById("replaceBox").focus();
      }
    });

    editor.addAction({
      id: 'search-project-scenes',
      label: 'Search Project Scenes',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        if (!cside.getSelectedProject())
          return;
        cside.toggleSearchMode(SEARCH.MODES.SEARCH);
        __selectTab("search");
        document.getElementById("searchBox").focus();
      }
    });

    editor.addAction({
      id: 'save-selected-scene',
      label: 'Save Selected Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedScene().save();
        return null;
      }
    });

    editor.addAction({
      id: 'select-previous-scene',
      label: 'Select Previous Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.PageUp,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        __cycleSceneSelection(true);
      }
    });

    editor.addAction({
      id: 'select-next-scene',
      label: 'Select Next Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.PageDown,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        __cycleSceneSelection(false);
      }
    });

    editor.addAction({
      id: 'close-selected-scene',
      label: 'Close Selected Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_W,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedScene().close();
        return null;
      }
    });

    editor.addAction({
      id: 'add-new-scene',
      label: 'Add New Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_N,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().addNewScene();
        return null;
      }
    });

    editor.addAction({
      id: 'save-selected-project',
      label: 'Save Selected Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().save();
        return null;
      }
    });

    editor.addAction({
      id: 'close-selected-project',
      label: 'Close Selected Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_W,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().close();
        return null;
      }
    });

    editor.addAction({
      id: 'create-project',
      label: 'Create Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_N,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.createProject();
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-scene-panel-project',
      label: 'Toggle Scene Panel',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_COMMA,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.scenePanel();
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-tab-panel',
      label: 'Toggle Tab Panel',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_DOT,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.tabPanel();
        return null;
      }
    });

    editor.addAction({
      id: 'increase-font-size',
      label: 'Increase Editor Font Size',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_EQUAL
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var fontSizeSetting = settings.byId("editor", "fontsize");
        var optionId = fontSizeSetting.getSelectedOptionId();
        if (typeof optionId == "number" && optionId < (fontSizeSetting.getOptions().length - 1))
          fontSizeSetting.toggle(fontSizeSetting.getOptions()[optionId + 1]);
        return null;
      }
    });

    editor.addAction({
      id: 'decrease-font-size',
      label: 'Decrease Editor Font Size',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_MINUS
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var fontSizeSetting = settings.byId("editor", "fontsize");
        var optionId = fontSizeSetting.getSelectedOptionId();
        if (typeof optionId == "number" && optionId > 0)
          fontSizeSetting.toggle(fontSizeSetting.getOptions()[optionId - 1]);
        return null;
      }
    });

    editor.addAction({
      id: 'open-all-scenes',
      label: 'Open All Scenes',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_O,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().openAllScenes();
        return null;
      }
    });

    editor.addAction({
      id: 'open-file-browser',
      label: 'Open File Browser',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_O,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.openFileBrowser();
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-bold',
      label: 'Toggle Bold',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_B,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        insertTextTags("[b]", "[/b]");
      }
    });

    editor.addAction({
      id: 'wrap-variable',
      label: 'Wrap Variable',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_D,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        insertTextTags("${", "}");
      }
    });

    editor.addAction({
      id: 'toggle-italics',
      label: 'Toggle Italics',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_I,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        insertTextTags("[i]", "[/i]");
      }
    });

    editor.addAction({
      id: 'toggle-comment',
      label: 'Toggle Comment',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        insertTextTags("*comment ", "", true);
      }
    });

    editor.addAction({
      id: 'quicktest',
      label: 'Quicktest Project',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_T,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().test("quick");
        return null;
      }
    });

    editor.addAction({
      id: 'randomtest-project',
      label: 'Randomtest Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_T,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().test("random");
        return null;
      }
    });

    editor.addAction({
      id: 'run-project',
      label: 'Run Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getSelectedProject().run();
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-console',
      label: 'Toggle ChoiceScript Console',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var open = cside.getSelectedProject().toggleConsole();
        if (open) $("#cs-console > input").focus();
      }
    });

  }

  var insertTextTags = function(tagStart, tagEnd, allowSpecialLines) {
    var text = vseditor.getModel().getValueInRange(vseditor.getSelection());
    if (!text) {
      text = tagStart + tagEnd;
      var currentSel = vseditor.getSelection();
      var originalSel = Object.assign({}, currentSel);
      currentSel = vseditor.getModel().pushEditOperations(
        [originalSel], // Return to original pos on undo
        [{range: new monaco.Range(originalSel.startLineNumber, originalSel.startColumn, originalSel.startLineNumber, originalSel.startColumn), text: text }],
        function (inverseEditOperations) { // Set cursor between tags post-edit
          currentSel.startColumn = currentSel.selectionStartColumn = currentSel.positionColumn = (currentSel.startColumn + tagStart.length);
          return [currentSel];
        }
      );
      if (currentSel)
        vseditor.setSelection(currentSel[0]);
    } else {
      var line;
      var whitespace;
      text = text.split("\n");
      for (var i = 0; i < text.length; i++) {
        line = text[i].replace(/\r?\n|\r/,"");
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
      vseditor.executeEdits("insertTextTags", [{range: vseditor.getSelection(), text: text }]);
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
    "search": {
      "id": "search",
      "title": "Search and Replace",
      "showTitle": true,
      "iconClass": "fa fa-search",
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ko.computed(function() {
        return (selectedProject() ?  ((self.inReplaceMode()) ? "Replace" : "Search") + " in " + selectedProject().getName() : "Select a Project");
      }, this)
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
  self.tabs.subscribe(function(tabList) {
    // Silently drop any tabs we don't recognise.
    for (var i = 0; i < tabList.length; i++)
      if (!tabList[i])
        tabList.splice(i, 1);
  });

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

  function __cycleSceneSelection(direction) {
    // "up" = true / "down" = false
    if (!cside.getSelectedProject())
      return;
    var index;
    var currentScene = cside.getSelectedScene();
    var sceneList = cside.getSelectedProject().getScenes();
    if (!currentScene)
      return null;
    if ((index = sceneList.indexOf(cside.getSelectedScene())) > -1) {
      if (direction) {
        if (index > 0) {
          sceneList[--index].select();
        } else {
          sceneList[sceneList.length - 1].select();
        }
      } else {
        if (index < (sceneList.length - 1)) {
          sceneList[++index].select();
        } else {
          sceneList[0].select();
        }
      }
    }
    return null;
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

  function suggestWord(word) {
    return new Promise(function(resolve, reject) {
      typo.suggest(word, 5, function(suggestions) {
        resolve(suggestions);
          });
      });
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
          if (!val) {
            this.handle = monaco.languages.setLanguageConfiguration('choicescript', {
              onEnterRules: []
            });
          } else {
            if (this.handle) this.handle.dispose();
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
          vseditor.updateOptions({wordWrap: val ? "on" : "off"});
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
          vseditor.updateOptions({quickSuggestions: val});
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
          vseditor.updateOptions({formatOnType: val});
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
          // FIXME: Highlights can get stuck if disabled whilst visible.
          vseditor.updateOptions({selectionHighlight: val});
        }
      }),
      new CSIDESetting({
        "id": "visible-tabs",
        "name": "Visible Indentation",
        "value": false,
        "type": "binary",
        "cat": "editor",
        "desc": "Provides a visible representation of the indentation level in the editor window",
        "apply": function(val) {
          vseditor.updateOptions({renderIndentGuides: val});
        }
      }),
      new CSIDESetting({
        "id": "spellcheck",
        "name": "Spell Check",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Underline any misspelt words in the active scene text",
        "apply": function(val) {
          // enable/disable editor diagnostics
          var monacoOptions = __getMonacoDiagnosticOptions();
          monacoOptions.spellcheck.enabled = Boolean(val);
          __updateMonacoDiagnosticOptions(monacoOptions);
          if (val) {
            // In an ideal world we'd move this Provider into the language plugin, but
            // as it stands, we need direct access to the User Dictionary object
            // in order to add the words to our ignore lists that display in the UI.
            var self = this;
            this.handle = monaco.languages.registerCodeActionProvider('choicescript', {
              provideCodeActions: function(model, range, context, token) {
                actions = [];
                return new Promise(function(resolve, reject) {
                  context.markers.forEach(function(marker) {
                    if (marker.code === "badSpelling") {
                      var wordRange = new monaco.Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn);
                      var word = meditor.getModel().getWordAtPosition(new monaco.Position(wordRange.startLineNumber, wordRange.startColumn));
                      if (!word) return;
                      suggestWord(word.word).then(function(suggestions) {
                        for (var i = 0; i < suggestions.length; i++)
                          actions.push({ title: "Correct spelling: " + suggestions[i], kind: "quickfix",
                            edit: {
                              edits: [
                                { edit: { range: wordRange, text: suggestions[i] }, resource: model.uri }
                              ]
                            }
                          });
                        actions.push({ title: "Ignore '" + word.word + "' this session", kind: "quickfix",
                          command: {
                            id: userDictionary.monacoCmds["IGNORE_WORD"], title: "Ignore Word", arguments: [word.word]
                          }
                        });
                        actions.push({ title: "Add '" + word.word + "' to the User Dictionary", kind: "quickfix",
                          command: {
                            id: userDictionary.monacoCmds["ADD_WORD"], title: "Add Word", arguments: [word.word]
                          }
                        });
                        resolve(actions.length > 0 ? { actions: actions, dispose: function() {} } : null);
                      });
                    }
                  });
                });
              }
            });
          } else {
            if (this.handle) this.handle.dispose();
          }
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
          var monacoOptions = __getMonacoDiagnosticOptions();
          monacoOptions.spellcheck.dictionary = val;
          __updateMonacoDiagnosticOptions(monacoOptions);
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
          wordCountOn(val); // 0 == false? off
        }
      }),
      // FIXME: Each Monaco model has its own local indentation preferences (useSpaces, tabSize),
      // which override the global ones, so we need to make sure we update each model on swap, or adjustment.
      // Longer-term we should probably move to the same format: away from a global setting and towards each scene
      // having its own, much like any other text editor (but this should be easy to adjust on the fly).
      new CSIDESetting({
        "id": "tabtype",
        "name": "Use Spaces for Indentation",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Sets the indentation unit to spaces (on) or tabs (off)",
        "apply": function(val) {
          vseditor.updateOptions({insertSpaces: val});
          var selectedScene = cside.getSelectedScene();
          if (selectedScene)
            selectedScene.updateTabType(val);
        }
      }),
      new CSIDESetting({
        "id": "tabsize",
        "name": "Tab/Indent Block Size",
        "value": "4",
        "type": "dropdown",
        "cat": "editor",
        "options": [{
          "desc": "2",
          "value": "2"
        }, {
          "desc": "3",
          "value": "3"
        }, {
          "desc": "4",
          "value": "4"
        }, {
          "desc": "5",
          "value": "5"
        }, {
          "desc": "6",
          "value": "6"
        }, {
          "desc": "7",
          "value": "7"
        }, {
          "desc": "8",
          "value": "8"
        }],
        "desc": "The number of spaces to indent by, or the visual size of tabs (used by smart indent).",
        "apply": function(val) {
          vseditor.updateOptions({tabSize: val});
          var selectedScene = cside.getSelectedScene();
          if (selectedScene)
            selectedScene.updateTabSize(val);
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
          vseditor.updateOptions({fontSize: val});
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
          vseditor.updateOptions({fontFamily: val});
        }
      }),
      new CSIDESetting({
        "id": "theme",
        "name": "Editor Theme",
        "value": "cs-light",
        "type": "dropdown",
        "cat": "editor",
        "options": [
          /* We need dummy theme values here to prevent things
             going awry on startup. We then repopulate the list
             via Monaco's themeService below */
          { "desc": "Light", "value": "cs-light"},
          { "desc": "Dark", "value": "cs-dark"},
        ],
        "desc": "Sets the colour and style of the editor window and its text",
        "apply": function(val) {
          var self = this;
          var BASE_THEMES = ["vs", "vs-dark", "hc-black"];
          var CS_THEMES = ["cs-light", "cs-dark"];
          if (vseditor._themeService._knownThemes.size > (self.getOptions().length + BASE_THEMES.length)) {
            var options = [];
            vseditor._themeService._knownThemes.forEach(function(theme) {
              if (BASE_THEMES.indexOf(theme.themeName) < 0) // ignore Monaco's base themes
                options.push({ desc: CS_THEMES.indexOf(theme.themeName) > -1 ? theme.themeName : theme.themeName + " (custom)", value: theme.themeName });
            });
            self.setOptions(options);
            if (options.some(function(opt) { return opt.value === val; })) {
              self.apply(val);
            }
          }
          if (!self.getOptions().some(function(opt) { return opt.value === val; })) {
            val = "cs-light"; // handle any old/invalid theme config values
          }
          monaco.editor.setTheme(val);
          $("#code-footer, #cs-console").removeClass(function(i, className) {
            return (className.match(/cs-\w+/g) || []).join(' ');
          }).addClass(val);
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
        "desc": "Hovering the cursor over a command in the editor window will display additional information",
        "apply": function(val) {
          vseditor.updateOptions({hover: { enabled: val }});
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
              var n = notification("", "<i aria-hidden=true class='fa fa-refresh fa-spin'></i> Checking for updates...", { closeWith: false, timeout: false });
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
    "byId": function(settingType, id) {
      if (typeof settings[settingType] != 'undefined') {
        for (var i = 0; i < settings[settingType]().length; i++) {
          if (settings[settingType]()[i].getId() == id)
            return settings[settingType]()[i];
        }
      }
      return null;
    },
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

  self.getCursorPositionString = function() {
    return "Ln " + (cursorPos().lineNumber) + ", Col " + cursorPos().column;
  };

  self.scenePanel = function(action) {
    if ($('#sidebar').is(':visible') && action !== "open") {
      $('#sidebar').css({
          "display": "none"
      });
    } else {
      $('#sidebar').css({
          "display": ""
      });
    }
    if (vseditor) vseditor.layout();
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
        selectedProject().logToConsole(result.toString(), "output"); //←
      }
    } catch (e) {
      //strip error scene & line num - as the information is irrelevant
      e.message = e.message.replace(/line [0-9]+ of\s\w+: /, "");
      selectedProject().logToConsole("Error: " + e.message, "cm-error");
    }
    element.value = "";
  }
  self.tabPanel = function(action) {
    if ($('#left-wrap').is(':animated') || $('#right-wrap').is(':animated')) {
      return;
    }

    function calcWidth(ele) {
      var width = ele.width();
      var parentWidth = ele.offsetParent().width();
      var percent = 100 * width / parentWidth;
      return percent;
    }

    var isOpen = true;
    if (calcWidth($('#left-wrap')) >= 100) {
      isOpen = false;
    }

    if (action == "close" && isOpen || !action && isOpen) {
      $('#right-wrap').css({
        width: '0%'
      });
      $('#left-wrap').css({
        width: '100%'
      });
      $("#expand-collapse-bar").addClass("collapsed");
      if (vseditor) vseditor.layout();
    } else if (action == "open" && !isOpen || !action && !isOpen) {
      $('#right-wrap').css({
        width: '50%'
      });
      $('#left-wrap').css({
        width: '50%'
      });
      $("#expand-collapse-bar").removeClass("collapsed");
      if (vseditor) vseditor.layout();
    } else {
      return isOpen;
    }
  }

  // used by nodeCSIDE.js drag/drop file opening
  self.openScene = function(path, callback) {
    __openScene(path, callback);
  }
  self.openLogFile = function(path, callback) {
    if (getFileExtension(path)) {
      __openLogFile(path, callback);
    }
  }
  self.openFileBrowser = function() {
    fh.selectFiles(function(selection) {
      if (selection && selection.length >= 1)
        __openScenes(selection, true);
    });
  }

  function __openScenes(paths, selectLast) {
    var lastIndex = selectLast ? (paths.length - 1) : paths.length;
    for (var i = 0; i < lastIndex; i++) {
      var ext = getFileExtension(paths[i]);
      switch (ext) {
        case ".txt":
          __openScene(paths[i], function() {});
          break;
        case ".log":
          __openLogFile(paths[i], function() {});
          break;
        default:
          bootbox.alert("<h3>Error</h3>Attempting to open an unsupported file type: " + ext + ". Please report this.");
          return;
      }
    }
    if (selectLast) {
      switch (getFileExtension(paths[lastIndex])) {
        case ".txt":
          __openScene(paths[lastIndex], function(err, scene) {
            if (!err) scene.select();
          });
          break;
        case ".log":
          __openLogFile(paths[lastIndex], function() {});
          break;
        default:
          bootbox.alert("<h3>Error</h3>Attempting to open an unsupported file type: " + ext + ". Please report this.");
        return;
      }
    }
  }
  self.spellCheck = function(word) {
    if (__getMonacoDiagnosticOptions().spellcheck.enabled)
      return typo.check(word) || userDictionary.check(word.toLowerCase()) || Boolean(word.match(/^\d+$/));
    return true; //always OK
  }

  userDictionary = {
    "monacoCmds": {
      //interface for Monaco's CodeAction Commands/Quick Fixes
    },
    "persistentList": {
      //always ignore these words
    },
    "persistentListArray": ko.observableArray([
      //for GUI display
    ]),
    "sessionList": {
      //for this session only
    },
    "validateWord": function(word) {
      return word.match(/^([A-Za-z\u00C0-\u00FF\u0100-\u017F]+'[A-Za-z\u00C0-\u00FF\u0100-\u017F]+|[A-Za-z\u00C0-\u00FF\u0100-\u017F]{2,}|[AaI]'?)$/); //word chars, accented chars, apostrophes
    },
    "add": function(word, list) {
      if (!userDictionary.validateWord(word)) {
        return false;
      }
      word = word.toLowerCase();
      if (userDictionary[list + "List"][word])
        return true;
      userDictionary[list + "List"][word] = true;
      userDictionary.update(list);
      if (list == "persistent")
        userDictionary.persistentListArray.push(word);
      return true;
    },
    "remove": function(word, list) {
      if (userDictionary[list + "List"]) {
        delete userDictionary[list + "List"][word];
      }
      userDictionary.update(list);
      userDictionary.persistentListArray.remove(word);
    },
    "removeAll": function() {
      userDictionary.persistentList = {};
      userDictionary.persistentListArray.removeAll();
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
          if (userDictionary.persistentList.hasOwnProperty(i.toLowerCase())) {
            userDictionary.persistentListArray.push(i.toLowerCase());
          }
        }
        userDictionary.sync("persistent");
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
      }
      userDictionary.sync(list);
    },
    "sync": function(list) {
      // propagate to monaco for spelling validation
      var monacoOptions = __getMonacoDiagnosticOptions();
      if (!monacoOptions.spellcheck.userDictionary)
        monacoOptions.spellcheck.userDictionary = Object.create({});
      monacoOptions.spellcheck.userDictionary[list] = userDictionary[list+"List"];
      __updateMonacoDiagnosticOptions(monacoOptions);
    },
    "sanitize": function() {
      var arr = Object.keys(userDictionary.persistentList);
      for (var i = 0; i < arr.length; i++)
        if (arr[i] !== arr[i].toLowerCase())
          throw new Error("Error: Entry should be lowercase: " + arr[i]);
        else if (!userDictionary.validateWord(arr[i]))
          throw new Error("Error: Invalid entry (not a word): " + arr[i]);
        else if (userDictionary.persistentList[arr[i]] !== true)
          throw new Error("Error: Entry value should be 'true' for: " + arr[i])
    },
    "import": function() {
      var path;
      fh.selectFiles(function(selection) {
        if (!selection || selection.length < 1) {
          return;
        }
        path = selection[0];
        if (selection.length > 1 || getFileExtension(path) != ".json") {
          bootbox.alert("<h3>Error</h3>Please select a single valid JSON file.");
          return;
        }
        bootbox.confirm("Are you sure you wish to import this dictionary?<br>All words from the current dictionary will be lost.", function(result) {
          if (result) {
            fh.readFile(path, function(err, data) {
              if (err) {
                notification("Failed to Read Dictionary", path, {
                  type: 'error'
                });
              }
              else {
                try {
                  userDictionary.persistentList = JSON.parse(data);
                  userDictionary.sanitize();
                  userDictionary.update();
                  userDictionary.removeAll();
                  userDictionary.load();
                  notification("Dictionary Import Succesful", path, {
                    type: 'success'
                  });
                } catch(e) {
                  notification("Dictionary Import Failed", path, {
                    type: 'error'
                  });
                  throw e;
                }
              }
            });
          }
        });
      }, { extensions: [".json"]});
    },
    "export": function() {
      var path;
      fh.selectFolder(function(url) {
        if (!url) return;
        __promptForString(function(filename) {
          if (filename) {
            validName(filename, false, function(valid, err) {
              if (valid) {
                path = url + filename + ".json";
                fh.stat(path, function(err, stats) {
                  if (err && err.code === 404) {
                    fh.writeFile(path, localStorage.userDictionary, function(err) {
                      if (err)
                        return;
                      else {
                        notification("Dictionary Export Successful", path, {
                          type: 'success',
                          buttons: [{
                            addClass: 'btn',
                            text: 'Show Folder',
                            onClick: function(note) {
                              __openFolder(getDirName(path));
                              note.close();
                            }
                          }]
                        });
                      }
                    });
                  } else {
                    notification("Export Failed: File already exists", path, { type: "error" });
                  }
                });
              } else {
                notification("Export Failed: Naming error", err, { type: "error" });
              }
            });
          }
        }, "Filename for Exported Dictionary", "CSIDE_Dictionary");
      });
    }
  }
  // External dictionary APIs
  self.importDictionary = userDictionary.import;
  self.exportDictionary = userDictionary.export;
  self.checkUserDictionary = function(word) {
    if (typeof word !== "string")
      return false;
    return userDictionary.check(word);
  }
  self.clearDictionary = function() {
    bootbox.confirm("Are you sure you wish to remove all words from the user dictionary?", function(result) {
      if (result) {
        userDictionary.removeAll();
        userDictionary.update();
      }
    });
  }
  self.dictWord = ko.observable("");
  self.addToDictionary = function(obj, e) {
    if (e.type == "click" || e.type == "keyup" && e.keyCode == 13) {
      if (!userDictionary.add(self.dictWord(), "persistent")) {
        bootbox.alert("<h3>Error</h3>Unable to add to user dictionary: not a word!");
      }
    }
  };
  self.removeFromDictionary = function(word) {
    if (userDictionary.persistentList.hasOwnProperty(word)) {
      userDictionary.remove(word, "persistent");
    }
  };
  self.getDictionaryArray = ko.computed(function() {
    var query = self.dictWord().toLowerCase();
    if (query == "")
      return userDictionary.persistentListArray().sort();
    return userDictionary.persistentListArray().filter(function(word) { return word.startsWith(query); } ).sort();
  }, this);

  self.init = function(editor) {
    vseditor = editor;

    monaco.cside = {};

    // Patch in replace pattern support for find/replace with regexes
    amdRequire(['vs/editor/contrib/find/replacePattern'], function(replacePattern) {
      monaco.cside.parseReplaceString = replacePattern.parseReplaceString;
      monaco.cside.getReplaceString = function(replaceStr, matches, preserveCase) {
        return replacePattern.parseReplaceString(replaceStr).buildReplaceString(matches, preserveCase);
      }
    });

    // Hotkeys, etc.
    registerEditorActions(vseditor);

    if (usingNode) {
      // Load user-themes for the editor
      var themeDir = gui.App.dataPath + "/userThemes";
      var themeData = __loadEditorCustomThemes(themeDir);
      if (themeData.err && themeData.err.code === "ENOENT") {
        try {
          fs.mkdirSync(themeDir);
          themeData = __loadEditorCustomThemes(themeDir);
        } catch (err) { // give up
          notification("Unable to Detect Custom Themes",
            "CSIDE couldn't find or create a themes folder", {
            type: "error",
            layout: "bottomRight"
          });
        }
      }
      if (!themeData.err && themeData.themes.length > 0) {
        themeData.themes.filter(function(theme) { return theme.err })
          .forEach(function(theme) {
            notification("Failed to Load Custom Theme: " + theme.name, theme.err.message || "", {
              type: "error",
              layout: "bottomRight"
            });
          });
      }
    }

    // Connect spellcheck quick fix commands to the User Dictionary
    userDictionary.monacoCmds["IGNORE_WORD"] = vseditor.addCommand(0, function(s, word) { userDictionary.add(word, "session"); }, '');
    userDictionary.monacoCmds["ADD_WORD"] = vseditor.addCommand(0, function(s, word) { userDictionary.add(word, "persistent"); }, '');

    // OVERRIDE INTERNAL MONACO EDITOR SERVICES

    // Links in Monaco use a data-href attribute rather than the href attribute.
    // This means NWJS's new-win-policy event can't determine the url/target.
    // Thus we need to patch in an alternative handler here.
    editor.getContribution('editor.linkDetector').openerService._externalOpener = {
      openExternal: function(href) {
        if (usingNode) {
          gui.Shell.openExternal(href);
        } else if (matchesScheme(href, Schemas.http) || matchesScheme(href, Schemas.https)) {
          dom.windowOpenNoOpener(href);
        } else {
          window.location.href = href;
        }
        return Promise.resolve(true);
      }
    }

    // Make sure Monaco will look at more than just the editor's attached model.
    editor._codeEditorService.findModel = function (editor, resource) {
      const model = editor.getModel();
      if (!resource)
        return model;
      if (model && model.uri.toString() !== resource.toString()) {
        var newModel = monaco.editor.getModel(resource.toString());
        return newModel;
      }
      return model;
    }

    // Teach Monaco how to select new Scenes in CSIDE.
    editor._codeEditorService.doOpenEditor = function (editor, input) {
      var model = this.findModel(editor, input.resource);
      if (!model) {
        if (input.resource) {
          var schema = input.resource.scheme;
          if (schema === network_1.Schemas.http || schema === network_1.Schemas.https) {
            // This is a fully qualified http or https URL
            // dom_1.windowOpenNoOpener(input.resource.toString());
            return editor;
          }
        }
        return null;
      }
      if (editor.getModel().uri.toString() !== input.resource.toString()) {
        model.csideScene.select(function(success) {
          if (success) {
            var selection = (input.options ? input.options.selection : null);
            if (selection) {
              if (typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
                editor.setSelection(selection);
                editor.revealRangeInCenter(selection, 1 /* Immediate */);
              }
              else {
                var pos = {
                  lineNumber: selection.startLineNumber,
                  column: selection.startColumn
                };
                editor.setPosition(pos);
                editor.revealPositionInCenter(pos, 1 /* Immediate */);
              }
            }
            return editor;
          } else {
            return null;
          }
        });
      }
    }

    vseditor.onDidChangeCursorPosition(function(evt) {
      // only displays primary selection / cursor
      selectedChars(vseditor.getModel().getValueInRange(vseditor.getSelection()).length);
      cursorPos(evt.position);
    });
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
      // Attempt to restore tab order.
      if (config.tabs.length === __csideTabs.length) {
        for (var e = 0; e < config.tabs.length; e++) {
          self.tabs.push(__csideTabs[config.tabs[e]]);
        }
      } else {
        // If there is a list mismatch silently restore the defaults.
        for (var tab in __csideTabs) {
          self.tabs.push(__csideTabs[tab]);
        }
      }
    }
    else {
      for (var tab in __csideTabs) {
        self.tabs.push(__csideTabs[tab]);
      }
    }
    // Pre-configure the language service:
    var diagnosticsOptions = __getMonacoDiagnosticOptions();
    if (true) {
      var dictPath = "lib/typo/dictionaries";
      if (platform === "web-dropbox") {
        var loc = window.location.pathname;
        dictPath = loc.substring(0, loc.length - "index.html".length) + dictPath;
      } else {
        dictPath = "file://" + ((process.cwd() + "/") + dictPath);
      }
      diagnosticsOptions.spellcheck.dictionaryPath = dictPath;
    } else {
      diagnosticsOptions.spellcheck.dictionaryPath = "https://raw.githubusercontent.com/ChoicescriptIDE/main/latest/source/lib/typo/dictionaries/";
    }
    diagnosticsOptions.validate = false;
    __updateMonacoDiagnosticOptions(diagnosticsOptions);
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
    try {
      userDictionary.sanitize();
      userDictionary.load();
    }
    catch(err) {
      bootbox.alert("Sorry, there was a problem loading or parsing your user dictionary data.<br>" + "If you're seeing this message frequently please file a bug report.");
    }

    // ensure the tab panel starts open and on the 'help' tab
    __selectTab("help");

    // force redraw of the scenePanel based on display width
    self.scenePanel("open");

    // hook post-update behaviour here
    if (config.justUpdated || typeof config.justUpdated === "undefined") {
      config.justUpdated = false;
      __updateConfig();
      setTimeout(function() {
        var n = notification("Updated to v" + CSIDE_version, "A full list of changes can be found under 'Changelog' in the help and information tab.", {
          buttons: [{ addClass: 'btn', text: 'Show Changelog',
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
      }, 10000);
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

  function __updateMonacoDiagnosticOptions(diagOptions) {
    monaco.languages.choicescript.setDiagnosticsOptions(diagOptions);
  }

  function __getMonacoDiagnosticOptions() {
    return monaco.languages.choicescript.diagnosticsOptions;
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

  function __validateEditorCustomThemes(themeData) {
    // IStandaloneThemeData:
    //  base: BuiltinTheme
    //    ("vs" | "vs-dark" | "hc-black")
    //  colors: IColors
    //    [colorId: string]: string,
    //    e.g.: ["editor.foreground": "#0000FF", ...]
    //  inherit: boolean
    //  rules: ITokenThemeRule[]
    //    token: string
    //    fontStyle?: string
    //    background?: string
    //    foreground?: string
    //  encodedTokensColors?: string[]
    var compulsoryAttrs = [
      { key: "base", isValid:
        function(val) {
          return ["vs", "vs-dark", "hc-black"].some(function(theme) { return val === theme  });
        }
      },
      { key: "colors", isValid:
        function(val) {
          for (key in val) {
            if (val.hasOwnProperty(key)) {
              // TODO: Check colorId is valid
              if (!val[key].match(/^#[0-9A-Fa-f]{6}$/)) {
                return false;
              }
            }
          }
          return true;
        }
      },
      { key: "rules", isValid:
        function(val) {
          return Array.isArray(val) && val.every(function(entry) {
            // TODO: Confirm token names are valid? Properties look difficult.
            return true;
          });
        }
      },
      { key: "inherit", isValid:
        function(val) {
          return typeof val === "boolean";
        }
      },
    ];
    for (var i = 0; i < compulsoryAttrs.length; i++) {
      var attr = compulsoryAttrs[i].key;
      var val = themeData[attr];
      if (typeof val === "undefined" || val === null)
        return new Error("Incomplete editor theme is missing an attribute: " + attr);
      else if (!compulsoryAttrs[i].isValid(val))
        return new Error("Invalid editor theme: " + attr + " is invalid");
    }
    return null;
  }

  // Returns: { err: err || null, themes: [ { name: string, err: err || null } ]};
  function __loadEditorCustomThemes(themeDir) {
    var result = { err: null, themes: [] };
    try {
      var themes = fs.readdirSync(themeDir).filter(function(file) {
        return getFileExtension(file) === ".json";
      });
      themes.forEach(function(theme) {
        var themePath = themeDir + "/" + theme;
        var themeName = getFileName(themePath);
        var theme = { name: themeName, err: null };
        try {
          var themeData = JSON.parse(fs.readFileSync(themePath).toString());
          var valErr = __validateEditorCustomThemes(themeData);
          if (!valErr)
            monaco.editor.defineTheme(themeName, themeData);
          else
            theme.err = valErr;
        } catch(err) {
          theme.err = err;
        }
        result.themes.push(theme);
      });
    } catch(err) {
      result.err = err;
    }
    return result;
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

  function __openLogFile(path, callback) {
    nw.Window.open("file://" + path, {
      focus: true,
      width: 800,
      height: 600
    }, callback);
  }
  function __openScene(scenePath, callback) {
    if (typeof scenePath !== "string") {
      throw new Error("Error: Bad scenePath - expect a string.");
    }

    scenePath = __normalizePath(scenePath);

    var sceneProjectPath = getProjectPath(scenePath);
    var sceneProject = projectIsOpen(sceneProjectPath);
    var scene;

    if (!sceneProject) {
      sceneProject = new CSIDEProject({
        "path": sceneProjectPath,
        "source": platform
      });
      __addProject(sceneProject);
    }
    else {
      scene = sceneAlreadyOpen(getFileName(scenePath), sceneProject);
      if (scene) {
        if (callback) callback(scene);
        return;
      }
    }

    var newScene = new CSIDEScene({
      "path": scenePath,
      "source": platform
    });
    sceneProject.addScene(newScene);
    newScene.load(callback);
  }

  function hasClass(el, cls) { //https://gist.github.com/jjmu15/8646098
    return el.className && new RegExp("(\\s|^)" + cls + "(\\s|$)").test(el.className);
  }

  function getFileName(scenePath) {
    var sceneName = getLastDirName(scenePath);
    return sceneName.substring(0, sceneName.length - getFileExtension(scenePath).length);
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
    sceneName = sceneName.toLowerCase();
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

  function __updateEditorDecorations(scene, additional) {
    var issues = scene.getIssues();
    additional = additional || [];
    scene.decorations = vseditor.deltaDecorations(scene.decorations,
      issues.filter(function(issue) { return typeof issue.getLineNum() === "number" })
        .map(function(issue) {
          var col = meditor.getModel().getLineFirstNonWhitespaceColumn(issue.getLineNum());
          return {
            range: new monaco.Range(issue.getLineNum(),col,issue.getLineNum(),col),
            options: {
              isWholeLine: true,
              className: 'line-delete',
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
          }
        }).concat(additional)
    );
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
    function __commitCloseProject() {
      if (project === selectedProject()) {
        if (selectedProject() == activeProject()) {
          activeProject(null);
        }
        selectedScene("");
        __getTab("game").href("");
      }
      project.dispose();
      projects.remove(project);
      __updatePersistenceList();
    }
    if (!project.isDirty()) {
      __commitCloseProject();
    } else {
      bootbox.confirm("This project has unsaved scenes, are you sure you wish to close it?", function(result) {
        if (result) {
          __commitCloseProject();
        }
      });
    }
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
      var sceneName = getFileName(fileName);
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
                addClass: 'btn',
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
      addClass: 'btn',
      text: 'Download',
      onClick: function(note) {
        note.close();
        __update(channel);
      }
    },
    {
      addClass: 'btn',
      text: 'Cancel',
      onClick: function(note) {
        note.close();
      }
    }];
    return notification("Update Available on " + (channel.charAt(0).toUpperCase() + channel.slice(1)), update.desc, { closeWith: false, timeout: false, buttons: buttons, type: (channel === "development") ? "warning" : "alert" });
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
        self.extensions = [".txt", ".log"];
        visible(false);
      }
      this.open = function(path, callback, options) {
        // bad way to do optional 'path' parameter
        // should really make it the last argument
        if (typeof path == "function") {
          options = callback;
          callback = path;
          path = "";
        }
        if (self.selectingFolder) {
          buttonText("Select");
          browserTitle("Select a Folder");
        } else {
          if (options && options.extensions) {
            self.extensions = options.extensions;
            buttonText("Open");
            browserTitle("Select " + self.extensions.join(", "));
          } else {
            self.extensions = [".txt", ".log"];
            buttonText("Open");
            browserTitle("Open scenes");
          }
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
              // ignore anything but folders and allowed extensions
              if (!listStats[i].isFolder && self.extensions.indexOf(getFileExtension(listStats[i].path)) < 0) continue;
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
  var menu = ko.observable();
  function CSIDE_ContextMenu() {
    var self = this;
    self.isReady = function() {
      return true;
    }
    self.getContextMenu = ko.computed(function() {
      return menu();
    }, this);
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
    });
  }

  var myContextMenuViewModel = new CSIDE_ContextMenu();
  ko.applyBindings(myContextMenuViewModel, $('#context-menu')[0]);

}

window.cside = new IDEViewModel();
ko.applyBindings(cside, $('.main-wrap')[0]);
amdRequire(['vs/editor/editor.main'], function() {
  window.monaco = monaco;
  window.meditor = monaco.editor.create(document.getElementById("editor-wrap"), {
    theme: 'cs-light',
    value: "",
    language: 'choicescript',
    autoIndent: true,
    formatOnType: true,
    dragAndDrop: false,
    renderLineHighlight: "all",
    minimap: {enabled:false},
    wordWrap: 'bounded',
    //wordWrapColumn: 60,
    wrappingIndent: "same",
    roundedSelection: true,
    folding: true,
    automaticLayout: true,
    detectIndentation: false,
    lightbulb: { enabled: true },
    glyphMargin: true,
    model: null
  });
  cside.init(meditor);
});
//label finding regex: cside.projects()[0].scenes()[0].document.getValue().match(/\^*label.+$/gm,"");
