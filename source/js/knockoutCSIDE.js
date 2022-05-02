const amdRequire = require;
amdRequire.config({
  baseUrl: 'node_modules/monaco-editor/release/min'
});

//are we using node?
if (window.electronAPI) {
  window.usingNode = true;
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
function IDEViewModel(platform, versions, userDetails, appPath, db) {

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
  ko.extenders.validate = function(target, validateFunc) {
    target.isErroneous = ko.observable();
    target.errorMessage = ko.observable();

    function doValidate(newValue) {
      var result = validateFunc(target());
      target.isErroneous(!result.valid);
      target.errorMessage(result.message);
    }

    doValidate(target());
    target.subscribe(doValidate);

    return target;
  };

  function __normalizePath(path) {
    //replace backslashes
    path = path.replace(/\\/g, '/');
    return path;
  }
  // @bobince: https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
  var escapeRegex = new RegExp(/[-\/\\^$*+?.()|[\]{}]/g);
  function __escapeRegexString(string) {
    return string.replace(escapeRegex, '\\$&');
  }

  function __onElementRender(elementSelector, callback) {
    var timeout = false;
    var timer = setTimeout(function() { timeout = true; }, 2000); // bail on timeout
    function __checkRender() {
      if (!document.querySelector(elementSelector) && timeout) {
        window.requestAnimationFrame(__checkRender);
      } else {
              setTimeout(function(){ callback(); }, 0); // catch up
      }
    };
    __checkRender();
  }

  function __elementIsInView(element) {
    var rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }

  // Limit execution of a given function to every *limit* milliseconds
  // inspired by: https://davidwalsh.name/javascript-debounce-function
  function __limitExecution(func, limit) {
    var timeout = null;
    var locked = false;
    return function () {
      var unlock = function () {
        locked = false;
      }
      var retrigger = function () {
        locked = true;
        clearTimeout(timeout);
        timeout = setTimeout(unlock, limit);
      }
      if (!locked) func.apply(this, arguments);
      retrigger();
    }
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
    var files = ko.observableArray([]);
    var markerIssues = ko.observableArray([]);
    var generalIssues = ko.observableArray([]);
    var issues = ko.computed(function() {
      return markerIssues().concat(generalIssues());
    });
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
    var projectEditors = ko.observableArray([]);
    self.getEditors = projectEditors;

    //GETTER METHODS
    self.getName = ko.computed(function() {
      return name();
    }, this);
    self.getPath = ko.computed(function() {
      return path();
    }, this);
    self.getFiles = files;
    self.getIssues = ko.computed(function() {
      return files().reduce(function(issues, file) {
        return issues.concat(file.getIssues());
      }, issues());
    }, this);
    self.getFilteredIssues = ko.computed(function() {
      return files().reduce(function(issues, file) {
        return issues.concat(file.getFilteredIssues());
      }, issues());
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
      return self.getIssues().length;
    }, this);
    self.filteredIssueCount = ko.computed(function() {
      return self.getFilteredIssues().length;
    }, this);
    self.hasErrors = ko.computed(function() {
      return (files().some(function(scene) {
        return scene.hasErrors();
      }));
    }, this);
    self.hasWarnings = ko.computed(function() {
      return (files().some(function(scene) {
        return scene.hasWarnings();
      }));
    }, this);
    self.getFilteredIssueCountString = function() {
      var sceneCount = files().filter(function(f) { return f.filteredIssueCount() > 0 }).length;
      return "Showing " + self.filteredIssueCount() + " issue(s) in " + sceneCount + " file(s).";
    }
    self.getIssueCountString = function() {
      var sceneCount = files().filter(function(f) { return f.issueCount() > 0 }).length;
      return "There are " + self.issueCount() + " issue(s) across " + sceneCount + " file(s) in total.";
    }
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
      return ko.utils.arrayMap(files(), function(file) {
        return file.getSearchResults();
      }).filter(function(fileResults) { return fileResults.getResults().length > 0; });
    }, this);
    self.replaceAllFilesSearchResults = function() {
      var _files = files();
      for (var s = 0; s < _files.length; s++) {
        _files[s].replaceAllSearchResults();
      }
    }
    self.isDirty = ko.computed(function() {
      for (var i = 0; i < files().length; i++) {
        if (files()[i].isDirty()) {
          return true;
        } else if (i === files().length - 1) {
          return false;
        }
      }
    });
    self.getWordCount = function() {
      var incCmdWordCount = 0;
      var exCmdWordCount = 0;
      for (var i = 0; i < files().length; i++) {
        var counts = files()[i].getWordCount();
        incCmdWordCount += counts.incmds;
        exCmdWordCount +=counts.excmds;
      }
      return { incmds: incCmdWordCount, excmds: exCmdWordCount }
    }
    self.getCharCount = function() {
      var charCount = 0;
      for (var i = 0; i < files().length; i++) {
        charCount += files()[i].getCharCount();
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
      monacoConsole.layout();
      return consoleOpen();
    }
    self.clearConsole = function() {
      console_logs.removeAll();
    }
    self.addIssue = function(issue) {
      // only for non-marker issue
      generalIssues.push(issue);
    }
    self.removeIssue = function(issue) {
      // only for non-marker issue
      generalIssues.remove(issue);
    }
    self.purgeIssues = function() {
      // only for non-marker issue
      generalIssues([]);
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
    self.issueSearch = function(data, event, domObj) {
      if (event.type == "keyup" && SEARCH.CONF.searchOnType()) {
        cside.filterString(event.target.value);
        return true; // allow the char input to take place
      }
      else if (event.type != "keydown") {
        return true;
      }
      if (event.keyCode == 13) {
        if (!event.ctrlKey) {
          cside.filterString(event.target.value);
          return false; // don't allow the Enter press to affect the textarea
        } else { // match monaco's in-model search linebreak behaviour (ctrl+enter)
          event.target.value += "\n";
          event.target.scrollTop = event.target.scrollHeight;
        }
      }
      return true;
    }
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
              files().forEach(function(file) { file.search(searchStr, replaceStr, false /* forceExpand */, curSearchMode); });
            }
          }
        );
      }
      else {
        files().forEach(function(file) {
          /* Once a file's results tab has been manually expanded it is likely that the user wishes to continue to see those results, so we'd rather
             not have them re-collapse on every re-search. However, there's the issue of performance (and screen estate) when multiple file's with large
             result sets are left open.
             So, what we do here is make the collapse/expand state for each file remain honoured *up until* it returns 0 results,
             implying that it is no longer relevant.
             This essentially adds a natural 'reset' that makes sure files are re-collapsed over time, rather than expecting the user to close them,
             whilst still allowing for a user to view result changes in their files of interest.
          */
          var forceExpand = file.getSearchResults() && (file.getSearchResults().keepOpen() && file.getSearchResults().getLength() > 0);
          file.search(searchStr, replaceStr, forceExpand, curSearchMode);
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
      return ("Found " + self.getSearchResultCount() + " results in " + self.getSearchResults().length + " file(s).");
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
    self.select = function(callback) {
      /* select first possible file */
      var file = files()[0];
      if (file) {
        file.viewInEditor(callback);
      } else {
        callback(null);
      }
    }
    self.save = function(cb) {
      if (typeof cb != "function") cb = function() {}; //ui click
      var failed = false;
      var count = files().length;
      files().forEach(function(file, index) {
        if (failed) return;
        file.save(null, null, function(err) {
          if (err) {
            failed = true;
            return cb(err);
          }
          if (--count == 0) cb(null);
        });
      });
    }
    self.addNewFile = function(project, event) {
      if (readOnly()) return;
      if (event) event.stopPropagation();
      addNewFile(self, "untitled");
    }
    self.addFile = function(file) {
      if (file.getProject() !== self && file.getProject() !== false) return; //invalid call (only at file creation or via file.move())
      files.push(file);
    }
    self.removeFile = function(file) {
      if (files().lastIndexOf(file) === -1) {
        return;
      }
      var editors = file.getEditors();
      for (var i = 0; i < editors.length; i++) {
        editors[i].close();
      }
      files.remove(file);
      if (files().length < 1) {
        projects.remove(self);
      }
    }
    self.closeFile = function(file, callback) {
        function closeFile() {
          self.removeFile(file);
          __updatePersistenceList();
          if (typeof callback === 'function') callback(true);
        }
        if (file.isDirty()) {
          bootbox.confirm("This file has unsaved changes, are you sure you wish to close it?", function(result) {
            if (result) {
              closeFile();
            } else {
              if (typeof callback === 'function') callback(false);
              return;
            }
          });
        } else {
          closeFile();
        }
      }
    self.subscribeEditor = function(ed) {
      if (projectEditors.indexOf(ed) < 0) {
        projectEditors.push(ed);
      }
      if (self === activeProject()) {
        var aEd = activeEditor();
        if (aEd) aEd.resize();
      }
    }
    self.unsubscribeEditor = function(ed) {
      projectEditors.remove(ed);
      if (self === activeProject()) {
        var aEd = activeEditor();
        if (aEd) aEd.resize();
      }
    }
      /* callback(err, success_boolean) */
    self.exportFiles = function() {
      fh.selectFolder(function(error, newPath) {
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
                  var n = notification("Game Exported Successfully", "All files exported successfully to " + newPath, {
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
      fh.selectFolder(function(error, newPath) {
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
    self.reloadAllFiles = function() {
      for (var i = 0; i < files().length; i++)
        files()[i].load();
    }
    /* Display only this project and its editors */
    self.makeActive = function() {
      var oldProject = activeProject();
      if (oldProject) {
         if (oldProject === self) {
          return;
        }
        oldProject.getEditors().forEach(function(ed) {
          ed.hide();
        });
      }
      activeProject(self);
      self.getEditors().forEach(function(ed) {
        ed.show();
      });
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
    var file = data.file || null;

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
    self.getFile = function() {
      return file;
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
          file.getLineContent(result.range.startLineNumber).slice(0, result.range.startColumn-1) : "";
          if (result.preText.length > SEARCH_MAX_LINE_LEN)
            result.preText = "…" + result.preText.slice(result.range.startColumn-(SEARCH_MAX_LINE_LEN+1),result.range.startColumn-1);
        // post match
        var endLineLen = file.getLineLength(result.range.endLineNumber);
        result.postText = result.range.endColumn < endLineLen ?
          file.getLineContent(result.range.endLineNumber).slice(result.range.endColumn-1, endLineLen) : "";
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
    if (file && expanded) {
      self.createResultDescriptions();
    }
  }

  function CSIDEFile(fileData) {
    var self = this;
    //INSTANCE VARIABLES
    var edModel = ko.observable(null); // holds the Monaco editor document model
    var path = ko.observable(__normalizePath(fileData.path)).extend({
      normalizePaths: "",
      callFunc: {
        func: function(newPath) {
          // automatically replace the Monaco model on renames to keep its Uri in sync
          var oldModel = edModel();
          try {
            edModel(monaco.editor.createModel(edModel() ? edModel().getValue() : "", "choicescript", monaco.Uri.file(newPath)));
            edModel().csideFile = self;
            if (oldModel) oldModel.dispose();
            // update any subscribed editors immediately
            self.getEditors().forEach(function(ed) {
              ed.setDocModel(edModel()); // reset model
            });
            edModel().onDidChangeContent(updateOnModelEdit);
          } catch (err) {
            bootbox.alert("Unrecoverable Error: Couldn't update URI for file.<br><br>" + err.message + ".<br><br> Please restart the application and report this.");
          }
        }
      }
    });
    self.getName = ko.computed(function() {
      return getFileName(path());
    }, this);
    self.expandIssues = ko.observable(false);
    var isImportant = self.getName().toUpperCase().match(reservedSceneNames);
    var source = fileData.source || platform; //won't change - so doesn't need to be an observable?
    var loaded = ko.observable(false);
    var locked = ko.observable(false);
    var readOnly = ko.observable(fileData.readOnly || false); //app relative files are always read-only
    var editing = ko.observable(false);
    var colouring = ko.observable(false);
    var saving = ko.observable(false);
    var inErrState = ko.observable(false);
    var errStateMsg = ko.observable("");
    var searchVersionId = null;

    var searchResults = ko.observable(new CSIDESearchResults({results: []}))
      .extend({ rateLimit: { rateLimit: 1000, method: "notifyWhenChangesStop" }});
    var indentSize = ko.observable(settings.byId("editor", "tabsize").getValue())
      .extend({ callFunc: { func: function(newVal) { edModel().updateOptions({tabSize: newVal});}}});
    var useSpaces = ko.observable(settings.byId("editor", "usespaces").getValue())
      .extend({ callFunc: { func: function(newVal) { edModel().updateOptions({insertSpaces: newVal});}}});

    // create initial model
    edModel(monaco.editor.createModel(fileData.contents || "", "choicescript", monaco.Uri.file(path())));
    edModel().onDidChangeContent(updateOnModelEdit);
    edModel().csideFile = self;

    // used for dirtyness
    var lastVersionId = edModel().getAlternativeVersionId();
    var dirty = ko.observable(false);
    var editorViewState = null;
    //won't change - so doesn't need to be an observable?
    var charCount = ko.observable(fileData.contents ? fileData.contents.length : 0); //prepopulate otherwise .load() text replacement results in '0' on new startup.txts
    var wordCount = ko.observable({ incmds: 0, excmds: 0 });
    var fileStats = fileData.stats || {
      "mtime": new Date()
    }; //won't change - so doesn't need to be an observable?
    var markColour = ko.observable(fileData.color ? fileData.color : isImportant ? "#7797ec" : "#777777");
    markColour.extend({
      callFunc: {
        func: function(newCol) {
          var colIndex = recentFileColours().indexOf(newCol);
          recentFileColours.unshift(newCol);
          if (colIndex > -1) {
            recentFileColours.splice(++colIndex, 1);
          } else {
            recentFileColours.splice(recentFileColours().length-1, 1);
          }
          __updatePersistenceList();
        }
      }
    });
    var markerIssues = ko.observableArray([]);
    var generalIssues = ko.observableArray([]);
    var issues = ko.computed(function() {
      return markerIssues().concat(generalIssues());
    });
    generalIssues.subscribe(function(val) {
      if (self == activeFile()) {
        var ed = self.getEditors()[0];
        __updateEditorDecorations(ed, self);
      }
    });
    issues.subscribe(function(val) {
      if (val.length < SEARCH.CONF.collapseThreshold()) {
        self.expandIssues(true);
      } else {
        self.expandIssues(false);
      }
    });
    var invalidName = ko.observable(false);
    var nameErrMsg = ko.observable();
    self.isLocked = ko.computed(function() {
      if (locked()) return true;
      //is another file selected but also being 'edited'? If yes, we can't select this file yet.
      var curFile = cside.getActiveFile();
      if (curFile && (curFile.beingEdited() && curFile != self)) return true;
      return false;
    }, this);

    //GETTER METHODS
    self.decorations = [];
    self.getPath = ko.computed(function() {
      return path();
    }, this);
    self.getModel = ko.computed(function() {
      return edModel();
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
    self.isActive = function() {
      return activeFile() === self;
    }
    self.beingColoured = ko.computed(function() {
      return colouring();
    }, this);
    self.getSource = function() {
      return source;
    };
    self.getProject = function() {
      return getProject(getProjectPath(path()));
    };
    self.getEditors = ko.computed(function() {
      if (!self.getProject()) return [];
      return self.getProject().getEditors().filter(function(ed) {
        return ed.getFile() === self;
      });
    }, this);
    self.isSelected = function() {
      return (self.getEditors().length > 0);
    };
    self.getText = function() {
      return edModel().getValue();
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
    self.getIssues = ko.computed(function() {
      return issues();
    });
    self.getFilteredIssues = ko.computed(function() {
      var issueList = issues();
      if (cside.filterString.isErroneous()) // TODO: BROKEN
        return issueList;
      var activeIssueTypes = cside.getActiveIssueTypes();
      issueList = issueList.filter(function(issue) {
        return activeIssueTypes.includes(issue.getSeverity());
      });
      var matchCase = SEARCH.CONF.preserveCase();
      var regex = SEARCH.CONF.useRegex();
      var wholeWord = SEARCH.CONF.matchWholeWord();
      return issueList.filter(function(i) {
        var matchValue = matchCase ? i.getDesc() : i.getDesc().toLowerCase();
        var filterString = matchCase ? cside.filterString() : cside.filterString().toLowerCase();
        if (wholeWord) {
          if (!regex) {
            filterString = __escapeRegexString(filterString);
          }
          filterString = "\\b" + filterString + "\\b";
          try {
            return matchValue.match(new RegExp(filterString));
          } catch(err) {
            return false;
          }
        } else {
          if (regex) {
            try {
              return matchValue.match(new RegExp(filterString));
            } catch(err) {
              return false;
            }
          } else {
            return matchValue.includes(filterString);
          }
        }
      });
    }, this);
    self.issueCount = ko.computed(function() {
      return issues().length;
    }, this);
    self.filteredIssueCount = ko.computed(function() {
      return self.getFilteredIssues().length;
    }, this);
    self.hasErrors = function() {
      return self.getIssues().some(function(i) {
        return i.getSeverity() === monaco.MarkerSeverity.Error;
      });
    }
    self.hasWarnings = function() {
      return self.getIssues().some(function(i) {
        return i.getSeverity() === monaco.MarkerSeverity.Warning;
      });
    }
    self.getContents = function() {
      return edModel().getValue();
    }
    self.getLineContent = function(range) {
      // {} => endColumn, endLineNumber, startColumn, startLineNumber
      return edModel().getLineContent(range);
    }
    self.getLineLength = function(lineNum) {
      return edModel().getLineLength(lineNum);
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
    self.getCharCount = function() {
      return charCount();
    };
    self.getWordCount = function() {
      return wordCount();
    };
    self.usingSpaces = function() {
      return useSpaces();
    }
    self.getIndentSize = function() {
      return indentSize();
    }
    self.getIndentDesc = ko.computed(function() {
      return ((useSpaces() ? "Spaces: " : "Tabs: ") + indentSize());
    }, this);
    self.getState = ko.computed(function() {
      if (saving())
        return "fa fa-spinner fa-spin";
      if (!loaded())
        return "fa fa-ban"
      return inErrState() ? "fa fa-exclamation-triangle scene-unsaved" : readOnly() ? "fa fa-lock" : dirty() ? "fa fa-save scene-unsaved" : "fa fa-save scene-saved"
    });
    // FIXME: See useSpaces setting for explanation
    self.updateIndentSize = function(val) {
      if (typeof val === "undefined")
        val = useSpaces() ? settings.asObject("editor")["indentspaces"].getValue() : settings.asObject("editor")["tabsize"];
      indentSize(val);
    }
    self.updateUseSpaces = function(val) {
      if (typeof val === "undefined")
        val = settings.asObject("editor")["usespaces"];
      useSpaces(val);
    }

    //SETTER METHODS
    self.setText = function(value) {
      if (readOnly()) return;
      if (typeof value != "string") return;
      edModel().setValue(value);
    }
    var renameFile = function(newName) {
      if (invalidName())
        return;
      saving(true);
      var newPath = self.getProject().getPath() + newName;
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
          __updatePersistenceList();
        }
      }
    }
    self.nameInterface = ko.pureComputed({
      read: function() {
        var name = self.getName();
        return editing() ? name.substring(0, name.length - getFileExtension(name).length) : self.getName();
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
      if (event.type == "blur" && !editing()) {
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
          var newName = event.target.value.trim() + getFileExtension(path());
          if (newName != self.getName()) {
            pathExists(self.getProject() + newName, function(exists) {
              if (!exists) {
                renameFile(newName);
              } else {
                notification("Failed to Rename File", "File '" + event.target.value.toLowerCase() + "' already exists in this Project", {
                  type: "error"
                });
                event.target.value = self.getName();
              }
            });
          }
          editing(false);
        }
      } else if (isImportant) {
        if (isImportant) {
          notification("", "Reserved file cannot be renamed", {
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
    self.showColours = function(file, event) {
      if (event.type === "mouseleave" && !colouring()) return; // ignore mouseleave after colour select
      colouring(!colouring());
    }
    self.recolour = function(colour, event) {
      markColour(colour);
      colouring(false);
    }
    self.newColour = function(file, event) {
      var bcr = event.target.getBoundingClientRect();
      var colSelector = $("#selectColor");
      colSelector.off();
      colSelector.val(markColour());
      colSelector.css({
        "position": "fixed",
        "left": bcr.x,
        "top": bcr.y,
        "z-index": -999
      }).change(function(evt) {
        markColour(colSelector.val());
        colSelector.hide();
      });
      setTimeout(function() {
        colSelector.show().trigger("click");
      }, 500);
    }
    self.showSearchResult = function(index, data) {
      if (searchVersionId != edModel().getAlternativeVersionId()) {
        notification("Stale Search Results", "This file has been modified since the last search was performed. Please search again.", {type: 'error'});
        return;
      }
      self.focusLine(data, true, function(ed) {
        if (ed) ed.getMonacoEditor().setSelection(data.range);
      });
    }
    self.replaceSearchResult = function(index, data, event) {
      if (event) event.stopPropagation();
      if (searchVersionId != edModel().getAlternativeVersionId()) {
        notification("Stale Search Results", "This file has been modified since the last search was performed. Please search again.", {type: 'error'});
        return;
      }
      self.focusLine(data, true, function(ed) {
        if (ed) ed.getMonacoEditor().setSelection(data.range);
      });
      var oldText = data.matches[0];
      var newText = document.getElementById("replaceBox").value || "";
      if (SEARCH.CONF.useRegex())
        newText = monaco.cside.parseReplaceString(newText).buildReplaceString(data.matches, SEARCH.CONF.preserveCase());
      var oldRange = new monaco.Range(data.range.startLineNumber, data.range.startColumn, data.range.endLineNumber, data.range.endColumn);
      var newRange = oldRange;
      var newSelections = edModel().pushEditOperations([new monaco.Selection(oldRange.startLineNumber, oldRange.startColumn, oldRange.endLineNumber, oldRange.endColumn)], [{text: newText, range: oldRange}], function() {
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
      edModel().pushStackElement();
      self.viewInEditor(function(ed) {
        if (ed) ed.getMonacoEditor().setSelections(newSelections);
      });
      self.search(self.getSearchResults().getSearchTerm(), newText, true, SEARCH.MODES.SEARCH);
    }
    self.replaceAllSearchResults = function(uiConfirmation) {
      var searchStr = document.getElementById("searchBox").value;
      var replaceStr = replaceStr || document.getElementById("replaceBox").value;
      if (uiConfirmation)
        bootbox.confirm("Replace all matches in this file?",
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
    self.focusLine = function(lineNum, noArrow, callback) {
      if (typeof lineNum !== "number") {
        if (lineNum.range && typeof lineNum.range.startLineNumber === "number")
          lineNum = lineNum.range.startLineNumber;
        else
          return;
      }
      self.viewInEditor(function(ed) {
        if (ed) {
          if (!noArrow) {
            __updateEditorDecorations(ed, self, [
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
          var med = ed.getMonacoEditor();
          var pos = {
            lineNumber: lineNum,
            column: med.getModel().getLineMaxColumn(lineNum)
          };
          med.setPosition(pos);
          med.revealPositionInCenter(pos, monaco.editor.ScrollType.Immediate);
          med.focus();
        }
        if (typeof callback === "function") callback(ed);
      });
      // fail silently
    }
    self.logIssue = function(issue) {
      generalIssues.push(issue);
      var buttons = [{
        addClass: 'btn btn-danger',
        text: 'Show',
        onClick: function(note) {
          note.close();
          __selectTab("issues");
          self.expandIssues(true);
          activeIssue(issue);
          if (issue.getLineNum()) {
            issue.show();
          }
        }
      }]
      var n = notification("New Issue", "New issue with project " + self.getName(), {
        type: "error",
        buttons: buttons
      });
      n.setTimeout(5000);
    }
    self.setMarkerIssues = function(newIssues) {
      markerIssues(newIssues);
    }
    self.addIssue = function(issue) {
      generalIssues.push(issue);
    }
    self.removeIssue = function(issue) {
      generalIssues.remove(issue);
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

      fh.stat(path(), async function(err, newfileStats) {
        if (err) {
          finishLoading(err);
        } else {
          fileStats = newfileStats;
          const { error, result } = await window.electronAPI.readFile(path());
          finishLoading(normalizeError(error), result);
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
          edModel().setValue(data);
          edModel().detectIndentation(
            settings.byId("editor", "usespaces").getValue(),
            useSpaces() ? settings.byId("editor", "indentspaces").getValue() : settings.byId("editor", "tabsize").getValue()
          );
          useSpaces(edModel().getOptions().insertSpaces);
          // pull the visual tab size from the global setting, or the space count from the model detection
          indentSize(useSpaces() ? edModel().getOptions().indentSize : settings.byId("editor", "tabsize").getValue());
          dirty(false);
          __updatePersistenceList();
        }
        loaded(true);
        saving(false);
        if (typeof callback != 'undefined') callback(err, self);
      }
    }
    self.save = function(file, event, callback) {
      if (event) event.stopPropagation();
      //skip clean, error'd or currently saving files
      if ((!dirty() && loaded()) || inErrState() || saving() || locked() || readOnly()) {
        if (typeof callback == 'function') callback(null);
        return;
      }
      saving(true);
      var lastModifiedAt = fileStats.mtime || fileStats.modifiedAt;
      fh.stat(path(), function(err, newfileStats) {
        if (err && (err.code == 404 || err.code == "ENOENT")) {
          //new file, we're cool, bypass:
          saveFile(callback);
        } else if (err) {
          console.log(err);
          saving(false);
          bootbox.alert("<h3>Warning</h3><p>Unable to save <b>" + self.getName() + "</b> of <b>" + self.getProject().getName() + "</b>: " + err.message + ".</p> \
						<p>Check your internet connection.</p>");
        } else {
          checkDate(newfileStats);
        }
      });

      function checkDate(newfileStats) {
        var newlyModifiedAt = newfileStats.mtime || newfileStats.modifiedAt;
        if (newlyModifiedAt.getTime() > (lastModifiedAt.getTime() + 1000)) {
          bootbox.dialog({
            message: "'" + self.getName() + ".txt' of <b>" + self.getProject().getName() + "</b> appears to have been modified by another program or process \
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
                  self.load(function(err, file) {
                    if (!err) {
                      file.viewInEditor();
                    }
                  });
				  return;
                }
              },
			  yes: {
                label: "Save",
                className: "btn-primary",
                callback: function() {
                  saveFile(callback);
                }
              }
            },
            onEscape: function() {
			  saving(false);
			  return;
            }
	       });
        } else {
          saveFile(callback);
        }
      }
    }

    function saveFile(callback) {
      var data = edModel().getValue();
      fh.writeFile(path(), data, function(err) {
        finalizeSave(err);
      });

      function finalizeSave(err) {
        if (err) {
          console.log(err);
        } else {
          dirty(false);
          lastVersionId = edModel().getAlternativeVersionId();
          fileStats.mtime ? fileStats.mtime = new Date() : fileStats.modifiedAt = new Date();
        }
        saving(false);
        if (typeof callback == 'function') callback(err);
      }
    }
    self.viewInEditor = function(callback) {
      self.getProject().makeActive();
      var fileEditor = self.getEditors()[0];
      if (fileEditor) {
        fileEditor.makeActive();
        if (typeof callback === "function") callback(fileEditor);
      } else {
        cside.openNewEditor(self, function(ed) {
          ed.makeActive();
          if (typeof callback === "function") callback(ed);
        });
      }
    }
    self.loadEditorViewState = function(editor) {
      if (editorViewState) {
        editor.waitForRender(function() {
          editor.getMonacoEditor().restoreViewState(editorViewState);
        });
      }
    }
    self.saveEditorViewState = function(editor) {
      editorViewState = editor.getMonacoEditor().saveViewState();
    }
    self.search = function(searchStr, replaceStr, forceExpand, newSearchMode) {
      if (locked())
        return null;
      locked(true);
      newSearchMode = (typeof newSearchMode === "number") ? newSearchMode : searchMode();
      var replacePattern = monaco.cside.parseReplaceString(replaceStr);
      var matches = edModel().findMatches(searchStr, false, SEARCH.CONF.useRegex(), SEARCH.CONF.preserveCase(), getWordSeperationValue(), true);
      // calculate the replace value for display, even if we're just searching:
      matches = matches.map(function(match) {
        // Add the .text attribute to convert it to a valid IIdentifiedSingleEditOperation for use in pushEditOperations below
        match.text = SEARCH.CONF.useRegex() ? replacePattern.buildReplaceString(match.matches, SEARCH.CONF.preserveCase()) : replaceStr;
        return match;
      });
      if ((newSearchMode === SEARCH.MODES.REPLACE) && (matches.length > 0)) {
        var newSelections = edModel().pushEditOperations([new monaco.Selection(matches[0].range.startLineNumber, matches[0].range.startColumn, matches[0].range.endLineNumber, matches[0].range.endColumn)], matches, function() {
            return [new monaco.Selection(1,1,1,1)];
        });
      }
      if (newSearchMode === SEARCH.MODES.REPLACE) // re-run initial search after a replace (to keep displayed results valid)
        matches = edModel().findMatches(searchStr, false, SEARCH.CONF.useRegex(), SEARCH.CONF.preserveCase(), getWordSeperationValue(), true);
      locked(false);
      searchVersionId = edModel().getAlternativeVersionId();
      // Continue to signal expansion of any result updates, unless the expansion is due to the collpaseThreshold (rather than user request).
      var expandResults = forceExpand || (matches.length < SEARCH.CONF.collapseThreshold());
      searchResults(new CSIDESearchResults({ searchTerm: searchStr, file: self, versionId: searchVersionId, results: matches, expanded: expandResults, keepOpen: forceExpand }));
      return searchResults();
    }
    self.close = function() {
      if (self.isLocked()) return;
      self.getProject().closeFile(self, function(closed) {
        if (closed) {
          self.getEditors().forEach(function(ed) {
            ed.close();
          });
          edModel().dispose();
        }
      });
    }
    self.copyTo = function(targetProject) {
      if (typeof targetProject !== "object") return;
      if (inErrState() || !loaded() || saving()) return;
      if (targetProject.isReadOnly()) {
        notification("", "Cannot Move File to Read-Only Project", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      var newPath = targetProject.getPath() + self.getName();
      fh.copyFile(path(), newPath, function(err, fileStat) {
        executeCopy(err);
      });

      function executeCopy(err) {
        if (err) {
          bootbox.alert(err.message);
          console.log(err);
        } else {
          var newFile = new CSIDEFile({
            "path": newPath,
            "source": source,
            "contents": edModel().getValue()
          });
          targetProject.addFile(newFile);
          newFile.load(); //contains _updatePersistenceList()
        }
      }
    }
    self.moveTo = function(targetProject) {
      if (typeof targetProject !== "object") return;
      if (inErrState() || !loaded() || saving() || readOnly()) return;
      if (isImportant) {
        notification("", "Cannot Move Reserved File", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      if (targetProject.isReadOnly()) {
        notification("", "Cannot Move File to Read-Only Project", {
          type: 'error',
          closeWith: ["click"]
        });
        return;
      }
      var currentProject = self.getProject();
      if (targetProject === currentProject) return;
      var newPath = targetProject.getPath() + self.getName();
      fh.renameFile(path(), newPath, function(err) {
        executeMove(err);
      });

      function executeMove(err) {
        if (err) {
          bootbox.alert(err.message);
          console.log(err);
        } else {
          currentProject.removeFile(self);
          path(newPath);
          targetProject.addFile(self);
          __updatePersistenceList();
        }
      }
    }
    self.del = function() {
        if (inErrState() || !loaded() || saving()) return;
        if (isImportant) {
          notification("", "Cannot Delete Reserved File", {
            type: 'error',
            closeWith: ["click"]
          });
          return;
        } else if (readOnly()) {
          notification("", "Cannot Delete Read-Only File", {
            type: 'error',
            closeWith: ["click"]
          });
          return;
        } else {
          bootbox.confirm("<h3>Confirm</h3><p>Are you sure you want to permanently delete '" + self.getName() + "'?</p>" + "<p style='font-size:12px;'>" + path() + "<p>",
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
    var __updateOnModelEdit = __limitExecution(function() {
      if (!saving())
        lastVersionId !== edModel().getAlternativeVersionId() ? dirty(true) : dirty(false);
      if (searchResults().getSearchTerm() != "")
        searchResults().getVersionId !== edModel().getAlternativeVersionId() ? self.search(searchResults().getSearchTerm(), null /* replaceStr */, searchResults() && searchResults().isExpanded() /* forceExpand */, SEARCH.MODES.SEARCH) : null;
      charCount(edModel().getValueLength());
      if (wordCountOn() > 0)
        wordCount(__wordCount(edModel().getValue()));
    }, 250);

    function updateOnModelEdit() {
      __updateOnModelEdit();
    }

  }

  function CSIDEIssue(issueData) {
    var self = this;

    //INSTANCE VARIABLES
    var file = issueData.file || null;
    var project = issueData.project || null;
    if (project === null) {
      if (file) {
        project = file.getProject();
      } else {
        throw new Error("A CSIDEIssue must have a valid project or scene!")
      }
    }
    var desc = issueData.desc || "No description available";
    var lineHandle = null;
    var lineNum = ((typeof issueData.lineNum === "number") && (issueData.lineNum > -1)) ? issueData.lineNum : null;
    var severity = issueData.severity || 2;
    var canDismiss = issueData.canDismiss || false; // runtime errors can be dismissed
    var date, time;

    var d = new Date();
    date = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
    time = d.getHours() + ":" + d.getMinutes();

    //GETTER METHODS
    self.getFile = function() {
      return file;
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
    self.getSeverity = function() {
      return severity;
    }
    self.getIconClasses = function() {
      switch(severity) {
        case monaco.MarkerSeverity.Error:
          return "fa fa-bug error";
        case monaco.MarkerSeverity.Warning:
          return "fa fa-warning warning";
        case monaco.MarkerSeverity.Info:
          return "fa fa-info-circle info";
        default:
          return "fa fa-info-circle";
      }
    }
    self.isActive = function() {
      return activeIssue() === self;
    }
    self.canDismiss = function() {
      return canDismiss;
    }
    self.dismiss = function() {
      project.removeIssue(self);
      if (file) {
        file.removeIssue(self);
      }
    }
    self.show = function() {
      if (!file) {
        return;
      }
      if (typeof self.getLineNum() === "number") {
        file.focusLine(self.getLineNum(), true);
      } else {
        file.viewInEditor();
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
      var options = ko.observableArray([{
        "desc": "on",
        "value": true
      }, {
        "desc": "off",
        "value": false
      }]);
    } else if (type === "number")  {
      value.extend({ notify: 'always', validate: settingData.validate.bind(setting) });
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
      return options ? options() : null;
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
      if (typeof value.isErroneous === "undefined" || !value.isErroneous()) {
        setting.apply(value());
        __updateConfig(); //then write new settings object to localStorage
      }
    });

    setting.max = settingData.max || null;
    setting.min = settingData.min || null;
    setting.step = settingData.step || null;

    setting.extAPI = {
      getName: setting.getName,
      getType: setting.getType,
      getDesc: setting.getDesc,
      getValue: setting.getValue,
      value: value,
      toggle: setting.toggle,
      getOptions: setting.getOptions,
      isVisible: setting.isVisible,
      max: setting.max,
      min: setting.min,
      step: setting.step
    }
  }

  var edId = 0;
  function __createEditorAnchor() {
    var li = document.createElement("LI");
    li.setAttribute("name", "monaco-anchor-" + edId++);
    li.style.flexGrow = "1";
    // hide by default as this might not be for the active project
    li.style.display = "none";
    document.getElementById("editor-list").appendChild(li);
    return li;
  }

  var MIN_EDITOR_WIDTH = 400; /* (pixels) used to auto-inflate active editor size */
  function CSIDEEditor(data) {
    var self = this;
    var _flexSize = ko.observable(1);
    var _pinned = ko.observable(false);
    var _file = ko.observable(data.file || null);
    var _cursorPos = ko.observable({lineNumber: 0, column: 0});
    var _selectedChars = ko.observable(0);
    var _editorDOMAnchor = __createEditorAnchor();
    var _monacoEditor = monaco.editor.create(_editorDOMAnchor, editorOptionStore);

    self.waitForRender = function(func) {
      __onElementRender("li[name='" + self.getAnchor().getAttribute("name") + "'] > div", func);
    }

    self.getName = function() {
      if (!_file()) return "";
      var editorName = _file().getName();
      if (_type === "diff") {
        editorName = "Diff: " + editorName;
      }
    }

    self.saveFile = function() {
      _file().save();
    }

    self.assignAnchor = function(htmlElement) {
      _editorDOMAnchor = htmlElement;
    }

    self.getAnchor = function() {
      return _editorDOMAnchor;
    }

    self.getCursorPositionString = function() {
      if (!_monacoEditor) return "";
      if (!_cursorPos()) return "";
      return "Ln " + (_cursorPos().lineNumber) + ", Col " + _cursorPos().column;
    };

    self.getCharCountString = function() {
      if (!_monacoEditor) return "";
      var charCount = _file().getCharCount();
      if (_selectedChars() > 0) {
        return charCount + " (" + _selectedChars() + ")";
      }
      return charCount;
    };

    self.getWordCountString = function() {
      if (!_monacoEditor) return "";
      var excludeCommands = wordCountOn() > 1;
      var wordCount = _file().getWordCount()[excludeCommands ? "excmds" : "incmds"];
      var suffix = (excludeCommands) ? " [excl. cmds]" : " [inc. cmds]";
      if (_selectedChars() > 0) {
        var counts = __wordCount(_monacoEditor.getModel().getValueInRange(_monacoEditor.getSelection()));
        var selectedCount = (excludeCommands) ? counts.excmds : counts.incmds;
        return (wordCount + (" (" + selectedCount + ") " + suffix));
      }
      return wordCount + suffix;
    };

    self.getDocModel = function() {
      if (_monacoEditor) {
        return _monacoEditor.getModel();
      }
      return null;
    }

    self.setDocModel = function(model) {
      if (_monacoEditor) {
        _monacoEditor.setModel(model);
      }
    }

    self.getMonacoEditor = function() {
      return _monacoEditor;
    }

    self.getFile = function() {
      return _file();
    }

    self.setFile = function(newFile, diffFile) {
      var file = _file();
      if (file.getProject() !== newFile.getProject()) {
        file.getProject().unsubscribeEditor(self);
        newFile.getProject().subscribeEditor(self);
      }
      file.saveEditorViewState(self);
      newFile.loadEditorViewState(self);
      var model = newFile.getModel();
      _monacoEditor.updateOptions(Object.assign(editorOptionStore, { insertSpaces: newFile.usingSpaces(), tabSize: newFile.getIndentSize(), indentSize: newFile.getIndentSize() }));
      _monacoEditor.setModel(model);
      _file(newFile);
    }

    self.getName = function() {
      if (_file())
        return _file().getName();
      return "Empty";
    }

    function _dispose() {
      if (_monacoEditor) _monacoEditor.dispose();
      if (_editorDOMAnchor) {
        // li -> #editor-list
        _editorDOMAnchor.parentElement.removeChild(_editorDOMAnchor);
      }
    }

    self.show = function() {
      if (_editorDOMAnchor) _editorDOMAnchor.style.display = "";
    }

    self.hide = function() {
       if (_editorDOMAnchor) _editorDOMAnchor.style.display = "none";
    }

    self.close = function() {
      var file = _file();
      file.getProject().unsubscribeEditor(self);
      file.saveEditorViewState(self);
      _dispose();
      var aEd = activeEditor();
      if (aEd === self) {
        activeEditor(null);
      }
    }

    self.pin = function() {
      _pinned(true);
    }

    self.unpin = function() {
      _pinned(false);
    }

    self.resize = function(flexSize, project) {
      project = project || activeProject();
      if (!flexSize) {
        var edCount = project.getEditors().length;
        if ((_editorDOMAnchor.parentElement.clientWidth / edCount) < MIN_EDITOR_WIDTH) {
          flexSize = edCount;
        } else {
          flexSize = 1;
        }
      }
      _editorDOMAnchor.style.flexGrow = flexSize;
      _flexSize(flexSize);
    }

    self.makeActive = function() {
      var oldEd = null;
      var isNewProject = activeEditor() && (activeEditor().getFile().getProject() !== activeProject());
      /* TODO: Revisit manual resizing.
         For now this is a simple flexbox hack to keep
         the active editor from getting too small.
       */
      if (oldEd = activeEditor()) {
        oldEd.resize(1, oldEd.getFile().getProject());
      }
      self.resize();
      activeEditor(self);
      if (!_monacoEditor.hasTextFocus()) _monacoEditor.focus();
    }

    self.isActive = function() {
      return activeEditor() === self;
    }

    self.isPinned = function() {
      return _pinned();
    }

    self.flexSize = function() {
      return _flexSize();
    }

    self.getFileStateCSS = function() {
      if (_file().isDirty()) {
        return "codicon codicon-circle-outline";
      } else {
        return "codicon codicon-close";
      }
    }

    self.getPinStateCSS = function() {
      if (_pinned()) {
        return "codicon codicon-pinned";
      } else {
        return "codicon codicon-pin";
      }
    }

    // initialize various monaco editor configurations
    __registerEditorActions(_monacoEditor);
    __overrideEditorServices(_monacoEditor);
    _monacoEditor.onDidFocusEditorText(function() {
      self.makeActive();
    });

    var updateCursorInfo = __limitExecution(function(evt) {
      _selectedChars(_monacoEditor.getModel().getValueInRange(_monacoEditor.getSelection()).length);
      _cursorPos(evt.position);
    }, 250);

    _monacoEditor.onDidChangeCursorPosition(function(evt) {
      updateCursorInfo(evt); // only displays primary selection / cursor
    });
    _cursorPos(_monacoEditor.getPosition());

  }

  // ╔═╗┬ ┬┌┐ ┬  ┬┌─┐  ╔═╗┌─┐┌─┐┌─┐┌─┐
  // ╠═╝│ │├┴┐│  ││    ╚═╗│  │ │├─┘├┤
  // ╩  └─┘└─┘┴─┘┴└─┘  ╚═╝└─┘└─┘┴  └─┘

  var self = this;

  if (usingNode) {
    var CSIDE_version = versions.cside;
    var electron_version = versions.electron;
    //var execPath = (platform === "mac_os") ? process.execPath.substring(0, process.execPath.lastIndexOf('/') + 1) : process.execPath.substring(0, process.execPath.lastIndexOf('\\') + 1);
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
  var projectMenuOptions = ko.observableArray([
    new menuOption("Add new scene", function(menu) {
      menu.getTarget().addNewFile(menu.getTarget(), "untitled");
    }),
    new menuOption("Open all scenes", function(menu) {
      menu.getTarget().openAllScenes();
    }),
    new menuOption("Reload all files", function(menu) {
      menu.getTarget().reloadAllFiles();
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
      new menuOption("All files to folder", function(menu) {
        menu.getTarget().exportFiles();
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

  var fileMenuOptions = ko.observableArray([
    new menuOption("Open", function(menu) {
      //do nothing
    }, [
      new menuOption("In new editor", function(menu) {
        self.openNewEditor(menu.getTarget());
      }),
    ]),
    new menuOption("Edit", function(menu) {
      //do nothing
    }, [
      new menuOption("Convert all spaces to tabs", function(menu) {
        activeEditor().getMonacoEditor().getAction('editor.action.indentationToTabs').run();
      }),
      new menuOption("Convert all tabs to spaces", function(menu) {
        activeEditor().getMonacoEditor().getAction('editor.action.indentationToSpaces').run();
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
      var file = menu.getTarget();
      var callback = function(err, file) {
        if (!err && activeFile() === menu.getTarget()) {
          file.viewInEditor();
        }
      }
      if (file.isDirty()) {
        bootbox.confirm("<h3>Warning</h3><p>The file '" + file.getName() + "' has unsaved changes. Are you sure you wish to reload it?</p>", function(result) {
          if (result)
            file.load(callback);
        });
      } else {
        file.load(callback);
      }
    }),
    new menuOption("Close", function(menu) {
      menu.getTarget().close();
    }),
    new menuOption("Delete file", function(menu) {
      menu.getTarget().del();
    }),
  ]);

  var EditorTagOptions = ko.observableArray([
    new menuOption("Close editor", function(menu) {
      menu.getTarget().close();
    }),
    new menuOption("Close other editors", function(menu) {
      var project = cside.getActiveProject();
      var thisEditor = menu.getTarget();
      var projectEditors = project.getEditors().slice();
      var editorsToClose = projectEditors.filter(function(ed, index) {
        return ed !== thisEditor;
      });
      editorsToClose.forEach(function(ed) { ed.close(); });
    }),
    new menuOption("Close editors to the right", function(menu) {
      var project = cside.getActiveProject();
      var thisEditor = menu.getTarget();
      var projectEditors = project.getEditors().slice();
      var thisEditorIndex = projectEditors.indexOf(thisEditor);
      var editorsToClose = projectEditors.filter(function(ed, index) {
        return index > thisEditorIndex;
      });
      editorsToClose.forEach(function(ed) { ed.close(); });
    }),
    new menuOption("Close all editors", function(menu) {
      var project = cside.getActiveProject();
      var projectEditors = project.getEditors().slice();
      projectEditors.forEach(function(ed) { ed.close(); });
    })
  ]);

  if (usingNode) {
    fileMenuOptions.push(
      new menuOption("Export", function(menu) {
        //do nothing
      }, [
        new menuOption("Copy file to folder", function(menu) {
          var file = menu.getTarget();
          fh.selectFolder(function(error, newPath) {
            if (newPath) {
              bootbox.confirm("<h3>Warning</h3><p>This will <b>overwrite</b> any file with the same name in '<i>" + newPath + "</i>'.<br>Are you sure you wish to continue?</p>",
                function(result) {
                  if (result) {
                    fh.copyFile(file.getPath(), newPath + file.getName(), function(err, data) {
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
                        note = notification("Export Succesful", "Copied " + file.getName() + " to " + newPath, {
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
          window.open("file://" + menu.getTarget().getPath(), {
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
          fh.selectImage(function(error, path) {
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

  var panelStatus = {
    "scene": ko.observable(true),
    "tab": ko.observable(true)
  }

  // these are hoisted intentionally for
  // use in the following definitions (mac menu etc.)
  var activeProject = ko.observable(null);
  var activeEditor = ko.observable(null);
  var activeIssue = ko.observable(null);
  var activeFile = ko.computed(function() {
    return activeEditor() ? activeEditor().getFile() : null;
  }, this);

  self.togglePanel = function(panel, force) {
    // force is an optional boolean
    var project;
    var isOpen = typeof force === "boolean" ? force : !panelStatus[panel]();
    panelStatus[panel](isOpen);
    // resize editors automatically
    var ed;
    if (ed = activeEditor()) {
      ed.resize();
    }
  }
  self.isPanelOpen = function(panel) {
    return panelStatus[panel]();
  }
  var SEARCH = {
    MODES: { SEARCH: 0, REPLACE: 1 },
    CONF: {
      wordSeperators: "`~!@#$%^&*()-=+[{]}\|;:'\",.<>/?",
      // The number of results that triggers an automatic UI collapse
      collapseThreshold: ko.observable(6),
      // Controls whether the find box expects regexes and the replace box replace patterns
      useRegex: ko.observable(false).extend({ callFunc: { func: function() { activeProject().search("", "", SEARCH.MODES.SEARCH); }}}),
      preserveCase: ko.observable(true).extend({ callFunc: { func: function() { activeProject().search("", "", SEARCH.MODES.SEARCH); }}}),
      matchWholeWord: ko.observable(false).extend({ callFunc: { func: function() { activeProject().search("", "", SEARCH.MODES.SEARCH); }}}),
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
        activeProject().search("", "", SEARCH.MODES.SEARCH);
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

  self.issueToggles = [
    { 'text': 'Errors' , 'fa': 'fa fa-bug', 'color': 'salmon', 'state': ko.observable(true), severity: monaco.MarkerSeverity.Error },
    { 'text': 'Warnings', 'fa': 'fa fa-warning', 'color': '#edc979', 'state': ko.observable(true), severity: monaco.MarkerSeverity.Warning },
    { 'text': 'Infos', 'fa': 'fa fa-info-circle', 'color': '#799fed', 'state': ko.observable(true), severity: monaco.MarkerSeverity.Info },
    { 'text': 'Hints', 'fa': 'fa fa-question-circle', 'color': '#b9b9b9', 'state': ko.observable(false), severity: monaco.MarkerSeverity.Hint }
  ]

  self.getActiveIssueTypes= ko.computed(function() {
    var activeTypes = [];
    for (var type = 0; type < self.issueToggles.length; type++) {
      if (self.issueToggles[type].state()) activeTypes.push(self.issueToggles[type].severity);
    }
    return activeTypes;
  });

  /*
  arg.item - the actual item being moved
  arg.sourceIndex - the position of the item in the original observableArray
  arg.sourceParent - the original observableArray
  arg.sourceParentNode - the container node of the original list. Useful if moving items between lists, but within a single array.
    The value of this in the callback will be the target container node.
  arg.targetIndex - the position of the item in the destination observableArray
  arg.targetParent - the destination observableArray
  */
  self.moveEditor = function(arg, event, ui) {
    var list = document.getElementById("editor-list");
    var movingLi = arg.targetParent()[arg.sourceIndex].getAnchor();
    var targetLi = arg.targetParent()[arg.targetIndex].getAnchor();
    if (list.children.length <= arg.targetIndex) {
      list.removeChild(movingLi);
      list.appendChild(movingLi, list.lastElementChild);
    } else if (arg.targetIndex > arg.sourceIndex) {
      list.removeChild(movingLi);
      list.insertBefore(movingLi, targetLi.nextSibling);
    } else {
      list.removeChild(movingLi);
      list.insertBefore(movingLi, targetLi);
    }
    /*var moving = g_editors.indexOf(arg.targetParent[arg.sourceIndex]);
    var target = g_editors.indexOf(arg.targetParent[arg.targetIndex]);
    var cache = g_editors()[moving];
    g_editors.replace(g_editors()[moving], g_editors()[target]);
    g_editors.replace(g_editors()[target], cache);*/
  }

  self.openNewEditor = function(file, callback) {
    // don't allow multiple editors per file
    if (file.isSelected()) {
      file.viewInEditor();
      if (typeof callback === "function") callback(file.getEditors()[0]);
      return;
    }
    var ed = new CSIDEEditor({file: file});
    ed.setFile(file);
    if (file.getProject() === activeProject())
      ed.show();
    file.getProject().subscribeEditor(ed);
    if (typeof callback === "function") callback(ed);
  }

  var reservedSceneNames = "(STARTUP.TXT|CHOICESCRIPT_STATS.TXT)"; //Should be in upper case
  var recentFileColours = ko.observableArray(["#72c374", "#7797ec", "#d9534f", "#a5937a", "#ff8d2b", "#e079f5", "#00a8c3", "#777777"]);
  var uiColour = ko.observable().extend({
    notify: 'always',
    callFunc: { func: function() {
      // refresh header colour on documentation
      if (self.tabs) {
        var path = document.getElementById("help-tab-frame").contentWindow.location.href;
        if (path && path.match(/\.html$/))
          __reloadTab(__getTab("help"), path);
      }
    }}
  });
  uiColour("90,90,90");
  var consoleOpen = ko.observable(false);
  var projects = ko.observableArray([]);
  var allEditors = ko.computed(function() {
    return projects().reduce(function(editors, currentProject, currentIndex, array) {
      return editors.concat(currentProject.getEditors());
    }, []);
  }, this);
  var wordCountOn = ko.observable(true);
  var config;
  var defaultConfig = {
    "settings": {
      "editor": {
        "usespaces": true,
        "smartindent": true,
        "tabsize": 4,
        "indentspaces": 4,
        "linewrap": true,
        "fontsize": "12px",
        "fontfamily": "'Courier New', Courier, monospace",
        "spell_dic": "en_US",
        "theme": "cs-dark",
        "night-mode": false,
        "spellcheck": true,
        "autosuggest": false,
        "autoformat": true,
        "word-count": 1,
        "visible-tabs": false,
        "selection-match": false,
        "cursor-match": false
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
    "recentColours": [],
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
  var editorOptionStore = {
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
    "writeFile": async function(path, data, callback) {
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
            const { error, result: dirName } = await window.electronAPI.getDirName(path);
            if (error) {
              callback(normalizeError(error));
            } else {
              const { error: mkdirErr } = await window.electronAPI.mkdirp(dirName);
              if (mkdirErr) {
                callback(normalizeError(mkdirErr));
              }
              else {
                const { error: writeErr } = await window.electronAPI.writeFile(path, data, { encoding: "utf8" });
                callback(normalizeError(writeErr));
              }
            }
          break;
      }
    },
    "getDropboxImageUrl": function(path, callback) {
      // Dropbox Only
      switch (platform) {
        case "web-dropbox":
          db.filesDownload({path:path})
            .then(function(response) {
              try {
                var url = window.URL.createObjectURL(response.result.fileBlob);
                callback(null, url);
              } catch (err) {
                callback(normalizeError(err));
              }
            })
          .catch(function(err) {
            callback(normalizeError(err));
          });
          break;
        default:
          throw new Error("getDropboxImageUrl is a Dropbox only method!");
      }
    },
    "readFile": async function(path, callback) {
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
              reader.readAsArrayBuffer(fileData.result.fileBlob);
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          const { error, result } = await window.electronAPI.readFile(path, { encoding: 'utf8' });
          callback(normalizeError(error), result);
      }
    },
    "copyFile": async function(oldPath, newPath, callback) {
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
          try {
            const { error: readError, result: fileData } = await window.electronAPI.readFile(oldPath, { encoding: 'utf8' });
            if (readError) throw _decodeError(readError);
            const { error: writeError } = await window.electronAPI.writeFile(newPath, fileData, { encoding: 'utf8' });
            if (writeError) throw _decodeError(writeError);
            callback();
          } catch (err) {
            callback(normalizeError(err));
          }
      }
    },
    "renameFile": async function(oldPath, newPath, callback) {
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
          const { error } = await window.electronAPI.moveFile(oldPath, newPath);
          callback(normalizeError(error));
          break;
      }
    },
    "deleteFile": async function(path, callback) {
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
          const { error } = await window.electronAPI.shell.trash(path);
          callback(normalizeError(error));
          break;
      }
    },
    "readDir": async function(path, callback, dbMetaData) {
      switch (platform) {
        case "web-dropbox":
          path = (path == "/") ? "" : path;
          db.filesListFolder({path:path})
            .then(function(response) {
              // extra db metadata for file explorer
              if (typeof dbMetaData != "undefined" && dbMetaData == true) // standardize path and folder properties
                callback(null, response.result.entries.map(function(item) { item.path = item.path_lower; item.isFolder = (item[".tag"] == "folder"); return item; }));
              // just return an array of paths for standard use
              else
                callback(null, response.result.entries.map(function(item) { return getLastDirName(item.path_lower); }));
            })
            .catch(function(err) {
              callback(normalizeError(err));
            });
          break;
        default:
          const { error, result } = await window.electronAPI.readDir(path);
          callback(normalizeError(error), result);
          break;
      }
    },
    "makeDir": async function(path, callback) {
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
            const { error } = await window.electronAPI.mkdirp(path);
            callback(normalizeError(error));
          break;
      }
    },
    "stat": async function(path, callback) {
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
          let { error, result: fileStats } = await window.electronAPI.statFile(path);
          callback(normalizeError(error), fileStats);
          break;
      }
    },
    "selectFolder": async function(callback) {
      switch (platform) {
        case "web-dropbox":
          fileBrowser.selectFolders(function(selection) {
            if (selection.length > 0) {
              callback(null, selection[0].path + '/');
            } else {
              callback(null, undefined);
            }
          });
          break;
        default:
          let { error, result: path } = await window.electronAPI.selectDir(activeProject() ? activeProject().getPath() : userDetails.path);
          if (path) path = path[0] + '/';
          callback(normalizeError(error), path);
      }
    },
    "selectImage": async function(callback) {
      switch (platform) {
        case "web-dropbox":
          bootbox.alert("TODO: Image scene import not yet implemented on the web-version.")
          break;
        default:
          const { error, result: path } = await window.electronAPI.selectImage(activeProject() ? activeProject().getPath() : userDetails.path);
          if (path) path = path[0] + '/';
          callback(error, path);
      }
    },
    "selectFiles": async function(callback, options) {
      options = options || {};
      if (usingNode) {
        const { error, result: selection } = await window.electronAPI.openFile(activeProject() ? activeProject().getPath() : userDetails.path, {
          options: {
            properties: {
              multiSelections: true,
              filters: options.filters
            }
          }
        });
        callback(error, selection);
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
    if (!err) {
      return null;
    } else if (!(err instanceof Error)) {
      // Serialized from main prcoess, convert back into an error
      err = _decodeError(err);
    }
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
      case 409:
        if (err.error.error_summary !== "path/not_found/")
          break;
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

  function _bootboxSelect(msg, opts, callback, currentValue) {
    function _createWideBootboxBtn(val) {
      var btn = document.createElement("button");
      btn.className = "btn " + ((currentValue == val) ? "btn-primary" : "btn-default");
      btn.innerText = val;
      return btn;
    }

    function _createBootBoxBtnWrapper(msg) {
      var template = document.createElement("template");
      template.innerHTML = ("<div class=\"bootbox-select\"><p></p></div>");
      template.content.firstChild.querySelector("p").innerText = msg;
      return template.content.firstChild;
    }

    var div = _createBootBoxBtnWrapper(msg);
    for (var i = 0; i < opts.length; i++) {
      var btnElement = _createWideBootboxBtn(opts[i]);
      (function(x) { btnElement.addEventListener(
        "click", function() { bootbox.hideAll(); callback(opts[x]); }
        );
      })(i);
      div.appendChild(btnElement);
    }
    bootbox.dialog({ message: div, closeButton: false, onEscape: true });
  }

  self.promptForFileIndentation = function() {
    var types = ["Tabs", "Spaces"];
    var docModel = activeEditor().getDocModel();
    if (!docModel) return;
    _bootboxSelect("Select Indentation Unit", types,
      function(unitOpt) {
        var useSpaces = (unitOpt === "Spaces");
        var setting = settings.byId("editor", useSpaces ? "indentspaces" : "tabsize");
        self.getActiveFile().updateUseSpaces(useSpaces);
        __promptForInteger(function(value, errmsg) {
          if (value) {
            self.getActiveFile().updateIndentSize(value);
          } else if (errmsg) {
            bootbox.alert("Invalid value: " + errmsg);
          } else {
            // user cancelled / didn't give a value
          }
        }, "Indentation Size", setting.getValue(), { max: setting.max, min: setting.min });
      }, types[Number(docModel.getOptions().insertSpaces)]
    );
  }

  self.footerBtnHover = function(IDEmodel, evt) {
    var ele = evt.currentTarget;
    switch (evt.type) {
      case "mousedown":
        ele.style.backgroundColor = this.getUIColour(-20);
        break;
      case "mouseover":
        ele.style.backgroundColor = this.getUIColour(-10);
        break;
      case "mouseup":
      case "mouseout":
        ele.style.backgroundColor = "transparent";
        break;
      default:
        return;
    }
  }

  var dropboxAuthorised = ko.observable(false);

  //GETTER METHODS
  self.dbAuth = ko.computed(function() {
    return dropboxAuthorised();
  }, this);
  self.getProjects = projects;
  self.getActiveEditor = ko.computed(function() {
    return activeEditor();
  }, this);
  self.getActiveFile = ko.computed(function() {
    return activeFile();
  }, this);
  self.getActiveProject = ko.computed(function() {
    return activeProject();
  }, this);
  self.getRecentFileColours = ko.computed(function() {
    return recentFileColours();
  }, this);
  self.getPlatform = function() {
    return platform;
  }
  self.wordCountOn = ko.computed(function() {
    return wordCountOn();
  });
  self.getUIColour = function(delta) {
    delta = delta || 0;
    if (self.isInNightMode()) {
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
  self.isInNightMode = function() {
    return config.settings.app["night-mode"];
  }

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
  self.getDropboxImageUrl = function(url, callback) {
    fh.getDropboxImageUrl(url, callback);
  };
  self.selectFileClick = function(file, event) {
    var aProject = activeProject();
    var nProject = file.getProject();
    var tProject = (aProject !== nProject) ? nProject : aProject;
    if (file.isSelected()) {
      file.viewInEditor();
      return;
    } else if (!event.shiftKey) {
      var editor = __getFreeEditor(tProject);
      if (editor) {
        editor.setFile(file);
        file.viewInEditor();
        return;
      }
    }
    self.openNewEditor(file, function(ed) {
      if (ed) file.viewInEditor();
    });
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
    var fullScreen = ko.observable(false);
    return {
      "isFullscreen": ko.computed(function() {
        return fullScreen();
      }, this),
      "toggleMaximize": function() {
        if (fullScreen()) {
          platform === "mac_os" ? window.electronAPI.window.setFullScreen(false) : window.electronAPI.window.restore();;
        } else {
          platform === "mac_os" ? window.electronAPI.window.setFullScreen(true) : window.electronAPI.window.maximize();
        }
        fullScreen(!fullScreen());
      },
      "close": function() {
        if (cside.session.isDirty() || cside.getProjects().length === 0) {
            bootbox.dialog({
              message: "One or more scenes has unsaved changes, are you sure you want to quit?",
              title: "Unsaved Changes",
              buttons: {
                yes: {
                  label: "Don't save",
                  className: "btn-primary",
                  callback: function() {
                    window.electronAPI.process.exit();
                  }
                },
                saveandquit: {
                  label: "Save & Quit",
                  callback: function() {
                    var n = cside.notification("", "<i aria-hidden=true class='fa fa-refresh fa-spin'></i> Saving files. Please do not close CSIDE.", { closeWith: false, timeout: false });
                    cside.session.save(function(err) {
                      n.close();
                      if (!err) {
                        window.electronAPI.process.exit();
                      } else {
                        cside.notification("Error", "Failed to save one or more files. App will not exit.", { type: "error" });
                      }
                    });
                  }
                },
                no: {
                  label: "Cancel",
                  callback: function() {
                    return;
                  }
                }
              }
          });
        } else {
          window.electronAPI.process.exit();
        }
      }
    }
  }();

  function __registerEditorActions(editor) {

    editor.addAction({
      id: 'ignore-word',
      label: 'Ignore Word this Session',
      contextMenuGroupId: "1_modification",
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var wordObj = ed.getModel().getWordAtPosition(ed.getSelection().getStartPosition());
        if (wordObj) {
          editor.trigger("", `add-words`, {uri: "", dict: "session", words: [wordObj.word]});
        }
      }
    });

    editor.addAction({
      id: 'add-word-to-dictionary',
      label: 'Add Word to Dictionary',
      contextMenuGroupId: "1_modification",
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var wordObj = ed.getModel().getWordAtPosition(ed.getSelection().getStartPosition());
        if (wordObj) {
          editor.trigger("", `add-words`, {uri: "", dict: "persistent", words: [wordObj.word]});
        }
      }
    });

    editor.addAction({
      id: 'replace-project-files',
      label: 'Replace in Project Files',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        if (!cside.getActiveProject())
          return;
        cside.toggleSearchMode(SEARCH.MODES.REPLACE);
        __selectTab("search");
        cside.togglePanel("tab", true /* open */);
        document.getElementById("replaceBox").focus();
      }
    });

    editor.addAction({
      id: 'search-project-files',
      label: 'Search Project Files',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        if (!cside.getActiveProject())
          return;
        cside.toggleSearchMode(SEARCH.MODES.SEARCH);
        __selectTab("search");
        cside.togglePanel("tab", true /* open */);
        document.getElementById("searchBox").focus();
      }
    });

    editor.addAction({
      id: 'save-selected-file',
      label: 'Save Selected File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveEditor().saveFile();
        return null;
      }
    });

    editor.addAction({
      id: 'select-previous-file',
      label: 'Select Previous File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.PageUp,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        __cycleFileSelection(true);
      }
    });

    editor.addAction({
      id: 'select-next-file',
      label: 'Select Next File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.PageDown,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        __cycleFileSelection(false);
      }
    });

    editor.addAction({
      id: 'close-selected-file',
      label: 'Close Selected File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveEditor().close();
        return null;
      }
    });

    editor.addAction({
      id: 'add-new-scene',
      label: 'Add New Scene',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var project = cside.getActiveProject();
        project.addNewFile(project, "untitled");
        return null;
      }
    });

    editor.addAction({
      id: 'save-selected-project',
      label: 'Save Selected Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveProject().save();
        return null;
      }
    });

    editor.addAction({
      id: 'close-selected-project',
      label: 'Close Selected Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveProject().close();
        return null;
      }
    });

    editor.addAction({
      id: 'create-project',
      label: 'Create Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
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
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.togglePanel("scene");
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-tab-panel',
      label: 'Toggle Tab Panel',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.togglePanel("tab");
        return null;
      }
    });

    editor.addAction({
      id: 'increase-font-size',
      label: 'Increase Editor Font Size',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var fontSizeSetting = settings.byId("editor", "fontsize");
        var value = fontSizeSetting.getValue();
        if (value < fontSizeSetting.min) {
          fontSizeSetting.setValue(fontSizeSetting.min);
        } else if (value < fontSizeSetting.max) {
          fontSizeSetting.setValue(++value);
        }
        return null;
      }
    });

    editor.addAction({
      id: 'decrease-font-size',
      label: 'Decrease Editor Font Size',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var fontSizeSetting = settings.byId("editor", "fontsize");
        var value = fontSizeSetting.getValue();
        if (value > fontSizeSetting.max) {
          fontSizeSetting.setValue(fontSizeSetting.max);
        } else if (value > fontSizeSetting.min) {
          fontSizeSetting.setValue(--value);
        }
        return null;
      }
    });

    editor.addAction({
      id: 'open-all-scenes',
      label: 'Open All Scenes',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveProject().openAllScenes();
        return null;
      }
    });

    editor.addAction({
      id: 'open-file-browser',
      label: 'Open File Browser',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveProject().test("quick");
        return null;
      }
    });

    editor.addAction({
      id: 'randomtest-project',
      label: 'Randomtest Project',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        cside.getActiveProject().test("random");
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
        cside.getActiveProject().run();
        return null;
      }
    });

    editor.addAction({
      id: 'toggle-console',
      label: 'Toggle ChoiceScript Console',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
      ],
      precondition: null,
      keybindingContext: null,
      run: function(ed) {
        var open = cside.getActiveProject().toggleConsole();
        if (open) $("#cs-console > input").focus();
      }
    });

  }

  var insertTextTags = function(tagStart, tagEnd, allowSpecialLines) {
    ed = activeEditor();
    if (!ed) return;
    ed = ed.getMonacoEditor();
    var text = ed.getModel().getValueInRange(ed.getSelection());
    if (!text) {
      text = tagStart + tagEnd;
      var currentSel = ed.getSelection();
      var originalSel = Object.assign({}, currentSel);
      currentSel = ed.getModel().pushEditOperations(
        [originalSel], // Return to original pos on undo
        [{range: new monaco.Range(originalSel.startLineNumber, originalSel.startColumn, originalSel.startLineNumber, originalSel.startColumn), text: text }],
        function (inverseEditOperations) { // Set cursor between tags post-edit
          currentSel.startColumn = currentSel.selectionStartColumn = currentSel.positionColumn = (currentSel.startColumn + tagStart.length);
          return [currentSel];
        }
      );
      if (currentSel)
        ed.setSelection(currentSel[0]);
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
      ed.executeEdits("insertTextTags", [{range: ed.getSelection(), text: text }]);
    }
  }

  var __csideTabs = {
    "game": {
      "id": "game",
      "title": "Game",
      "showTitle": true,
      "iconClass": function() { return "fa fa-cube" },
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
      "iconClass": function() { return "fa fa-exclamation-triangle"; },
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "notificationCount": ko.computed(function() {
        var ap;
        if (ap = activeProject()) {
          var issueCount = ap.issueCount()
          return (issueCount > 99) ? "99+" : issueCount;
        }
        return 0;
      }),
      "getHeaderTitle": ko.computed(function() {
        return (activeProject() ? ("Issues with " + activeProject().getName()) : "Select a Project");
      }, this)
    },
    "settings": {
      "id": "settings",
      "title": "Settings",
      "showTitle": false,
      "iconClass": function() { return "fa fa-cog" },
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ""
    },
    "help": {
      "id": "help",
      "title": "Help & Information",
      "showTitle": true,
      "iconClass": function() { return "fa fa-question-circle" },
      "href": ko.observable("help/site/index.html"),
      "onload": function() {
        //__csideTabs["help"].href(this.contentWindow.location);
      },
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ""
    },
    "search": {
      "id": "search",
      "title": "Search and Replace",
      "showTitle": true,
      "iconClass": function() { return "fa fa-search" },
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": ko.computed(function() {
        return (activeProject() ?  ((self.inReplaceMode()) ? "Replace" : "Search") + " in " + activeProject().getName() : "Select a Project");
      }, this)
    },
    "dictionary": {
      "id": "dictionary",
      "title": "User Dictionary",
      "showTitle": true,
      "iconClass": function() { return "fa fa-book" },
      "href": "",
      "content": "",
      "visible": ko.observable(true),
      "getHeaderTitle": "User Dictionary"
    },
    "examples": {
      "id": "examples",
      "title": "Example Projects & Templates",
      "showTitle": true,
      "iconClass": function() { return "fa fa-lightbulb-o" },
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
    const examplesPath = `${appPath}/cs_examples/`;
    self.cs_examples = [
      {
        title: "Interactive CSIDE Tutorial",
        desc: "A great starting point tutorial - developed by Vendetta. Useful for those new to both Choicescript and the Choicescript IDE.",
        path: `${examplesPath}CSIDE Tutorial/`
      },
      {
        title: "ChoiceScript Basics Tutorial",
        desc: "A simple tutorial template by FairyGodfeather. This example project is designed to get you started with handling name, gender and relationship stats in your ChoiceScript games. A great starting point for any new project!",
        path: `${examplesPath}Basics Tutorial/`

      },
      {
        title: "Pronouns with Gender-Neutral Options Template",
        desc: "A template for including gender neutral pronouns in your game (they/them), created by Lynnea Glasser. This includes a variable system to make sure your verbs and pronouns will match (\"They go on ahead\"/\"She goes on ahead\").",
        path: `${examplesPath}GNO Pronoun Template/`
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

  function __cycleFileSelection(direction) {
    // "up" = true / "down" = false
    if (!cside.getActiveProject())
      return;
    var index;
    var currentEditor = cside.getActiveEditor();
    var currentFile = cside.getActiveFile();
    var newFile = null;
    var fileList = cside.getActiveProject().getFiles();
    var index = fileList.indexOf(cside.getActiveFile());
    if (!currentFile || index < 0)
      return null;
    while (!newFile && newFile !== currentFile) {
      if (direction) {
        if (index > 0) {
          newFile = fileList[--index];
        } else {
          newFile = fileList[fileList.length - 1];
          index = [fileList.length - 1];
        }
      } else {
        if (index < (fileList.length - 1)) {
          newFile = fileList[++index];
        } else {
          newFile = fileList[0];
          index = 0;
        }
      }
      if (newFile === currentFile) break;
      if (newFile.isSelected()) newFile = null;
      else { currentEditor.setFile(newFile); }
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

  /* Returns an unpinned editor if one is available,
     preferring the currently active editor. */
  function __getFreeEditor(project) {
    var editor;
    if (!project) {
      project = activeProject();
    }
    if (project === activeProject()) {
      editor = activeEditor();
    }
    if (!editor || editor.isPinned()) {
      if (project) {
        editor = project.getEditors().find(function(ed) {
          return !ed.isPinned();
        });
      }
    }
    return editor;
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
          __applyToAllEditors("wordWrap", val ? "on" : "off");
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
          __applyToAllEditors("quickSuggestions", val);
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
          __applyToAllEditors("formatOnType", val);
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
          __applyToAllEditors("selectionHighlight", val);
        }
      }),
      new CSIDESetting({
        "id": "cursor-match",
        "name": "Cursor Match",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Highlights other instances of the word under the editor caret",
        "apply": function(val) {
          __applyToAllEditors("occurrencesHighlight", val);
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
          __applyToAllEditors("renderIndentGuides", val);
        }
      }),
      new CSIDESetting({
        "id": "spellcheck",
        "name": "Spell Check",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Underline any misspelt words in active scenes",
        "apply": function(val) {
          // enable/disable editor diagnostics
          var monacoOptions = __getMonacoDiagnosticOptions();
          monacoOptions.spellcheck.enabled = Boolean(val);
          __updateMonacoDiagnosticOptions(monacoOptions);
          if (val) {
            this.handle = monaco.languages.choicescript.onDictionaryChange((dictEvent) => {
              for (var i = 0; i < dictEvent.words.length; i++) {
                if (dictEvent.removed) {
                  userDictionary.remove(dictEvent.words[i], dictEvent.dictionary);
                } else {
                  userDictionary.add(dictEvent.words[i], dictEvent.dictionary);
                }
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
      new CSIDESetting({
        "id": "usespaces",
        "name": "Use Spaces for Indentation",
        "value": true,
        "type": "binary",
        "cat": "editor",
        "desc": "Sets the preferred indentation unit to spaces (on) or tabs (off). Note that this will only be applied to newly created files. This setting can be overridden per file.",
        "apply": function(val) {} // only adjusts value for new files
      }),
      new CSIDESetting({
        "id": "tabsize",
        "name": "Tab/Indent Block Size",
        "value": "4",
        "type": "number",
        "cat": "editor",
        "min": 1,
        "max": 12,
        "step": 1,
        "desc": "Sets the default visual size of tabs. This setting can be overridden per file.",
        "validate": function(newValue) {
          var message = "Invalid value";
          newValue = parseInt(newValue);
          var valid = !isNaN(newValue);
          if (valid) {
            if (newValue < this.min) {
              valid = false;
              message = "Value should be greater than or equal to " + this.min;
            } else if (newValue > this.max) {
              valid = false;
              message = "Value should be less than or equal to " + this.max;
            }
          }
          return { valid: valid, message: message }
        },
        "apply": function(val) {}, // only adjusts value for new files
      }),
      new CSIDESetting({
        "id": "indentspaces",
        "name": "Space Indentation Size",
        "value": "4",
        "type": "number",
        "cat": "editor",
        "min": 1,
        "max": 12,
        "step": 1,
        "desc": "Sets the preferred number of spaces used for indentation. Note that this will only be applied to newly created files. This setting can be overridden per file.",
        "validate": function(newValue) {
          var message = "Invalid value";
          newValue = parseInt(newValue);
          var valid = !isNaN(newValue);
          if (valid) {
            if (newValue < this.min) {
              valid = false;
              message = "Value should be greater than or equal to " + this.min;
            } else if (newValue > this.max) {
              valid = false;
              message = "Value should be less than or equal to " + this.max;
            }
          }
          return { valid: valid, message: message }
        },
        "apply": function(val) {} // only adjusts value for new files
      }),
      new CSIDESetting({
        "id": "fontsize",
        "name": "Font Size (px)",
        "value": "12",
        "type": "number",
        "cat": "editor",
        "min": 8,
        "max": 30,
        "step": 1,
        "desc": "The size of the font in the editor window",
        "validate": function(newValue) {
          var message = "Invalid value";
          newValue = parseInt(newValue);
          var valid = !isNaN(newValue);
          if (valid) {
            if (newValue < this.min) {
              valid = false;
              message = "Value should be greater than or equal to " + this.min;
            } else if (newValue > this.max) {
              valid = false;
              message = "Value should be less than or equal to " + this.max;
            }
          }
          return { valid: valid, message: message }
        },
        "apply": function(val) {
          __applyToAllEditors("fontSize", val);
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
          __applyToAllEditors("fontFamily", val);
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
          // unfortunately we need an editor instance to grab theme information
          // and the console editor is the only one guaranteed to be available
          editor = monacoConsole;
          if (editor._themeService._knownThemes.size > (self.getOptions().length + BASE_THEMES.length)) {
            var options = [];
            editor._themeService._knownThemes.forEach(function(theme) {
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
          editorOptionStore["theme"] = val;
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
        "name": "Autosave Files & Projects",
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
        "desc": "Retain open file & project data between sessions",
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
          __applyToAllEditors("hover", { enabled: val });
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
              var userDir = '/Users/Carey';
            }
            var path = usingNode ? (userDir + "/Documents/Choicescript Projects/") : ("/Choicescript Projects/");
            self.setDesc(path);
            userDetails.path = path;
          } else if (val == "select") {
            fh.selectFolder(function(error, path) {
              if (path) {
                /* this is a bit hacky, ideally I will improve settings management to allow for proper custom value settings CJW */
                path = __normalizePath(path); //deal with Windows backslashes etc.
                self.setValue(path);
                self.setDesc(path);
                userDetails.path = path;
                config.settings[self.getCat()][self.getId()] = path;
                __updateConfig();
              }
            });
            //make sure 'select' isn't the option stored in config
            self.setValue(userDetails.path);
            config.settings[self.getCat()][self.getId()] = userDetails.path;
            __updateConfig();
          } else {
            self.setDesc(val);
            userDetails.path = val;
          }
        }
      }),
      new CSIDESetting({
        "id": "allowscript",
        "name": "Allow Script",
        "value": false,
        "type": "binary",
        "desc": "Enables usage of the \*script command in your ChoiceScript games.",
        "apply": function(val) {
          if (platform === "web-dropbox")
            this.setVisibility(false);
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
            var autoUpdate = async function() {
              if (self.prompt && !self.prompt.closed) // prevent notification stacking
                return;
              var n = notification("", "<i aria-hidden=true class='fa fa-refresh fa-spin'></i> Checking for updates...", { closeWith: false, timeout: false });
              const { error, result: updateDetails } = await window.electronAPI.updates.check(versions, channel);
              n.close();
              if (error) {
                notification("Connection Error", "Failed to obtain update data from server. " + error.message, { type: "error" });
              } else if (updateDetails) {
                self.prompt = __showUpdatePrompt(channel, updateDetails);
              }
            }
            autoUpdateCheckFn = setInterval(autoUpdate, 1000 * 60 * 60);
            autoUpdate();
          }
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

  var monacoConsole = null;

  var consoleCmdBuf = [];
  var consoleCmdBufPtr = 0;
  var consoleIndicator = ko.observable(0);
  self.consoleInput = function(keyCode) {
    var consoleCommands = /^\*(console_)?(clear|track|untrack|track_all_off|track_all_on|track_list|help)/
    var validCSCommands = /^\*(?:set|temp|rand|achieve|restart|goto|goto_scene)/
    if (!keyCode) {
      return;
    }
    var input = monacoConsole.getValue();
    if (keyCode === monaco.KeyCode.UpArrow) {
      if (consoleCmdBuf.length <= 0) return;
      if (--consoleCmdBufPtr < 0) {
        consoleCmdBufPtr = (consoleCmdBuf.length - 1);
      }
      monacoConsole.setValue(consoleCmdBuf[consoleCmdBufPtr]);
    } else if (keyCode === monaco.KeyCode.DownArrow) {
      if (consoleCmdBuf.length <= 0) return;
      if (++consoleCmdBufPtr > (consoleCmdBuf.length - 1)) {
        consoleCmdBufPtr = 0;
      }
      monacoConsole.setValue(consoleCmdBuf[consoleCmdBufPtr]);
    }
    if (!input || keyCode !== monaco.KeyCode.Enter) {
      return;
    }
    if (consoleCmdBuf.length > 9) {
      consoleCmdBuf.shift(); //keep no more than 10 entries
    }
    consoleCmdBuf.push(input);
    consoleCmdBufPtr = consoleCmdBuf.length;
    activeProject().logToConsole(input, input.substring(0,1) == "*" ? "cm-builtin" : "cm-variable");
    // Must have a running game
    var gameFrame = document.getElementById("game-tab-frame").contentWindow || document.getElementById("#game-tab-frame");
    if (typeof gameFrame === 'undefined' || typeof gameFrame === 'undefined') {
      activeProject().logToConsole("Error: no choicescript game running", "cm-error");
      monacoConsole.setValue("");
      return;
    }
    // Prevent the confusing use of commands through non active project consoles
    if (activeProject() != activeProject()) {
      activeProject().logToConsole("Error: this project is not the one running", "cm-error");
      monacoConsole.setValue("");
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
              gameFrame.postMessage({ type: "runCommand", cmd: "CSIDEConsole_goto", input: input });
            }
            else {
              input = input.replace(/^\*goto_scene\s+/, "");
              gameFrame.postMessage({ type: "runCommand", cmd: "CSIDEConsole_goto_scene", input: input });
            }
          } else {
            gameFrame.postMessage({ type: "runCommand", cmd: null, input: input });
          }
        } else {
          activeProject().logToConsole("Error: invalid console command", "cm-error");
        }
      } else { //assume expression:
        gameFrame.postMessage({ type: "runCommand", cmd: "CSIDEConsole_eval_expr", input: input });
      }
    } catch (e) {
      //strip error scene & line num - as the information is irrelevant
      e.message = e.message.replace(/line [0-9]+ of\s\w+: /, "");
      activeProject().logToConsole("Error: " + e.message, "cm-error");
    }
    monacoConsole.setValue("");
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
  self.openFileBrowser = async function() {
    fh.selectFiles(function(error, selection) {
      if (error) {
        bootbox.alert("<h3>Error</h3>" + error.message);
        return;
      } else if (selection && selection.length >= 1)  {
        __openFiles(selection, true);
      }
    }, { name: 'Scenes', extensions: ['txt', 'log'] });
  }

  function __openFiles(paths, selectLast) {
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
            if (!err) scene.viewInEditor();
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
          if (userDictionary.persistentList.hasOwnProperty(i)) {
            userDictionary.persistentListArray.push(i);
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
        if (!userDictionary.validateWord(arr[i]))
          throw new Error("Error: Invalid entry (not a word): " + arr[i]);
        else if (userDictionary.persistentList[arr[i]] !== true)
          throw new Error("Error: Entry value should be 'true' for: " + arr[i])
    },
    "import": async function() {
      var path;
      fh.selectFiles(async function(error, selection) {
        if (error) {
          bootbox.alert("<h3>Error</h3>" + error.message);
          return;
        } else if (!selection || selection.length < 1) {
          return;
        }
        path = selection[0];
        if (selection.length > 1 || getFileExtension(path) != ".json") {
          bootbox.alert("<h3>Error</h3>Please select a single valid JSON file.");
          return;
        }
        bootbox.confirm("Are you sure you wish to import this dictionary?<br>All words from the current dictionary will be lost.", async function(result) {
          if (result) {
            const { error, result: data } = await window.electronAPI.readFile(path);
            if (error) {
              notification("Failed to Read Dictionary", path, {
                type: 'error'
              });
            } else {
              try {
                userDictionary.persistentList = JSON.parse(data);
                userDictionary.sanitize();
                userDictionary.update();
                userDictionary.removeAll();
                userDictionary.load();
                notification("Dictionary Import Succesful", path, {
                  type: 'success'
                });
              } catch(err) {
                notification("Dictionary Import Failed", path, {
                  type: 'error'
                });
                throw err;
              }
            }
          }
        });
      }, { name: 'JSON', extensions: ['json'] });
    },
    "export": function() {
      var path;
      fh.selectFolder(function(error, url) {
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
  self.filterString = ko.observable("").extend({
    notify: 'always',
    validate: function(value) {
      try {
        if (SEARCH.CONF.useRegex()) {
          new RegExp(value);
        }
        return { valid: true, message: "" };
      }
      catch(e) {
        return { valid: false, message: "Error: Filter string is not a valid regular expression" };
      }
    }
  });
  self.addToDictionary = function(obj, e) {
    if (e.type == "click" || e.type == "keyup" && e.keyCode == 13) {
      if (!userDictionary.validateWord(self.dictWord())) {
        bootbox.alert("<h3>Error</h3>Unable to add to user dictionary: not a word!");
        return;
      }
      monacoConsole.trigger("", `add-words`, {uri: "", dict: "persistent", words: [self.dictWord()]});
    }
  };
  self.removeFromDictionary = function(word) {
    monacoConsole.trigger("", `remove-words`, {uri: "", dict: "persistent", words: [word]});
  };
  self.getDictionaryArray = ko.computed(function() {
    var query = self.dictWord();
    if (query == "")
      return userDictionary.persistentListArray().sort();
    return userDictionary.persistentListArray().filter(function(word) { return word.startsWith(query); } ).sort();
  }, this);

  self.init = async function() {

    if (usingNode) {
      window.electronAPI.handleNotification((event, message) => {
        bootbox.alert(message);
      });
    }

    monaco.editor.onDidChangeMarkers(function(uri) {
      for (var i = 0; i < uri.length; i++) {
        var project = getProject(getProjectPath(uri[i].path));
        if (project) {
          var markers = monaco.editor.getModelMarkers({resource: uri[i], take: 500 });
          var file = project.getFiles().find(function(f) {
            return f.getPath() === uri[i].path;
          });
          var newIssues = markers.map(function(m) {
            return new CSIDEIssue({ file: file, lineNum: m.startLineNumber, desc: m.message, severity: m.severity });
          });
          if (file) file.setMarkerIssues(newIssues);
        }
      }
    });

    // Create the "console" input as a single-line Monaco Editor instance
    // to allow for more interactive behaviour in the future.
    // This is a bit hacky as there is no official support right now.
    // See: https://github.com/microsoft/monaco-editor/issues/2009
    monacoConsole = monaco.editor.create(document.getElementById("monaco-console-input"), {
      wordWrap: 'off',
      lineNumbers: 'off',
      lineNumbersMinChars: 0,
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      lineDecorationsWidth: 0,
      hideCursorInOverviewRuler: true,
      glyphMargin: false,
      folding: false,
      scrollBeyondLastColumn: 0,
      scrollbar: {horizontal: 'hidden', vertical: 'hidden'},
      find: { addExtraSpaceOnTop: false, autoFindInSelection: 'never', seedSearchStringFromSelection: false },
      minimap: {enabled: false},
      language: "choicescript",
      lineHeight: "30px",
      fontSize: "12px",
      renderValidationDecorations: "off",
      contextmenu: false,
      hover: { enabled: false },
      suggestOnTriggerCharacters: false,
      lightbulb: { enabled: false },
      parameterHints: { enabled: false },
      quickSuggestions: false
    });

    monacoConsole.onKeyDown(e => {
      switch(e.keyCode) {
        case monaco.KeyCode.Enter:
        case monaco.KeyCode.UpArrow:
        case monaco.KeyCode.DownArrow:
          self.consoleInput(e.keyCode);
          e.preventDefault();
          break;
        default:
          return;
      }
    });

    monaco.cside = {};

    // Patch in replace pattern support for find/replace with regexes
    amdRequire(['vs/editor/contrib/find/browser/replacePattern'], function(replacePattern) {
      monaco.cside.parseReplaceString = replacePattern.parseReplaceString;
      monaco.cside.getReplaceString = function(replaceStr, matches, preserveCase) {
        return replacePattern.parseReplaceString(replaceStr).buildReplaceString(matches, preserveCase);
      }
    });

    if (usingNode) {
      // Load user-themes for the editor
      const { error, result: userPath } = await window.electronAPI.app.getPath('userData');
      if (userPath) {
        const themeDir = userPath + "/userThemes";
        var themeData = await __loadEditorCustomThemes(themeDir);
        if (themeData.err && themeData.err.code === "ENOENT") {
          try {
            const { error } = await window.electronAPI.mkdirp(themeDir);
            if (error) throw normalizeError(error);
            themeData = await __loadEditorCustomThemes(themeDir);
          } catch (err) {
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
      } else {
        error = normalizeError(error);
        notification("Unable to Get Custom Directory",
          error.message, {
          type: "error",
          layout: "bottomRight"
        });
      }
    }

    if (!usingNode) {
      userDetails.name = "dropbox-user";
    }
    if (config.settings.app.persist) {

      // load preferred file colour swatches
      if (Array.isArray(config.recentColours) && (config.recentColours.length > 0))
        recentFileColours(config.recentColours);

      var thisProjectData = [];
      for (var i = 0; i < config.openProjects.length; i++) {
        thisProjectData = config.openProjects[i];
        var project = new CSIDEProject(thisProjectData);
        __addProject(project);
        for (var n = 0; n < thisProjectData.openScenes.length; n++) {
          var file = new CSIDEFile(thisProjectData.openScenes[n]);
          project.addFile(file);
          file.load();
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

    // force redraw of the scene panel based on display width
    cside.togglePanel("scene", true /* open */);

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

    // hide preload screen
    document.getElementById("preload").style.opacity = 0;
    document.getElementById("preload").style.visibility = "hidden";
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
    var type = sceneOrProject.constructor.name.substring("CSIDE".length, sceneOrProject.constructor.name.length);
    var title = (type + " - " + sceneOrProject.getName());
    var counts = sceneOrProject.getWordCount();
    var msg = "<h5>Word Count</h5> \
      Including command lines: " + counts.incmds +
      "<br>Excluding command lines: " + counts.excmds;
    msg += "<br>Characters: " + sceneOrProject.getCharCount();
    msg += "<br><br>Please note that these figures are only approximations.<br>Project word counts only include those of open scenes.";
    bootbox.alert({message: msg, title: title});
  }

  function __updateMonacoDiagnosticOptions(diagOptions) {
    monaco.languages.choicescript.setDiagnosticsOptions(diagOptions);
  }

  function __getMonacoDiagnosticOptions() {
    return monaco.languages.choicescript.diagnosticsOptions;
  }


  // OVERRIDE INTERNAL MONACO EDITOR SERVICES
  function __overrideEditorServices(monacoEditorInst) {
    // Links in Monaco use a data-href attribute rather than the href attribute.
    // This means NWJS's new-win-policy event can't determine the url/target.
    // Thus we need to patch in an alternative handler here.
    monacoEditorInst.getContribution('editor.linkDetector').openerService._externalOpener = {
      openExternal: function(href) {
        if (usingNode) {
          // handled by electron/main.js
        } else if (matchesScheme(href, Schemas.http) || matchesScheme(href, Schemas.https)) {
          dom.windowOpenNoOpener(href);
        } else {
          window.location.href = href;
        }
        return Promise.resolve(true);
      }
    }

    // Make sure Monaco will look at more than just the editor's attached model.
    monacoEditorInst._codeEditorService.findModel = function (editor, resource) {
      const model = editor.getModel();
      if (!resource)
        return model;
      if (model && model.uri.toString() !== resource.toString()) {
        var newModel = monaco.editor.getModel(resource.toString());
        return newModel;
      }
      return model;
    }

    // Teach Monaco how to select new files in CSIDE.
    monacoEditorInst._codeEditorService.doOpenEditor = function (editor, input) {
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
        model.csideFile.viewInEditor(function(ed) {
          if (ed) {
            var med = ed.getMonacoEditor();
            ed.waitForRender(function() {
              var selection = (input.options ? input.options.selection : null);
              if (selection) {
                if (typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
                  med.setSelection(selection);
                  med.revealRangeInCenter(selection, 1);
                }
                else {
                  var pos = {
                    lineNumber: selection.startLineNumber,
                    column: selection.startColumn
                  };
                  med.setPosition(pos);
                  med.revealPositionInCenter(pos, 1);
                }
                med.focus();
              }
            });
          }
        });
      }
    }
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
      pathExists(project + imgSceneName, function(exists) {
        if (exists) {
          bootbox.prompt({
            title: "That Image Already Exists - Copy & Paste Code Below",
            value: "*gosub_scene " + imgSceneName,
            callback: function(result) {}
          });
        } else {
          var newScene = new CSIDEFile({
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

  function __promptForInteger(callback, title, placeholder, options) {
    // options = { min, max }
    bootbox.prompt({
      title: title || "Please enter text",
      value: placeholder || "",
      callback: function(input) {
        newVal = Number(input);
        isInteger = Number.isInteger(newVal);
        if (!input) {
          callback("", (input === null) ? "" : "no input"); // cancelled / empty
        } else if (isNaN(newVal)) {
          callback("", "not a number");
        } else if (!Number.isInteger(newVal)) {
          callback("", "not an integer");
        } else {
          if (options) {
            if (newVal > options.max) {
              callback("", newVal + " should be less than or equal to " + options.max);
            } else if (newVal < options.min) {
              callback("", newVal + " should be greater than or equal to " + options.min);
            } else {
              callback(newVal);
            }
          }
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
              if (!val[key].match(/^#[0-9A-Fa-f]{6,8}$/)) {
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
  async function __loadEditorCustomThemes(themeDir) {
    var result = { err: null, themes: [] };
      try {
        const { error, result: themeFiles } = await window.electronAPI.readDir(themeDir).filter(function(file) {
          return getFileExtension(file) === ".json";
        });
        if (error) throw _decodeError(err);
        themeFiles.forEach(async function(theme) {
          var themePath = themeDir + "/" + theme;
          var themeName = getFileName(themePath);
          var theme = { name: themeName, err: null };
          try {
            const { error, result: themeData } = await window.electronAPI.readFile(themePath);
            if (error) throw _decodeError(err);
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
      } catch (err) {
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
          projectExists(userDetails.path + projectName, function(exists) {
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

  function addNewFile(project, name, options) {
    if (!(project instanceof CSIDEProject)) return;
    var fileName = name || "untitled";
    var ext = options && options.fileExt ? options.fileExt : ".txt";
    generateName(fileName);

    function generateName(newName) {
      pathExists(project.getPath() + newName + ext, function(exists) {
        if (exists) {
          var n = newName.substring(newName.lastIndexOf("_") + 1, newName.length);
          if (isNaN(n)) {
            n = 0;
          } else {
            n = (parseInt(n) + 1)
          };
          generateName(fileName + "_" + n);
        } else {
          var filePath = project.getPath() + newName + ext;
          var newFile = new CSIDEFile(Object.assign({
            "path": filePath,
            "source": platform,
            "readOnly": project.isReadOnly()
          }, options || {}));
          project.addFile(newFile);
          newFile.save(null, null, function(err) {
            if (err) {
              bootbox.alert(err.message);
            } else {
              newFile.load(function(err, file) {
                if (!err) file.viewInEditor();
              });
            }
          });
        }
      });
    }
  }

  function __applyToAllEditors(settingId, value) {
    editorOptionStore[settingId] = value;
    var valueData = {};
    valueData[settingId] = value;
    allEditors().forEach(function(ed) {
      ed.getMonacoEditor().updateOptions(valueData);
    });
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
      var projectPath = userDetails.path + (projectName + '/');
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
      var startupContents =
        "*title " + projectName +
        "\n*author " + userDetails.name +
        "\n*ifid " + uuidv4() +
        "\n*comment your code goes here" +
        "\n*finish\n";
      var scenes = blank ? [] : [
        new CSIDEFile({
          'path': projectPath + 'choicescript_stats.txt',
          'contents': "",
          'source': platform
        }),
        new CSIDEFile({
          'path': projectPath + 'startup.txt',
          'contents': startupContents,
          'source': platform
        })
      ];
      scenes.forEach(function(scene, index) {
        scene.save(null, null, function(err) {
          if (err) {
            bootbox.alert(err.message);
            return;
          }
          project.addFile(scene);
          scene.load(function(err, scene) {
            if (!err && scene.getName() === "startup") {
              scene.viewInEditor();
            }
          });
        });
      });
      cb(null, project);
    });
  }

  function __openLogFile(path, callback) {
    window.open("file://" + path, {
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
      scene = fileAlreadyOpen(getFileName(scenePath), sceneProject);
      if (scene) {
        if (callback) callback(null, scene);
        return;
      }
    }

    var newScene = new CSIDEFile({
      "path": scenePath,
      "source": platform
    });
    sceneProject.addFile(newScene);
    newScene.load(callback);
  }

  function hasClass(el, cls) { //https://gist.github.com/jjmu15/8646098
    return el.className && new RegExp("(\\s|^)" + cls + "(\\s|$)").test(el.className);
  }

  function getFileName(filePath) {
    return getLastDirName(filePath);
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

  function getFileExtension(filePath) {
    return filePath.substring(filePath.lastIndexOf("."), filePath.length);
  }

  function getProject(projectPath) {
    for (var n = 0; n < projects().length; n++) {
      if (projects()[n].getPath() === projectPath) {
        return projects()[n];
      }
    }
    return null; //project doesn't exist
  }

  function getProjectPath(filePath) {
    return filePath.substring(0, filePath.lastIndexOf("/") + 1);
  }

  function fileAlreadyOpen(fileName, project) {
    fileName = fileName.toLowerCase();
    var files = project.getFiles();
    for (var i = 0; i < files.length; i++) {
      if (files[i].getName() === fileName) {
        return files[i];
      } else if (i === files.length - 1) {
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

  function __updateEditorDecorations(editor, file, additional) {
    var meditor = editor.getMonacoEditor();
    var issues = file.getIssues();
    additional = additional || [];
    file.decorations = meditor.deltaDecorations(file.decorations,
      issues.filter(function(issue) { return typeof issue.getLineNum() === "number" && issue.canDismiss() })
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

  function __wordCount(string) {
    var nonCommandLines = string.replace(/\*.+$/gm, "");
    return {
      incmds: string.replace(/^\s+|\s+$/g, "").split(/\s+/).length,
      excmds: nonCommandLines.replace(/^\s+|\s+$/g, "").split(/\s+/).length
    }
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
      window.electronAPI.shell.openItem(path);
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
          __openFiles(selection, true);
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

  function pathExists(filePath, callback) {
    fh.stat(filePath, function(err, stat) {
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
      if (project === activeProject()) {
        if (activeProject() == activeProject()) {
          activeProject(null);
        }
        __getTab("game").href("");
      }
      // copy to avoid mutating array during iteration
      var files = Array.from(project.getFiles());
      files.forEach(function(f) {
        f.close();
      });
      projects.remove(project);
      __updatePersistenceList();
    }
    if (!project.isDirty()) {
      __commitCloseProject();
    } else {
      bootbox.confirm("This project has unsaved files, are you sure you wish to close it?", function(result) {
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
    project.test_win = window.open(path, "Quicktest", "toolbar=0,location=0,status=0,menubar=0,scrollbars,resizable,width=500,height=400");
    project.test_win.addEventListener("beforeunload", function(event) {
      project.test_win = null;
    });
    setTimeout(function() {
      project.test_win.title = test.toUpperCase() + "TEST - " + project.getName();
    }, 200);
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
        __openFiles(filepaths.filter(function(filepath) {
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

  async function __runProject(project) {
    let serverAddress = null;
    if (platform != "web-dropbox") {
      await window.electronAPI.mediaServer.setDir(project.getPath());
      try {
        serverAddress = await window.electronAPI.mediaServer.getAddr().result;
      } catch (err) {
        bootbox.alert("<h3>Media Server Error</h3>" + "Cannot retrieve address of media/resource server. Please report this.");
        return;
      }
    }
    __shortCompile(project, function(err, allScenes) {
      if (err) {
        bootbox.alert("<h3>Compilation Error</h3>" + err.message);
        console.log(err);
      } else {
        notification("Running", project.getName(), {
          timeout: 2000
        });
        project.makeActive();
        __reloadTab(__getTab("game"), 'run_index.html?restart=true');
        cside.togglePanel("tab", true /* open */);
        __selectTab("game");
        setTimeout(async function() {
          const { result } = await window.electronAPI.mediaServer.getAddr();
          var webview = document.getElementById('game-tab-frame');
          webview.addEventListener("unresponsive", function(pid) {
            var buttons = [
              {
                addClass: 'btn', text: 'Close', onClick: function(note) { /*webview.terminate();*/ note.close(); }
              },
              {
                addClass: 'btn', text: 'Wait', onClick: function(note) { note.close(); }
              }
            ];
            return notification(project.getName() + " Seems to be Unresponsive", "Should we force it to close?" ,
              { closeWith: true, timeout: false, buttons: buttons, type: "warning" }
            );
          });
          webview.contentWindow.postMessage(
            {
              type: "startGame",
              allScenes: allScenes,
              project: { path: project.getPath(), name: project.getName() },
              platform: platform,
              server: serverAddress || result,
              allowScript: (platform !== "web-dropbox") && settings.byId("app", "allowscript").getValue(),
            }
          );
        }, 1000);
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
      var scene = new Scene(); // ChoiceScript's 'Scene'
      var sceneName = fileName.substring(0, (fileName.length - ".txt".length));
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

  async function __fullCompile(project, path) {
    const channel = 'full-compile';
    const status = notification("Exporting Game", "Do not close the program", { progress: true, closeWith: false, timeout: false });
    const messageHandler = (event, log) => {
      if (log.type === "progress") {
        status.setProgress(log.value);
      } else if (log.type === "exitCode") {
        if (log.value === 0) {
          var n = notification("Game Exported Successfully", project.getName(), {
            type: "success",
            buttons: [{
              addClass: 'btn',
              text: 'Show Folder',
              onClick: function(note) {
                __openFolder(path);
                note.close();
              }
            }]
          });
        }
      } else if (log.type === "error") {
        notification("Game Export Failed", log.value, {
          type: "error"
        });
      }
    };
    const disconnectHandler = () => {
      status.close();
      window.electronAPI.process.unregisterChannel(channel, messageHandler);
      window.electronAPI.process.unregisterChannel(channel+'-disconnect', disconnectHandler);
    };

    window.electronAPI.process.registerChannel(channel, messageHandler);
    window.electronAPI.process.registerChannel(channel+'-disconnect', disconnectHandler);

    const { error, result } = window.electronAPI.process.fork(channel, "compile.js", [path + project.getName() + ".html", "web/", project.getPath()], {
      cwd: "node_modules/cside-choicescript/"
    });
    if (error) {
      notification("Game Export Failed", error.message, {
        type: "error"
      });
    }
  }

  async function __rollbackUpdate() {
    const { error } = await window.electronAPI.updates.restore();
    if (error) {
      notification("Warning - Rollback failed: Package Corrupt", error.message, {
        type: "error", timeout: 10000
      });
    } else {
      notification("Rollback Succesful", "The previous app package has been restored");
    }
  }

  function __showUpdatePrompt(channel, update) {
    var buttons = [{
      addClass: 'btn',
      text: 'Download',
      onClick: async function(note) {
        note.close();
        const { error } = await window.electronAPI.updates.download(channel);
        if (error) {
          notification("Update Error", error.message, { type: 'error' });
        }
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
    config.recentColours = [];
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
      for (var n = 0; n < projects()[i].getFiles().length; n++) {
        thisScene = {
          "path": projects()[i].getFiles()[n].getPath(),
          "source": projects()[i].getFiles()[n].getSource(),
          //"readOnly": projects()[i].getFiles()[n].isReadOnly(),
          "color": projects()[i].getFiles()[n].getMarkColour()
        }
        thisProject.openScenes.push(thisScene);
      }
      config.openProjects.unshift(thisProject);
    }
    for (var e = 0; e < self.tabs().length; e++) {
      config.tabs[e] = self.tabs()[e].id;
    }
    for (var c = 0; c < recentFileColours().length; c++) {
      config.recentColours.push(recentFileColours()[c]);
    }
    __updateConfig();
  }
  self.updatePersistenceList = function() {
    __updatePersistenceList();
  }
  self.makeSortable = function(data) {
    __makeSortable(data);
  }

  window.addEventListener("message", (event) => {
    var eventProject = null;
    if (event.data.project)
      eventProject = getProject(event.data.project.path);
    switch (event.data.type) {
      case "handleLink":
        window.electronAPI.shell.openExternal(event.data.url);
        break;
      case "console":
        switch(event.data.action) {
          case "clear":
            eventProject.clearConsole();
            break;
          case "log":
            eventProject.logToConsole(event.data.msg, event.data.style, event.data.metadata);
            break;
        }
        break;
      case "focusLine":
        __openScene(event.data.project.path + event.data.file.name + ".txt", function(err, file) {
          if (!err) {
            try {
              var lineNum = parseInt(event.data.file.lineNum); file.focusLine(lineNum);
            } catch (e) {
              // no line number, but we can still show the file
              file.viewInEditor();
            }
          }
        });
        break;
      case "logIssue":
        var issueData = { project: eventProject, file: null, desc: event.data.error.message, lineNum: event.data.error.lineNumber };
        if (event.data.file) {
          __openScene(event.data.project.path + event.data.file.name + ".txt", function(err, file) {
            if (!err) {
              issueData.file = file;
              issueData.severity = monaco.MarkerSeverity.Error;
              issueData.canDismiss = true; // runtime errors should be dismissable
              file.logIssue(new CSIDEIssue(issueData));
            } else {
              var issue = new CSIDEIssue({ project: issueData.project, canDismiss: true, desc: "Failed to open '" + issueData.file + "' whilst handling another issue: " + issueData.desc});
              issueData.project.logIssue(issue);
            }
          });
        }
        else {
          issueData.canDismiss = true; // runtime errors should be dismissable
          var issue = new CSIDEIssue(issueData);
          issueData.project.logIssue(issue);
        }
        break;
      case "popOut":
        window.open("run_index.html?persistence=CSIDE", { focus: true, width: 500, height: 500, title: "" }, function(new_win) {
          cside.popout.window = new_win;
          // don't allow the popout window to overwrite the persistent store (allows popout testing of multiple choices etc)
          new_win.on("loaded", function() {
            new_win.window.storeName = null;
          });
          new_win.on("closed", function() {
            cside.popout.window.leaveFullscreen();
            cside.popout.window.hide();
            cside.popout.window.close(true);
            cside.popout.window = null;
          });
        });
        break;
      default:
        return;
    }
  }, false);

  /*
    arg.item - the actual item being moved
    arg.sourceIndex - the position of the item in the original observableArray
    arg.sourceParent - the original observableArray
    arg.sourceParentNode - the container node of the original list
    arg.targetIndex - the position of the item in the destination observableArray
    arg.targetParent - the destination observableArray
    arg.cancelDrop - this defaults to false and can be set to true to indicate that the drop should be cancelled.
  */
  function dragFileEvent(arg, event, ui) {
    if (arg.sourceParent == arg.targetParent)
      return;

    var targetProject = ko.dataFor(event.target);
    var movingFile = arg.item;
    arg.cancelDrop = true;

    function execute(action) {
      pathExists(targetProject + arg.item.getName(), function(exists) {
        if (exists) {
          $(ui.sender).sortable('cancel');
          arg.cancelDrop = true;
          bootbox.alert("This project already has a file by that name.");
        } else {
          action();
        }
      });
    }
    bootbox.dialog({
      message: "Would you like to <b>move</b> or <b>copy</b> this file to this project?",
      title: "What would you like to do?",
      buttons: {
        copy: {
          label: "Copy",
          className: "btn-primary",
          callback: function() {
            execute(function() {
              movingFile.copyTo(targetProject);
            });
          }
        },
        move: {
          label: "Move",
          callback: function() {
            execute(function() {
              movingFile.moveTo(targetProject);
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

  self.dragFileEvent = dragFileEvent;

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
  ko.bindingHandlers.autoScroll = {
    update: function (element, valueAccessor) {
      var value = valueAccessor();
      if (ko.unwrap(value) && !__elementIsInView(element)) {
        element.scrollIntoView({block: 'center'});
      }
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
      var browserTitle = ko.observable("Open files");
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
            browserTitle("Open files");
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
      return ko.unwrap(options);
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
  var fileBrowserSceneMenuOptions = ko.observableArray([
    new menuOption("Open Scene", function(menu) {
      menu.getTarget().open();
    })
  ]);
  var fileBrowserFolderMenuOptions = ko.observableArray([
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
          active: self.getActiveProject,
          options: ko.computed(function() {
            return (new contextMenu(activeProject(), projectMenuOptions).getOptions())
          }, this),
          target: ko.computed(function() {
            return activeProject()
          }, this)
        }),
        new toolbarMenu({
          title: "<span title='Scene' class='fa fa-file-text-o'>",
          active: self.getActiveFile,
          options: ko.computed(function() {
            return (new contextMenu(activeFile(), fileMenuOptions).getOptions())
          }, this),
          target: ko.computed(function() {
            return activeFile()
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
    //project & file context menus
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
          var file = ko.dataFor(element.get(0));
          if (file.getErrState() || !file.hasLoaded() || file.isSaving() || file.isLocked()) //disallow allow context-menus for unloaded files etc
            return false;
          menu(new contextMenu(file, fileMenuOptions));
          return true;
        }
      });
      // editor tags
      $('#editor-tab-list-event-wrapper').contextmenu({
        target: '#context-menu',
        scopes: '.editor-tag',
        before: function(event, element) {
          var editor = ko.dataFor(element.get(0));
          var pinOption =  new menuOption(editor.isPinned()? "Unpin" : "Pin" + " editor", function(menu) {
            if (editor.isPinned()) {
              editor.unpin();
            } else {
              editor.pin();
            }
          });
          menu(new contextMenu(editor, [pinOption].concat(EditorTagOptions())));
          return true;
        }
      });
      $('#file-browser-ul').contextmenu({
        target: '#context-menu',
        scopes: '.file',
        before: function(event, element) {
          var fileFolder = ko.dataFor(element.get(0));
          if (fileFolder.isFolder())
            menu(new contextMenu(fileFolder, fileBrowserFolderMenuOptions));
          else
            menu(new contextMenu(fileFolder, fileBrowserSceneMenuOptions));
          return true;
        }
      });
    });
  }

  var myContextMenuViewModel = new CSIDE_ContextMenu();
  ko.applyBindings(myContextMenuViewModel, $('#context-menu')[0]);

};

const _decodeError = (errObj) => {
  const err = new Error(errObj.message);
  err.code = errObj.code;
  return err;
};

const _initDropbox = async () => {
  let db;
  if (!!utils.parseQueryString(window.location.hash).access_token) {
    db = new Dropbox.Dropbox({ accessToken: utils.parseQueryString(window.location.hash).access_token });
  }
  else {
    db = new Dropbox.Dropbox({ clientId: "hnzfrguwoejpwbj" });
    const authUrl = await db.auth.getAuthenticationUrl(window.location);
    window.location = authUrl;
  }
  return db;
};

require = amdRequire; // restore for monaco's lazy loading
amdRequire(['vs/editor/editor.main'], async function() {
  if (usingNode) {
    const initData = {
      "platform": { error: pErr, result: platform } = await window.electronAPI.getPlatform(),
      "versions": { error: vErr, result: versions }  = await window.electronAPI.getVersions(),
      "userDetails": { error: uErr, result: userDetails } = await window.electronAPI.getUserDetails(),
      "appPath": {error: apErr, result: appPath } = await window.electronAPI.getAppPath()
    }

    for (const item in initData) {
      if (initData[item].error) {
        throw _decodeError(initData[item].error);
      }
    }
    
    window.cside = new IDEViewModel(initData.platform.result, initData.versions.result, initData.userDetails.result, initData.appPath.result);
  } else {
    const platform = "web-dropbox";
    const userDetails = {
      name: "Dropbox User",
      path: "/"
    }
    window.db = await _initDropbox();
    db.usersGetCurrentAccount().then(function(acc) {
      userDetails.name = acc.name.display_name;
    }).catch(function(err) {}); // we don't mind errors, we'll just stick with the default name
    window.cside = new IDEViewModel(platform, { cside: "Dropbox Beta", electron: null }, userDetails, '/', db);
  }
  window.monaco = monaco;
  ko.applyBindings(cside, $('.main-wrap')[0]);
  cside.init();
});
