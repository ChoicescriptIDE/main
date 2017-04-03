	function CSIDE_Scene(sceneData) {
		var self = this;
		//INSTANCE VARIABLES
		var path = ko.observable(sceneData.path).extend({normalizePaths: ""});
		var name = ko.observable(getSceneName(path()));
		var isImportant = name().toUpperCase().match(reservedSceneNames);
		var source = sceneData.source || platform; //won't change - so doesn't need to be an observable?
		var loaded = ko.observable(false);
		var dirty = ko.observable(false);
		var editing = ko.observable(false);
		var colouring = ko.observable(false);
		var saving = ko.observable(false);
		var inErrState = ko.observable(false);
		var errStateMsg = ko.observable("");
		var cmDoc = CodeMirror.Doc(sceneData.contents || "", "choicescript"); //won't change - so doesn't need to be an observable?
		var fileStats = sceneData.stats || { "mtime": new Date() }; //won't change - so doesn't need to be an observable?
		var markColour = ko.observable(sceneData.color? sceneData.color : isImportant? "rgb(161, 165, 237)" : "rgb(163, 163, 163)"); 
		//var sceneListPosition = ko.observable(self.project().scenes().length);
		var issues = ko.observableArray([]);
		var invalidName = ko.observable(false);
		var nameErrMsg = ko.observable();
		
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
		self.isDirty = ko.computed(function() {
			return dirty();
		}, this);
		self.beingEdited = ko.computed(function() {
			return editing();
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
		self.getMarkColour = ko.computed(function() {
			return markColour();
		}, this);
		self.getDoc = function() {
			return cmDoc;
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
			return errStateMsg();
		}, this);
		self.getErrState = ko.computed(function() {
			return inErrState();
		}, this);
		self.wordCount = function(exclCommandLines) {
			return __wordCount(cmDoc.getValue(), exclCommandLines);
		};
		self.getState = ko.computed(function() {
			if (inErrState())
				return "fa fa-exclamation-triangle fa-lg scene-unsaved";
			else
				return saving() ? "fa fa-refresh fa-spin" : dirty() ? "fa fa-save fa-lg scene-unsaved" : "fa fa-save fa-lg scene-saved"
		});

		//SETTER METHODS
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
					console.log(err);
				}
				else {
					path(newPath);
					name(newName);
				}
			}					
		}
		self.nameInterface = ko.pureComputed({
			read: function () {
				return name();
			},
			write: function (newValue) {
				validName(newValue, false, function(valid, errMsg) {
					invalidName(valid ? false : true);
					if (valid) {
						//name(newValue) but need to check it doesn't already exist
					}
					else {
						getNameErrorMsg(errMsg);
					}
				});
			},
			owner: this
		});	
		self.rename = function(data, event) {
			if (inErrState()) return;
			if (event.type == "blur") {
				if (invalidName() && editing()) {
					setTimeout(function() {
						$(event.target).fadeOut("fast").fadeIn("fast").focus();
					}, 50);
					return;
				}
				else {
					var newName = event.target.value.trim();
					if (newName != name()) {
						sceneExists(newName, self.getProject(), function(exists) {
							if (!exists) {
								renameSceneFile(newName);
							}
							else {
								noty({type:"error", layout: "bottomLeft", text: "Error: That scene already exists", closeWith: ["click"]});
								event.target.value = name();
							}
						});			
					}
				}
			}
			if (editing()) {
				editing(false);
			}
			else {
				if (isImportant) {
					noty({type:"error", layout: "bottomLeft", text: "Error: Cannot rename reserved scene", closeWith: ["click"]});
					return;
				}
				editing(true);
				setTimeout(function() { //force select (can't then avoid initial blur)
					$(event.target).next().focus().select();
				}, 50);
			}
		}
		self.recolour = function(data, event) {
			if (typeof data == "string" && data != markColour()) {
				var reg = new RegExp("(" + validSceneColours().join("|").replace(/\(/g, "\\(").replace(/\)/g, "\\)") + ")");
				if (!data.match(reg)) {
					console.log("Scene Recolour Error: Invalid colour");
					return;
				}
				markColour(data);
				__updatePersistenceList();
			}
			colouring() ? colouring(false) : colouring(true);
		}
		self.logIssue = function(err) {
			//convert to csideIssue
			console.log(err);
			var lineNum;
			if (typeof err.lineNumber == "number") {
				lineNum = err.lineNumber - 1;
			}
			var issue = new CSIDE_Issue({"scene": self,
				"desc": err.message || "No description available", 
				"lineHandle": typeof lineNum != 'undefined' && lineNum != null ? cmDoc.getLineHandle(lineNum) : null
			});
			issues.push(issue);
			if (typeof lineNum != "undefined") {
				console.log(lineNum);
				cmDoc.addLineClass(lineNum, 'background', 'CodeMirror-error-background');
			}
			else {
				console.log("Error...");
				console.log(lineNum);
			}
			//editor.addLineWidget(lineNum, document.createTextNode("moose"), {coverGutter: false, noHScroll: true}); CJW
			__selectTab("issues");
			if (issue.hasLineNum()) issue.show();
		}
		self.clearIssue = function(issue) {
			if (issue.hasLineNum()) {
				if (typeof issue.getLineNum() === "number") {
					cmDoc.removeLineClass(issue.getLineNum(), 'background', 'CodeMirror-error-background');
				}
			}
			issues.remove(issue);			
		}
		//MISC METHODS
		self.load = function(callback) {
			fh.readFile(path(), function (err, data) {
				fh.stat(path(), function(err, newfileStats) {
					if (err) finishLoading(err);
					fileStats = newfileStats;
					finishLoading(err, data);
				}); //get file stats	
			});
			function finishLoading(err, data) {
				loaded(true);
				if (err) {
					inErrState(true);
					errStateMsg(err.message);
					console.log(errStateMsg());
/* 					if (err.status === 404 || err.code === "ENOENT")
					else
						self.close(); */
				}
				else {
					cmDoc.setValue(data);
					cmDoc.markClean();
					cmDoc.clearHistory();
					dirty(false);
					__updatePersistenceList();
				}
				if (typeof callback != 'undefined') callback(err, self);
			}
		}
		self.save = function(scene, event, callback) {
			saving(true);
			var lastModifiedAt = fileStats.mtime || fileStats.modifiedAt;
			fh.stat(path(), function(err, newfileStats) {
				if (err && (err.code == "EEXIST" || err.code == "ENOENT")) {
					//new scene, we're cool, bypass:
					saveScene(callback);
				}
				else if (err) {
					console.log(err);
					throw err;
				}
				else {
					checkDate(newfileStats);
				}
			});
			function checkDate(newfileStats) {
				var newlyModifiedAt = newfileStats.mtime || newfileStats.modifiedAt;
				if (newlyModifiedAt.getTime() > lastModifiedAt.getTime()) {
					console.log(newlyModifiedAt.getTime());
					console.log(newlyModifiedAt.getTime());
					bootbox.confirm("<h3>Warning</h3><p>'" + name() + ".txt' of <b>" + self.getProject().getName() + "</b> has been modified by another program or process \
						since it was opened. Are you sure you wish to save it?",
						function(result) {
							if (result) {
								saveScene(callback);
							}
							else {
								saving(false);
								return;
							}
						}
					);	
				}
				else {
					saveScene(callback);
				}
			}
		}
		function saveScene(callback) {
			var data = cmDoc.getValue();
			fh.writeFile(path(), data, function (err) {
				finalizeSave(err);
			});
			function finalizeSave(err) {
				if (err) {
					console.log(err);
					if (callback) callback(err);
				}
				else {
					dirty(false);
					fileStats.mtime ? fileStats.mtime = new Date() : fileStats.modifiedAt = new Date();
					if (callback) callback(null);
				}
				saving(false);
			}
		}
		self.select = function() {
			if (inErrState()) return;
			selectedScene(self);
			editor.swapDoc(cmDoc);
		}
		self.close = function() {
			self.getProject().closeScene(self);
		}
		self.copyTo = function(targetProject) {
			var newPath = targetProject.getPath() + name() + '.txt';
			fh.copyFile(path(), newPath, function(err, fileStat) {
				executeCopy(err);
			});
			function executeCopy(err) {
				if (err) {
					console.log(err);
				}
				else {
					var newScene = new CSIDE_Scene({"path": newPath, "source": source, "contents": cmDoc.getValue()});
					targetProject.addScene(newScene);
				}
			}
		}
		self.moveTo = function(targetProject) {
			if (isImportant) {
				noty({type:"error", layout: "bottomLeft", text: "Error: Cannot move reserved scene", closeWith: ["click"]});
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
					console.log(err);
				}
				else {
					currentProject.removeScene(self);
					path(newPath);
					targetProject.addScene(self);
				}
			}
		}
		self.del = function() {
			if (isImportant) {
				noty({type:"error", layout: "bottomLeft", text: "Error: Cannot delete reserved scene", closeWith: ["click"]});
				return;
			}
			else {
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
						console.log(err);
					}
					else {
						self.close();
					}
				});
			}
		}
		//end methods
		CodeMirror.on(cmDoc, "change", function() {
			cmDoc.isClean() ? dirty(false) : dirty(true);
		});
	}