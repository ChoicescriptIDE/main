	function CSIDE_ContextMenu() {
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