

// Overall viewmodel for this screen, along with initial state
function IDEViewModel() {

	// ╔═╗┌─┐┌┐┌┌─┐┌┬┐┬─┐┬ ┬┌─┐┌┬┐┌─┐┬─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
	// ║  │ ││││└─┐ │ ├┬┘│ ││   │ │ │├┬┘  ╠╣ │ │││││   │ ││ ││││└─┐
	// ╚═╝└─┘┘└┘└─┘ ┴ ┴└─└─┘└─┘ ┴ └─┘┴└─  ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘

	//INCLUDE: PROJECTS, SCENES, SETTINGS, ISSUES

// ╔═╗┬ ┬┌┐ ┬  ┬┌─┐  ╔═╗┌─┐┌─┐┌─┐┌─┐
// ╠═╝│ │├┴┐│  ││    ╚═╗│  │ │├─┘├┤ 
// ╩  └─┘└─┘┴─┘┴└─┘  ╚═╝└─┘└─┘┴  └─┘

	var self = this;

	//INSTANCE VARIABLES
	var projects = ko.observableArray([]);
	var selectedScene = ko.observable();
	var reservedSceneNames = "(STARTUP|CHOICESCRIPT_STATS|GLOBAL)"; //Should be in upper case
	var validSceneColours = ko.observableArray(["rgb(125, 186, 125)", "rgb(172, 209, 240)", "rgb(228, 144, 150)",
		"rgb(237, 216, 161)", "rgb(161, 165, 237)", "rgb(224, 161, 237)", "rgb(163, 163, 163)", "rgb(230, 230, 230)"]);
	var selectedProject = ko.computed(function() {
		return selectedScene() ? selectedScene().getProject() : null;
	});
	var activeProject = ko.observable("");
    var projects = ko.observableArray([]);
	var userDictionary = {};
	if (usingNode) {
		var version = gui.App.manifest.version;
		var platform = (process.platform === "darwin" ? platform = "mac_os" : platform = process.platform);
		var execPath = (platform === "mac_os") ? process.execPath.substring(0, process.execPath.lastIndexOf('/') + 1) : process.execPath.substring(0, process.execPath.lastIndexOf('\\') + 1);
	}
	else {
		var version = "0.5b";
		var platform = "web-dropbox";
	}	
	var config;
	var defaultConfig = {
		"settings": {
			"editor": {
				"tabtype": "spaces",
				"smartindent": true,
				"tabsize": "4",
				"linewrap": false,
				"fontsize": "12px",
				"spell_dic": "en_US",
				"theme": "cs-light",
				"spellcheck": true,
				"autosuggest": false
			},
			"app": {
				"persist": true,
				"autosave": true,
				"cmdhelp": false,
				"update-channel": "stable"
			}
		},
		"openProjects": [],
		"userDictionary": {}
	};
	try {
		config = JSON.parse(localStorage.getItem("CSIDE_appConfig")) || defaultConfig;
	}
	catch(err) {
		if (err) {
			bootbox.alert("Sorry, there was a problem parsing your configuration settings.<br> \
			They have been repaired and reset to the defaults.<br><br> \
			<b>Error:</b> "+ err.message );	
			localStorage.setItem("CSIDE_appConfig", JSON.stringify(defaultConfig));
			config = defaultConfig;
		}

	}
	
		
	var normalizeError = function(err) {
		if (!err) return null;
		if (typeof err.message == 'undefined') {
			try { 
				err.message = JSON.parse(err.responseText).error;
			}
			catch(e) {
				err.message = "Unable to get an error description";
			}
		}
		if (typeof err.code == 'undefined') {
			err.code = err.status || "Unknown Error Code";
		}
		switch (err.code) {
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
		/*
		var showError = function(error) {
		switch (error.status) {
		case Dropbox.ApiError.INVALID_TOKEN:
		// If you're using dropbox.js, the only cause behind this error is that
		// the user token expired.
		// Get the user through the authentication flow again.
		break;

		case Dropbox.ApiError.NOT_FOUND:
		// The file or folder you tried to access is not in the user's Dropbox.
		// Handling this error is specific to your application.
		break;

		case Dropbox.ApiError.OVER_QUOTA:
		// The user is over their Dropbox quota.
		// Tell them their Dropbox is full. Refreshing the page won't help.
		break;

		case Dropbox.ApiError.RATE_LIMITED:
		// Too many API requests. Tell the user to try again later.
		// Long-term, optimize your code to use fewer API calls.
		break;

		case Dropbox.ApiError.NETWORK_ERROR:
		// An error occurred at the XMLHttpRequest layer.
		// Most likely, the user's network connection is down.
		// API calls will not succeed until the user gets back online.
		break;

		case Dropbox.ApiError.INVALID_PARAM:
		case Dropbox.ApiError.OAUTH_ERROR:
		case Dropbox.ApiError.INVALID_METHOD:
		default:
		// Caused by a bug in dropbox.js, in your application, or in Dropbox.
		// Tell the user an error occurred, ask them to refresh the page.
		}
		};
		return err;
		*/
	}
	//iniate other libraries:
	var db = new Dropbox.Client({key:"hnzfrguwoejpwbj"});
	var typo = new Typo("", "", "", { platform: 'any' }); //spellchecking library var to avoid initial errors (we'll init it properly via settings)
	
	//GETTER METHODS	
	self.getPlatform = function() {
		return platform;
	};
	self.getSettings = function() {
		return settings;
	};
	self.getProjects = ko.computed(function() {
		return projects();
	}, this);
	self.getSelectedProject = ko.computed(function() {
		return selectedProject();
	}, this);
	self.getSelectedScene = ko.computed(function() {
		return selectedScene();
	}, this);
	self.getActiveProject = ko.computed(function() {
		return activeProject();
	}, this);
	self.getValidSceneColours = ko.computed(function() {
		return validSceneColours();
	}, this);
	self.getDictionaryArray = ko.computed(function() {
		return userDictionary.persistentListArray();
	}, this);
	
	//MUTATOR METHODS

	//MISC METHODS
	self.selectScene = function(scene) {
		scene.select();
	}
	self.closeProject = function(project) {
		projects.remove(project);
	}
	self.session = {
		"save": function() {
			for (var i = 0; i < projects().length; i++) {
				__saveProject(projects()[i]);
			}
		},
		"isDirty": ko.computed(function() {
			for (var i = 0; i < projects().length; i++) {
				if (projects()[i].isDirty()) { return true; }
				else if (i == projects().length - 1) { return false; }
			}
		})
	}
	

	insertTextTags = function(tag) {
		var text = editor.getSelection();
		var cursorLoc = "around";
		if (!text) {
			text = "[" + tag + "][/" + tag + "]";
			cursorLoc = "start";
		}
		else if ((text.substring(0, 3) === "[" + tag + "]") && (text.substring(text.length - 4, text.length) === "[/" + tag + "]")) {
			text = text.substring(3, text.length - 4);
		} else {
			text = "[" + tag + "]" + text + "[/" + tag + "]";
		}
		editor.replaceSelection(text, cursorLoc);
		if (cursorLoc === "start") { editor.setCursor(editor.getCursor().line, editor.getCursor().ch + 3); }
	}


		

	

	
	self.tabPanel = function(action) {
		if ($('.left-wrap').is(':animated') || $('.right-wrap').is(':animated')) { return; }
		
		function calcWidth(ele) {
			var width = ele.width();
			var parentWidth = ele.offsetParent().width();
			var percent = 100*width/parentWidth;
			return percent;
		}
		
		var isOpen = true;
		if (calcWidth($('.left-wrap')) > 60) { isOpen = false; }
		
		if (action == "close" && isOpen || !action && isOpen) {
			$('.right-wrap').animate({right:'-50%'}, 500);
			$('.left-wrap').animate({width: '100%'}, 500, function() {
				editor.refresh();
			});
			$("#expand-collapse-bar").addClass("collapsed");
		}
		else if (action == "open" && !isOpen || !action && !isOpen) {
			$('.left-wrap').animate({width: '50%'}, 500);
			$('.right-wrap').animate({right:'0%'}, 500, function() {
				editor.refresh();
			});
			$("#expand-collapse-bar").removeClass("collapsed");
		} 
		else {
			return isOpen;
		}
	}
	
	self.applySetting = function(setting) {
		//small delay to ensure the model value is updated
		setTimeout(function() { setting.apply(setting.getValue()); 
			var cat = setting.getCat();
			var listLength = settings[cat]().length;
			for (var i = 0; i < listLength; i++) {
				config.settings[cat][settings[cat]()[i].id] = settings[cat]()[i].getValue();
			}
			__updateConfig();
		}, 100);
	}
	self.createProject = function() {
		bootbox.prompt({
			title: "Name of Project?",
			value: "",
			callback: function(folderName) {
				if (folderName === null) { return; }
				if (typeof folderName === "undefined") { return; }
				folderName = folderName.trim();
				validName(folderName, true, function(valid) {
					if (valid) {
						folderName = folderName.trim();
						var source = platform;
						if (usingNode) 
							var userDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
						var projectPath = usingNode ? (userDir + "/Choicescript Projects/" + folderName + '/') : ("/Choicescript Projects/" + folderName + '/');
						fh.makeDir(projectPath, function(err) {
							if (err && err.code == "EEXIST") {
								bootbox.alert("Error: That Project folder could not be created because it already exists.");
							}
							else {
								addNewProject();
							}
						});
						function addNewProject() {
							var project = new CSIDEProject({'name': folderName, 'path': projectPath, 'source': source});
							projects.push(project);
							var startupContents = "*title " + folderName;
							var statsContents = "*temp strength 50\n*temp intelligence 50\n*temp dexterity 50\n\n*stat_chart\n  text strength\n  text intelligence\n  text dexterity";
							//var globalContents = "*comment This is a global scene file, any code added to this file will be appended to each and every other file upon project compilation (aside from startup + choicescript_stats)";
							var startupScene = new CSIDEScene({'path': projectPath + 'startup.txt', 'contents': startupContents, 'source': source});
							var statsScene = new CSIDEScene({'path': projectPath + 'choicescript_stats.txt', 'contents': statsContents, 'source': source});	
							startupScene.save(null, null, function(err) {
								if (err) throw err;
								project.addScene(startupScene);
							});
							statsScene.save(null, null, function(err) {
								if (err) throw err;
								project.addScene(statsScene);
							});
							//project.addScene(new CSIDEScene({'path': projectPath + 'global.txt', 'contents': globalContents, 'source': source}));					
							bootbox.alert("Project created!<br>" + project.getPath()); 		
						}
					}
					else {
						bootbox.alert("Invalid Name: Please use only letters, numbers, underscores and hypens");
					}
				});
			}
		});
	}

	function __saveSceneTo(scene, callback) {
		var chooser = $('#saveSceneTo');
		chooser.attr("nwsaveas", scene.getName() + ".txt."); //default name, no idea why it needs the trailing . but it does
		chooser.off().change(function(evt) {
			var savePath = $(this).val();
			if (!savePath) return;
			fs.writeFile(savePath, scene.document.getValue(), function (err) {
				if (err) { 
					bootbox.alert(err);
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
	function openScene(path, source, callback) {
		path = path.replace(/\\/g, '/'); //normalize against Windows backslashes
		var newScene = new CSIDEScene({"path": path, "source": source});
		var sceneProjectPath = getProjectPath(path);
		var sceneProject = projectExists(sceneProjectPath);
		var isNewProject = false;
		if (!sceneProject) {
			isNewProject = true; 
			sceneProject = new CSIDEProject({"path": sceneProjectPath, "source": source});
			projects.push(sceneProject);
		}
		if (!isNewProject) { //if the project doesn't exist, neither can the scene
			if (sceneAlreadyOpen(newScene.getName(), sceneProject)) return;
		}
		sceneProject.addScene(newScene, callback);
	}
	self.openScene = function(path, source, callback) {
		openScene(path, source, callback);
	}
	self.openScenes = function() {
		if (usingNode) {
			var chooser = $("#getFilePaths");
			chooser.off().change(function(evt) {
				var fileArray = $(this).val().split(";");
				if (fileArray.length === 1 && fileArray[0] === "") { return; }
				for (var i = 0; i < fileArray.length; i++ ) {
					openScene(fileArray[i], platform);
				}
			});
			chooser.trigger("click");  
		}
		else {
			fileManager.open();
		}
	}
/* 	self.pinScene = function(scene) {
		var x = scene.document.linkedDoc();
		self.noteEditor.swapDoc(x);
		self.noteEditor.refresh();
	} */
	self.sceneRename = function(scene, event) {
		if ((scene.name().toUpperCase() === "STARTUP" || scene.name().toUpperCase() === "CHOICESCRIPT_STATS") && event.type != "keyup")
		{
			noty({'text':"You cannot rename this scene", 'type': 'error', 'layout': 'bottomLeft'});
			return;
		}
		if (selectedScene() && selectedScene().editing()) { return; }
		var inputBox = $(event.target).next("input"); 
		scene.editing(true); 
		setTimeout(function() { $(inputBox).focus().select(); }, 50);
		$(inputBox).val(scene.name()); 
	}
	self.confirm = function(scene, event) {
		if (event.originalEvent.type == "keyup")  {
			if ((event.keyCode === 13 || event.which === 13)) {
				var inputBox = $(event.target);
				var success = scene.rename(inputBox.val());
				if (success) scene.editing(false);
			}
			if ((event.keyCode === 27 || event.which === 27)) { $(inputBox).val(scene.name()); scene.editing(false); } //cancel
			event.target.style.color = "";
		}
	}
	self.spellCheck = function(word) {
		if (editor.options.spellcheck)
			return typo.check(word) || userDictionary.check(word);
		return true; //always OK
	}

	self.init = function() {
		if (!usingNode) {
			db.authenticate({interactive: true}, function (error) {
				if (error) {
					alert('Dropbox Authentication Error: ' + error);
					return;
				}
			});
		}
		if (config.settings.app.persist) {
				var thisProjectData = [];
				for (var i = 0; i < config.openProjects.length; i++) {
					thisProjectData = config.openProjects[i];
					var project = new CSIDEProject(thisProjectData);
					projects.push(project);
					for (var n = 0; n < thisProjectData.openScenes.length; n++) {
						project.addScene(new CSIDEScene(thisProjectData.openScenes[n]));
					}
				}
		}
		var scope = settings.editor();
		for (var i = 0; i < scope.length; i++) {
			scope[i].apply(config.settings.editor[scope[i].getId()]);
			scope[i].setValue(config.settings.editor[scope[i].getId()]);
		}
		scope = settings.app();
		for (var i = 0; i < settings.app().length; i++) {
			scope[i].apply(config.settings.app[scope[i].getId()]);
			scope[i].setValue(config.settings.app[scope[i].getId()]);
		}
			
			//load userDictionary
			userDictionary.load();
			
			//ensure the tab panel starts open and on the 'help' tab
			__selectTab("help");	
	}
	
	//animations
	self.slideUpAndOut = function(elem) { $(elem).parent().find("ul").remove(); $(elem).animate({ minHeight: 0, height: 0, padding: 0}, 400, function() { $(elem).remove(); }) };
	self.slideDownAndIn = function(elem) { $(elem).hide().slideDown(400) };
	self.fadeIn = function(elem) { $(elem).hide().fadeIn("fast") };
	self.fadeOutAndUp = function(elem) { $(elem).animate({ opacity: 0, height: 0, padding: 0}, 400, function() { $(elem).remove(); }) };
	
	self.showWordCount = function(sceneOrProject) {
		var msg = "<strong>Word Count</strong><br>" + sceneOrProject.getName() + "<br><br>\
			Word count: " + sceneOrProject.wordCount()
			+ "<br>Excluding Command Lines: " + sceneOrProject.wordCount(true)
			+ "<br><br>Please note that these figures are only approximations.";
			if (sceneOrProject.constructor == "Project") { msg + "<br><b>Project</b> word counts only take into account OPEN scenes."; }
			bootbox.alert(msg);
	}

	// ╔═╗┬─┐┬┬  ┬┌─┐┌┬┐┌─┐  ╔═╗┌─┐┌─┐┌─┐┌─┐
	// ╠═╝├┬┘│└┐┌┘├─┤ │ ├┤   ╚═╗│  │ │├─┘├┤ 
	// ╩  ┴└─┴ └┘ ┴ ┴ ┴ └─┘  ╚═╝└─┘└─┘┴  └─┘
	
	function hasClass(el, cls) { //https://gist.github.com/jjmu15/8646098
		return el.className && new RegExp("(\\s|^)" + cls + "(\\s|$)").test(el.className);
	}  

	function getSceneName(scenePath) {
		var sceneName = getLastDirName(scenePath);
		return sceneName.substring(0, sceneName.length - 4); //gets rid of .txt extension
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
		var extension;
		extension = scenePath.substring(scenePath.lastIndexOf("."), scenePath.length);
		return extension;
	}
	function getProject(projectPath) {
		for (var n = 0; n < projects().length; n++) {
			if (projects()[n].getPath() === projectPath) {
				return projects()[n];
			}
		}
		return false; //project doesn't exist
	}
	function getProjectPath(scenePath) {
		var newPath = scenePath.replace(/[^\/]*$/, '');
		return newPath;
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
	function projectExists(projectPath) {
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
		}
		else if (!name.match(/^[\w-\s]+$/) && allowSpaces) {
			err = "Name contains invalid characters";
		}
		else if (!name.match(/^[\w-]+$/) && !allowSpaces) {
			err = "Name contains invalid characters";
		}				
		else if (name.toUpperCase().match(reservedSceneNames)) {
			err = "This name is reserved";
		}
		else {
			valid = true;
		}
		callback(valid, err);
	}
	function trimWhitespace(str) {
		str = str.trim() //cull preceding and trailing whitespace
		str = str.replace(/\s{2,}/g, " "); //remove repetitive whitespace
		return str;
	}
	function __wordCount(string, exclCommandLines) {
		exclCommandLines = exclCommandLines || false;
		var wordCount = 0;
		if (exclCommandLines) {
			var nonCommandLines = string.replace(/\*.+$/gm,"");
			nonCommandLines.replace(/^\s+|\s+$/g,"").split(/\s+/).length;
			wordCount = nonCommandLines.replace(/^\s+|\s+$/g,"").split(/\s+/).length;
		} else {
			wordCount = string.replace(/^\s+|\s+$/g,"").split(/\s+/).length; //split remaining lines into words
		}
		if (wordCount === 1 && string === "") { wordCount = 0; }
		return wordCount;
	}
	function __saveProjectTo(project) {
		var newFolderPath;
		switch(project.getSource())
		{
			case "web-dropbox":
				alert("not yet implemented!");
				break;
			default:
				var chooser = $('#saveProjectTo');
				chooser.off().change(function(evt) {
					newFolderPath = $(this).val();
					if (!newFolderPath) { return; }
					alert("..>");
					getFiles(newFolderPath);
				});
				setTimeout(function() {
					chooser.trigger('click'); 
				}, 200);
		}
		function getFiles(path) {
			bootbox.confirm("Write all this project's <b>OPEN</b> scene files to:<br><i>" + path + "</i>?<br>"
				+"The IDE will <b>NOT</b> check before overwriting existing files, so please ensure the path is correct!", function(result) {
				if (result) {
					fh.readDir(path, function(err, files) {
						if (err) {
							bootbox.alert(err);
							return;
						}
						writeFiles(files);
					});
				}
			});
		}
		function writeFiles(files) {
			for (var i = 0; i < files.length; i++) {
				fh.writeFile(newFolderPath + '/' + files[i] + ".txt", fs.readFileSync(project.getPath() + '/' + files[i] + ".txt"), function (err) {
					if (err) {
						bootbox.alert(err);
						return;
					} else {
						//success doesn't do anything (as our original version may still be dirty etc)
					}
				});
			}
		}
	}
	function __selectScene(scene) {
		if (selectedScene() && selectedScene().beingEdited()) { return; } //if already selecting and editing a scene
		selectedScene(scene);
		editor.swapDoc(scene.getDoc());
		alert("Soup!");
		if (selectedScene() == scene && !$('.CodeMirror, cm-s-choicescript').is(':visible')) {
			alert("moose");
			$('.CodeMirror, cm-s-choicescript').show();
			editor.refresh();
		}
	}
	function __quickCloseScene(scene) {
		if (scene.project().scenes().length < 2) {
			projects.remove(scene.project());
		} else {
			scene.project().scenes.remove(scene);
		}
		if (self.selectedScene() == scene) {
			self.selectedScene("");
			self.editor.setValue("");
			$('.CodeMirror, cm-s-choicescript').hide();
		}
		//timeout to stop clash with save config update (needs a more a permanent fix really) CJW
		setTimeout(function() { __updatePersistenceList(); }, 1000);
	}
	__closeScene = function(scene) {
		if (scene.isDirty()) {
			bootbox.dialog({
				message: "Save changes to <b>" + scene.getName() + ".txt?",
				title: "Save Changes?",
				buttons: {
					yes: {
						label: "Yes",
						className: "btn-primary",
						callback: function() {
							__saveScene(scene, function() {
								//if this is the last scene just remove the project
								if (scene.project().scenes().length < 2) {
									projects.remove(scene.project());
								} else {
									scene.project().scenes.remove(scene);
								}
								if (self.selectedScene() == scene) {
									self.selectedScene("");
									self.editor.setValue("");
									$('.CodeMirror, cm-s-choicescript').hide();
								}
								//timeout to stop clash with save config update (needs a more a permanent fix really) CJW
								setTimeout(function() { __updatePersistenceList(); }, 1000);
							});
						}
					},
					no: {
						label: "No",
						callback: function() {
							if (scene.project().scenes().length < 2) {
								projects.remove(scene.project());
							} else {
								scene.project().scenes.remove(scene);
							}
							if (self.selectedScene() == scene) {
								self.selectedScene("");
								self.editor.setValue("");
								$('.CodeMirror, cm-s-choicescript').hide();
							}
							//timeout to stop clash with save config update (needs a more a permanent fix really) CJW
							setTimeout(function() { __updatePersistenceList(); }, 1000);
						}
					}
				}
			});  
		} else {
			if (scene.project().scenes().length < 2) {
				projects.remove(scene.project());
			} else {
				scene.project().scenes.remove(scene);
			}
			if (self.selectedScene() == scene) {
				self.selectedScene("");
				self.editor.setValue("");
				$('.CodeMirror, cm-s-choicescript').hide();
			}
			__updatePersistenceList();
		}
	}
	function __deleteScene(scene) {
		if (scene.getName().toUpperCase() === "STARTUP" || scene.getName().toUpperCase() === "CHOICESCRIPT_STATS")
			{
				noty({'text':"You cannot delete this scene", 'type': 'error', 'layout': 'bottomLeft'});
				return;
			}
			trash([scene.getPath()], function(err) {
				if (err) {
					throw err;
				}
				if (scene.getProject().scenes().length < 2) {
					if (scene.getProject() === self.snippets()) { scene.project().scenes.remove(scene); }
					else { projects.remove(scene.project()); }
				} else {
					scene.project().scenes.remove(scene);
				}
				if (self.selectedScene() == scene) {
					self.selectedScene("");
					self.editor.setValue("");
					$('.CodeMirror, cm-s-choicescript').hide();
				}
				__updatePersistenceList();					
			});
	}
	function __openFolder(path) {
		if (usingNode) {
			gui.Shell.openItem(path);
		} 
		else {
			fileManager.open(path);
		}
	}
	function sceneExists(sceneName, project, callback) {
		var scenePath = project.getPath() + sceneName + '.txt';
		if (usingNode) {
				fs.stat(scenePath, function(err, fileStat) {
				if (err) {
					//console.log(err);
					callback(false);
				}
				else {
					callback(true);
				}
			});
		}
		else {
			db.stat(scenePath, { }, function(err, fileStat) {
				if (err) {
					console.log(err);
					callback(false);
				}
				else if (fileStat.isRemoved) { //db will recognize removed files - but we'll ignore them
					callback(false);
				}
				else {
					callback(true);
				}
			});
		}
	}
	function __closeProject(project, ask) {
		if (!project.isDirty()) {
			if (project === selectedProject()) {
				selectedScene("")
				editor.setValue("");
				if(self.tabs()[0].href() == "run_index.html") {
					self.tabs()[0].href("default.html");
				}
			}
			projects.remove(project);
			__updatePersistenceList();
		} else {
			bootbox.confirm("This project has unsaved scenes, are you sure you wish to close it?", function(result) {
				if (result) {
					if (project === selectedProject()) {
						selectedScene("")
						editor.setValue("");
						$('.CodeMirror, cm-s-choicescript').hide();
							if(self.tabs()[0].href() == "run_index.html") {
								self.tabs()[0].href("default.html");
							}
					}
					projects.remove(project);
					__updatePersistenceList();
				} else {
					return;
				}
			});
		}
	}
/* 	function __renameProject(project) {
		bootbox.prompt({
			title: "Rename to what?<br>  \
			Note that this will not relocate the project",
			value: project.name(),
			callback: function(newName) {
				if (newName === null) {                                             
					//do nothing            
				} else if (project.name() === newName) {
					return;
				} else {
					if (!validName(newName)) {
						bootbox.alert("Invalid Name: Please use only letters, numbers, underscores and hypens");
						return;
					}
					trimWhitespace(newName);
					project.name(newName);
					__updatePersistenceList();
				}
			}
		});	
	} */
	function __testProject(project, test) {
		if (test != "random" && test != "quick") { alert("Error: no such test as " + test + "test!"); return; }
		if (typeof project === "undefined" || project === "") { alert("Error: no project given to " + test + "test!"); return; }
		activeProject(project);
		var test_win = gui.Window.open("lib/choicescript/" + test + "test.html", {'position': 'center', 'toolbar': false, 'icon': 'Resources/img/icon.png', 'focus': true });
		setTimeout(function() { test_win.title = test.toUpperCase() + "TEST - " + project.getName(); }, 200);
		//__reloadTab(self.tabs()[0], "lib/choicescript/" + test + "test.html");
	}
	function __openAllProjectScenes(project) {
		var path = project.getPath();
		fh.readdir(path, function(err, files) {
			load(err, files, platform);
		});
		function load(err, files, source) {
			if (err) { console.log(err); } 
			else {
				var filePath, fileExtension;
				for (var i = 0; i < files.length; i++) {
					fileExtension = files[i].substring(files[i].lastIndexOf('.'), files[i].length);
					if (fileExtension != ".txt") {
						continue; //we only care about .txt files
					}
					filePath = path + files[i];
					openScene(filePath, source);
				}
			}			
		}
	}
	function __reloadTab(tab, path) { 	//refreshes iframe tabs, or changes target if second param is passed
		var href = path || tab.href();
		tab.href('');
		tab.href(href);
	}
	function __selectTab(id) {
		$("#tabs").tabs("option", "active", $("#" + id).index() - 1);
	}
	function __shortCompile(project, callback) {
		var statusBox = noty({text: "Compiling...", closeWith: false, timeout: false});
		$.ajaxSetup({ cache: true }); //we don't need to reload scene.js all the time
		$.getScript("lib/choicescript/web/scene.js")
		.done(function() {
			var allScenes = {};
			var projectFiles;
			var projectPath = project.getPath();
			fh.readDir(projectPath, function (err, filePaths) {
				next(err, filePaths);
			});
			function addScene(filename, data) {
				var scene = new Scene();
				scene.loadLines(data);
				var sceneName = getSceneName(filename);
				allScenes[sceneName] = {};
				allScenes[sceneName].crc = scene.temps.choice_crc;
				allScenes[sceneName].labels = scene.labels;
				allScenes[sceneName].lines = scene.lines;
			}
			function next(err, filePaths) {
				if (err) {
					console.log(err);
				}
				else {
					var projectFiles = filePaths;			
				}
				for (var i = 0; i < filePaths.length; i++) {
					if (getFileExtension(filePaths[i]) === ".txt") {
						loadLines(filePaths[i]);
						console.log("Adding: " + filePaths[i]);
					}
					else {
						console.log("Ignoring: " + filePaths[i]);
					}
				}
				console.log(allScenes);
				cside.allScenes = allScenes;
				statusBox.close();
				if (typeof callback === "function") callback();
			}
			function loadLines(filename, last) {
				fh.readFile(projectPath + filename, {}, function (err, data) {
					if (err) {
						console.log(err);
					} 
					else {
						addScene(filename, data);
					}
				});
			}				
		});
	}
	function __compileProject(project) {
		var csRoot = "Resources/lib/choicescript/web/"
		var projectRoot = project.getPath();
		jQuery.getScript("lib/choicescript/web/scene.js")
		.done(function() {
			//1. Grab CS html file
			var game_html = fs.readFileSync(csRoot + "mygame/index.html", {encoding: "utf-8"});
			//2. Find and extract all .js file data
			var next_file = "";
			var patt = /<script.*?src=["'](.*?)["']><\/script>/gim;
			var doesMatch = false;
			var jsStore = [];
			console.log("\nExtracting js data from:");
			while (doesMatch = patt.exec(game_html)) {
				if (doesMatch[1] != "../version.js") {
					console.log(doesMatch[1]);
					next_file = fs.readFileSync(csRoot + 'mygame/' + doesMatch[1], {encoding: "utf-8"});
					if (next_file != "undefined" && next_file != null) {
							//temp fix for unescaped script tags & bad characters in ui.js 
							if (doesMatch[1] == "../ui.js") {
								next_file = next_file.substring(3, next_file.length);
								next_file = "/*" + next_file;
								next_file = next_file.replace(/<\/script>/, "<\\/script>");
							}
						jsStore.push(next_file);
					}
				}
			}
			//3. Find and extract all .css file data
			patt = /^\<link[\s][\w'"\=\s\.\/]*[\s]?href\=["']([\w\.\/]*.css)["']/gim;
			var doesMatch;
			var cssStore = "";
			console.log("\nExtracting css data from:");
			while (doesMatch = patt.exec(game_html)) {
				console.log(doesMatch[1]);
				next_file = fs.readFileSync(csRoot + 'mygame/' + doesMatch[1], {encoding: "utf-8"});
				if (next_file != "undefined" && next_file != null) {
					cssStore = cssStore + next_file;
				}
			}

			//4. Remove css links
			patt = /^<link[\s][\w'"\=\s\.\/]*>/gim;
			game_html=game_html.replace(patt,"");

			//5. Remove js links
			patt = /^<script src\=[\w'"\=\s\.\/]*><\/script>/gim;
			game_html=game_html.replace(patt,"");

			//6. Slice the document and check for a *title
			var top = game_html.slice(0, (game_html.indexOf("</head>") - 1));
			var bottom = game_html.slice((game_html.indexOf("</head>")), game_html.length);
				
			//if we have a title, set the <h1> and <title> tags to it
			/* var gameTitle = "";
			if (gameTitle != "") {
				patt = /<title>.*<\/title>/i;
				if (patt.exec(top)) top = top.replace(patt, "<title>" + gameTitle + "</title>");
				patt = /<h1.*>.*<\/h1>/i;
				if (patt.exec(bottom)) bottom = bottom.replace(patt, "<h1 class='gameTitle'>" + gameTitle + "</h1>");
				console.log("");
				console.log("Game title set to: " + gameTitle);
			} */
			
			//AS IT'S THE IDE WE'LL TAKE THE PROJECT NAME
			var gameTitle = project.getName();
			
			//7.2 Create the allScenes object
			console.log("");
			console.log("Combining scene files...");
			var allScenes = {};
			var scene_data = "";
			for (var i = 0; i < project.getScenes().length; i++) {
				if (project.getScenes()[i] == 'choicescript_upgrade.txt') continue;
					scene_data = fs.readFileSync(project.getScenes()[i].path(), {encoding: "utf-8"});
					var scene = new Scene();
					scene.loadLines(scene_data);
					var sceneName = project.getScenes()[i].name().replace(/\.txt/gi,"");
					sceneName = sceneName.replace(/ /g, "_");
					allScenes[sceneName] = {};
					allScenes[sceneName].crc = scene.temps.choice_crc;
					allScenes[sceneName].labels = scene.labels;
					allScenes[sceneName].lines = scene.lines;
			}
			
			var allJs = "";
			for (var i = 0; i < jsStore.length; i++) {
				var patt = /^<\/script>/gim;
					jsStore[i]=jsStore[i].replace(patt,"<\/script>");
					var thisJs = "<script>" + jsStore[i] + "<\/script>";
					allJs = allJs + thisJs;
			}
			
			//7.3 Include smPlugin.js
			allJs = allJs + "<script>" +  fs.readFileSync("Resources/js/mods/smPlugin.js", {encoding: "utf-8"}) + "</script>";
			
			//8. Reassemble the document (selfnote: allScenes object seems to cause issues if not in its own pair of script tags)
			console.log("Assembling new html file...");
			var new_game = top + "<script> allScenes = " + toJson(allScenes) + "<\/script>" + allJs + "<style>" + cssStore + "<\/style>" + bottom;
			return new_game;
		})
		.fail(function() {
			/* boo, fall back to something else */
			bootbox.alert("Error: Export failed!");
			return false;
		});
	}
	function __updateConfig() {
		var newConfig = JSON.stringify(config, null, "\t");
		localStorage.setItem("CSIDE_appConfig", newConfig);
	}
	function __updatePersistenceList() {
		config.openProjects = [];
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
					"color": projects()[i].getScenes()[n].getMarkColour()
				}
				thisProject.openScenes.push(thisScene);
			}
			config.openProjects.push(thisProject);
		}
		__updateConfig();
	}
	self.makeSortable = function (data) {
		__makeSortable(data);
	}
	function __updateSceneOrder(sortable, event, ui) {
		var list = $(sortable).children();
		if (list.length < 2) return; //there's no point sorting
		for (var i = 0; i < list.length; i++) {
			ko.dataFor(list[i]).order = i;
		}
		ko.dataFor(list[0]).getProject().getScenes().sort(function(left, right) {
			return left.order == right.order ? 0 : (left.order < right.order ? -1 : 1) //CJW might have bugged this (as it's out of scope)
		})
		__updatePersistenceList();
	}
	function __makeSortable(data) {
		var elem = data[1];
		$(elem).find("> .project").sortable({ axis: "y", items: ".scene", connectWith: "#main-project-wrap > .project-wrapper > .project", 
			placeholder: "project-hover", containment: $("#main-project-wrap"),
			start: function(event, ui) {
				ui.item.data('original_pos', ui.item.index());
			},
			receive: function( event, ui ) {
				var targetProject = ko.dataFor(this);
				var movingScene = ko.dataFor(ui.item[0]);
				function execute(action) {
					sceneExists(movingScene.getName(), targetProject, function(exists) {
						$(ui.sender).sortable('cancel');
						if (exists) {
							bootbox.alert("This scene already has a project by that name, please delete it first then try again.");
						} 
						else {
							action();
						}
					});			
				}
				bootbox.dialog({
					message: "Would you like to make a <b>copy</b> of this scene in this project, or <b>move</b> it to this project?",
					title: "What would you like to do?",
					buttons: {
						copy: {
							label: "Copy",
							className: "btn-primary",
							callback: function() {
								execute(function() { movingScene.copyTo(targetProject);	});
							}
						},
						move: {
							label: "Move",
							callback: function() {
								execute(function() { movingScene.moveTo(targetProject);	});
							}
						},
						cancel: {
							label: "Cancel",
							callback: function() {
								$(ui.sender).sortable('cancel');
							}
						}
					}
				});  
			}, 
			//track scene order
			stop: function(event, ui) {
				if (ui.item.index() === ui.item.data('original_pos')) { return; }
				//__updateSceneOrder(this, event, ui);
			}
		});
	}
	
	//EXTENDERS
 	ko.extenders.normalizePaths = function(target, option) {
		target(target().replace(/\\/g, '/')); //initial
		target.subscribe(function(newValue) {
			//when changed
			target(newValue.replace(/\\/g, '/'));
		});
		return target;
	};
/* 	ko.extenders.validateName = function(target) {
		//add some sub-observables to our observable
		target.hasError = ko.observable();
		target.validationMessage = ko.observable();

		//define a function to do validation
		function validate(newValue) {
			validName(newValue, function(valid, errMsg) {
				target.hasError(valid ? false : true);
				if (valid) {
					//do nothing
				}
				else {
					target.validationMessage(errMsg);
				}
			});
		}

		//initial validation
		validate(target());

		//validate whenever the value changes
		target.subscribe(validate);

		//return the original observable
		return target;
	}; */
	ko.bindingHandlers.bindIframe = {
	  init: function(element, valueAccessor) {
		function bindIframe() {
			try {
				var iframeInit = element.contentWindow.initChildFrame,
					iframedoc = element.contentDocument.body;
			} catch(e) {
				// ignored
			}
			if (iframeInit)
				iframeInit(ko, valueAccessor());
			else if (iframedoc){
				ko.applyBindings(valueAccessor(), iframedoc);
			}
		};
		bindIframe();
		ko.utils.registerEventHandler(element, 'load', bindIframe);
	  }
	};
	ko.bindingHandlers.fadeVisible = {
		init: function(element, valueAccessor) {
			// Initially set the element to be instantly visible/hidden depending on the value
			var value = valueAccessor();
			$(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
		},
		update: function(element, valueAccessor) {
			// Whenever the value subsequently changes, slowly fade the element in or out
			var value = valueAccessor();
			ko.utils.unwrapObservable(value) ? $(element).fadeIn(300) : $(element).fadeOut(300);
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
			ko.unwrap(value) ? $(element).slideDown(300).animate({'opacity': 1}, {queue: false, duration: 200 }) : $(element).slideUp(300).animate({'opacity': 0}, {queue: false, duration: 200 });
		}
	};
	ko.bindingHandlers.initFiles = {
		init: function(element, valueAccessor) {
			$(element).draggable({cursor: "move", cursorAt: {left:5, top: 5}, scroll:true,
				start: function(event,ui) { 
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
			$(element).droppable({accept: ".file, .folder-ul",
				over: function( event, ui ) {
					$(this).css("background-color", "#F7F7E1");
				}, out: function( event, ui ) {
					$(this).css("background-color", "");
				}, drop: function( event, ui ) {
					$(this).delay(100).fadeOut().fadeIn('slow');
					var targetFolder = $(this);
					$('.folder-selected').each(function() {
							moveDropboxItem($(this), targetFolder);
					});
					}
				})
				.draggable({cursor: "move", cursorAt: {left:5, top: 5}, scroll:true,
				start: function(event,ui) { 
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
		function fileManager() {
			//key events
			var shiftPressed = false;
			var ctrlPressed = false;
			$(document).keydown(function (e) {
				if (e.keyCode == 17) {
					e.preventDefault();
					ctrlPressed = true;
				} if (e.keyCode == 16) {
					e.preventDefault();
					shiftPressed = true;
				}
			});
			$(document).keyup(function (e) {
				if (e.keyCode == 17) {
					e.preventDefault();
					ctrlPressed = false;
				} if (e.keyCode == 16) {
					e.preventDefault();
					shiftPressed = false;
				}
			});
			//end key events
			var self = this;
			var visible = ko.observable(false);
			var loading = ko.observable(false);
			self.isVisible = ko.computed(function() {
				return visible();
			}, this);
			self.isLoading = ko.computed(function() {
				return loading();
			}, this);
			self.path = "/";
			self.filesAndFolders = ko.observableArray([]);
			self.selection = ko.observableArray([]);
			function fileFolderItem(data) {
				this.name = data.name;
				this.path = data.path;
				this.icon = data.icon ? data.icon : data.isFolder ? 'fa fa-folder-o fa-lg' : 'fa fa-file-o fa-lg';
				this.selected = ko.observable(false);
				this.index = data.listIndex;
				this.select = function(data, event, forcedValue, skipKeyCheck) {
					if (!skipKeyCheck) {
						var selectedList = self.selection();
						var fullList = self.filesAndFolders();
						if (!ctrlPressed && !shiftPressed && selectedList.length > 0) {
							for (var s in selectedList) {
								fullList[selectedList[s].index].selected(false);
							}
							self.selection([]);
						}
						else if (shiftPressed) {
							selectedList.sort(function(a, b) { return a.index - b.index}); //sort our selection array, so it's in sync with visual shift select
							var topToBottom = false;
							if (self.selection() < 1) {
								for (var i = 0; i < this.index; i++) {
									fullList[i].select({}, {}, true, true);
								}
							}
							else {
								//are we top to bottom or bottom to top
								for (var i = 0; i < this.index; i++) {
									if (fullList[i].selected()) { //bottom to top
										topToBottom = true;
										break;
									}
								}
								if (topToBottom) {
									for (var i = selectedList[0].index; i < this.index; i++) {
										if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
									}
								}
								else {
									for (var i = selectedList[selectedList.length - 1].index; i > this.index; i--) {
										if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
									}				
								}
							}
						}
					}
					forcedValue ? this.selected(forcedValue) : this.selected() ? this.selected(false) : this.selected(true);
					self.selection.push(this);
				}
				if (data.isFolder) {
					this.open = function() { self.redraw(this.path); }
				}
				else {
					this.open = function() { self.close(); openScene(this.path, platform); }
				}
				this.dateModified = data.modifiedAt || "";
				if (this.dateModified != "") {
					var parsedDate = {};
						parsedDate.day = data.modifiedAt.getDate();
						parsedDate.month = data.modifiedAt.getMonth();
						parsedDate.year = data.modifiedAt.getFullYear();
						parsedDate.hours = data.modifiedAt.getHours();
						parsedDate.mins = data.modifiedAt.getMinutes();
						if (parsedDate.mins.toString().length < 2) {
							parsedDate.mins = '0' + parsedDate.mins.toString();
						}
						this.dateModified = " - last modified at " + parsedDate.day + '/' + parsedDate.month + '/' + parsedDate.year + ' at ' + parsedDate.hours + ':' + parsedDate.mins;
				}
			}
			this.close = function() {
				var selectedList = self.selection();
				var fullList = self.filesAndFolders();
				for (var s in selectedList) {
					fullList[selectedList[s].index].selected(false);
				}
				self.selection([]);
				visible(false);
			}
			this.open = function(path) {
				path = path || self.path;
				visible(true);
				self.redraw(path);
			}
			this.redraw = function(path) {
				loading(true);
				self.path = path;
					self.filesAndFolders([]);
					self.selection([]);
					var position = 0;
				db.readdir(path, {}, function(err, list, folderStats, listStats) {
					if (self.path != "/" && self.path != "") {
						//backup option
						var array = self.path.split("/");
						array.pop(); //remove deepest folder
						var parentPath = array.join("/");
						self.filesAndFolders.push(new fileFolderItem({"name": "Up a level", "path": parentPath, "isFolder": true, "icon": 'fa fa-level-up fa-lg', 'listIndex': position}));
						position++;
					}
					for (var i = 0; i < listStats.length; i++) {
						if (!listStats[i].isFolder && getFileExtension(listStats[i].path) != '.txt') continue; //ignore anything but folders and .txt files
						listStats[i].listIndex = position;
						position++;
						self.filesAndFolders.push(new fileFolderItem(listStats[i]));
					}
					loading(false);
				});
/* 				self.filesAndFolders().sort(function (a, b) {
					if (a.isFolder === b.isFolder) {
						if (a.name === b.name){
							return 0;
						}
						else if (a.name < b.name) {
							return -1;
						}
						else {
							return 1;
						}
					}
					else if (b.isFolder) {
						return -1;
					}
					else {
						return 1;
					}
				}); */
			}

			this.executeTask = function() {
				var fullList = self.filesAndFolders();
				var selectedList = self.selection();
				for (var s in selectedList) {
					fullList[selectedList[s].index].open();
				}
			};
		}
	}
	if (!usingNode) {
		var fileManager = new fileManager();
		ko.applyBindings(fileManager, $('#file-manager-canvas')[0]);
	}
	
	function contextMenuViewModel() {
		var self = this;
		self.isReady = function() {
			return true;
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
			},	[
					new menuOption("Word count", function(menu) {
						cside.showWordCount(menu.getTarget());
					})
				]
			),
			new menuOption("Export", function(menu) {
				//do nothing
			},	[
					new menuOption("All files to folder", function(menu) {
						__saveProjectTo(menu.getTarget());
					}),
					new menuOption("Compiled game", function(menu) {
						//menu.getTarget().compile();
					})
				]
			),
			new menuOption("Open project folder", function(menu) {
				menu.getTarget().openFolder();
			}),
			new menuOption("Close project", function(menu) {
				menu.getTarget().close();
			})
		]);
		if (usingNode) { //Tests only work with the desktop versions - add to front of menu
			projectMenuOptions.unshift(new menuOption("Test Project", function(menu) {
				//do nothing
				},	[
						new menuOption("Quicktest", function(menu) {
							menu.getTarget().test("quick");
						}), 
						new menuOption("Randomtest", function(menu) {
							menu.getTarget().test("random");
						})
					]
				)
			);
		}
		var sceneMenuOptions = ko.observableArray([
/* 			new menuOption("[!] Save to...", function(menu) {
				//do nothing?
			}), */
/*			new menuOption("Rename", function(menu) {
				menu.getTarget().rename({}, { type: "contextMenu" });
			}), */
			new menuOption("Review", function(menu) {
				//do nothing
			},	[
					new menuOption("Word count", function(menu) {
						cside.showWordCount(menu.getTarget());
					})
				]
			),
/* 			new menuOption("[!] Pin to notes", function(menu) {
				//do nothing
			}), */
			new menuOption("Reload", function(menu) {
				menu.getTarget().load();
			}),
			new menuOption("Close", function(menu) {
				menu.getTarget().close();
			}),
 			new menuOption("Delete file", function(menu) {
				menu.getTarget().del();
			}),
		]);
		var menu = ko.observable();
		//ACCESSOR METHODS
		self.getContextMenu = ko.computed(function() {
			return menu();
		}, this);
		
		//project & scene context menus
		$(function () {
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
					menu(new contextMenu(scene, sceneMenuOptions));
					return true;
				}
			});
			$('.CodeMirror-code').contextmenu({
				target: '#context-menu',
				scopes: '.cm-spell-error',
				before: function(e, element) {
					if (typo.working) return;
					typo.working = true;
					menu(new contextMenu(null, ko.observableArray([new menuOption("Working...", function() {})]))); //blank is better than an old context menu
					var pos = editor.coordsChar({"left":e.originalEvent.x, "top":e.originalEvent.y});
					editor.setCursor(pos); //manually position the cursor as the context menu prevents default
					var tok = editor.getTokenAt(pos);
					var word = element.text();
					var menuOptions = ko.observableArray([]);
					function replaceText(text, undo) {
						editor.replaceRange(text, {line: pos.line , ch:tok.start},{line:pos.line , ch:tok.end});
						if (undo)
							editor.getDoc().undo();
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
									})
								);
							})(i);
						}
						//defaults
						menuOptions.push(new menuOption("Ignore '" + word + "' this session", function() {
								userDictionary.add(word, "session");
							})
						);
						menuOptions.push(new menuOption("Add '" + word + "' to user dictionary", function() {
								userDictionary.add(word, "persistent");
							})
						);
						typo.working = false;
						menu(new contextMenu(null, menuOptions));
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