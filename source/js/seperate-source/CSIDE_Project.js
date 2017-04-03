	function CSIDE_Project(projectData) {
		var self = this;
		
		//INSTANCE VARIABLES
		var name = ko.observable(projectData.name ? projectData.name : (getLastDirName(projectData.path) ? getLastDirName(projectData.path) : "Untitled")); //take the folder name if no name is stored
		var path = ko.observable(projectData.path).extend({normalizePaths: ""}); //convert relative paths to direct paths
		var scenes = ko.observableArray([]);
		var source = projectData.source;
		
		var expanded = ko.observable(projectData.expanded === false ? false : true);
		var locked = ko.observable(false); //locks the project/prevents spam operations
		var editing = ko.observable(false);
		var invalidName = ko.observable(false);
		
		//GETTER METHODS
		self.getName = ko.computed(function() {
			return name();
		}, this);
		self.getPath = ko.computed(function() {
			return path();
		}, this);	
		self.getScenes = ko.computed(function() {
			return scenes();
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
		self.beingEdited = ko.computed(function() {
			return editing();
		}, this);
		self.nameInvalid = ko.computed(function() {
			return invalidName();
		}, this);
		self.isDirty = ko.computed(function() {
			for (var i = 0; i < scenes().length; i++) 
			{
				if (scenes()[i].isDirty()) { return true; }
				else if (i === scenes().length - 1) { return false; }
			}
		});
		self.issueCount = ko.computed(function() {
			var count = 0;
			for (var i = 0; i < scenes().length; i++) { count += scenes()[i].getIssues().length; }
			return count;
		});
		self.wordCount = function(exclCommandLines) {
			exclCommandLines = exclCommandLines || false;
			var wordCount = 0;
			for (var i = 0; i < scenes().length; i++) 
			{
				wordCount = (wordCount + scenes()[i].wordCount(exclCommandLines));
			}
			return wordCount;
		}
		self.dismissAllIssues = function() {
			var t = 0, issues = [];
			for (var n = 0; n < scenes().length; n++) 
			{
				var scene = scenes()[n];
				var issueList = scene.getIssues();
				for (var o = 0; o < issueList.length; o++) 
				{ 
					issues.push(issueList[o]);
				}
			}
			for (var i = 0; i < issues.length; i++)
			{ 
				issues[i].dismiss(); 
			}
			__selectTab("game");
		}
		//SETTER METHODS
		self.setExpand = function(boole, event) {
			if (!hasClass(event.target, "project-header")) { return; } //ignore bubbling double clicks 
			if (typeof boole !== "boolean" || typeof boole === "undefined") { 
				expanded() ? expanded(false) : expanded(true); 
				return;
			}
			expanded(boole);
		}
		self.nameInterface = ko.pureComputed({
			read: function () {
				return name();
			},
			write: function (newValue) {
				validName(newValue, true, function(valid, errMsg) {
					invalidName(valid ? false : true);
					if (valid) {
						name(newValue)
					}
					else {
						console.log(errMsg);
					}
				});
			},
			owner: this
		});	
		self.rename = function(data, event) {
			if (invalidName()) {
				setTimeout(function() {
					$(event.target).fadeOut("fast").fadeIn("fast").focus();
				}, 50);
			}
			else {
				if (editing()) {
					editing(false);
				}
				else {
					editing(true);
					setTimeout(function() { //force select (can't then avoid initial blur)
						$(event.target).next().focus().select();
					}, 50);
				}
			}
		}
		//MISC METHODS
		self.run = function() {
			function execRun() {
				if (locked()) return;
				locked(true); //prevent run spam
				__shortCompile(self, function() {
					noty({text:"Running... <b>" + name() + "</b>" });
					activeProject(self);
					__reloadTab(cside.tabs()[0], 'run_index.html');
					cside.tabPanel("open");
					__selectTab("game");
					setTimeout(function() {
						locked(false);
					}, 5000);
				});
			}
			if (self.isDirty()) {
				bootbox.confirm("This project has unsaved changes, these will not appear in the test run, do you wish to continue?", function(result) {
					if (result) {
						execRun();
					}
				});
			} else {
				execRun();
			}
		}
		self.openFolder = function() {
			__openFolder(path());
		}
		self.close = function() {
			__closeProject(self);
		}
		self.save = function() {
			for (var i = 0; i < scenes().length; i++) {
				var current = scenes()[i];
				if (!current.isDirty()) {
					continue; //skip clean scenes
				} else {
					current.save();
				}
			}
		}
		self.addNewScene = function(project, event) {
			if (event) event.stopPropagation();
			var sceneName = "Untitled";
			generateName(sceneName);
			function generateName(newName) {
				sceneExists(newName, self, function(exists) {
					if (exists) {
						var n = newName.substring(newName.lastIndexOf(" ") + 1, newName.length);
						if (isNaN(n)) { n = 0; }
						else { n = parseInt(n) + 1 };
						generateName("Untitled_" + n);
					} else {
						var scenePath = path() + newName + '.txt';
						//for now, assume source based on platform:
						var newScene = new CSIDE_Scene({"path": scenePath, "source": source});
						newScene.save(null, null, function(err) {
							if (err) {
								throw err;
							}
							else {
								self.addScene(newScene);
							}
						});
					}
				});
			}
		}
		self.addScene = function(scene, callback) {
			if (scene.getProject() !== self && scene.getProject() !== false) return; //invalid call (only at scene creation or via scene.move())
			scenes.push(scene);
			if (!scene.hasLoaded()) scene.load(callback); //if we're adding a new scene
			else {
				if (typeof callback != 'undefined') callback(newScene);
			}
			//CJW - Do need to ensure you can't overwrite via movement (yet can open initially..ugh)
			/* 			sceneExists(scene.getName(), self, function(exists) {
				if (exists) {
					alert("hmm");
					return;	
				}
				else {
					scenes.push(scene);
					console.log(scene.hasLoaded());
					if (!scene.hasLoaded()) scene.load(); //if we're adding a new scene
				}
			}); */
		}
		self.removeScene = function(scene) {
			if (scenes().lastIndexOf(scene) === -1) { return; }
			else {
				scenes.remove(scene);
				if (scenes().length < 1) {
					projects.remove(self);
				}
			}
		}
		self.closeScene = function(scene) {
			self.removeScene(scene);
			if (selectedScene() == scene) {
				selectedScene(false);
				editor.setValue("");
			}
			__updatePersistenceList();
		}
		self.compile = function() {
			var fileContents = __compileProject(self);
			fh.writeFile(path() + name(), fileContents, function(err) {
				if (err) {
					console.log(err);
				}
				else {
					console.log("Export Complete!");
					bootbox.alert(project.name() + "<br><br>Export succesful!");	
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
	};