	var settings = {
		'editor': ko.observableArray([
			new CSIDESetting({"id": "smartindent", "name": "Smart Indentation", "value": true, "type": "binary", "cat": "editor",
				"apply": function(val) {
					if (val) { 
						editor.setOption("smartIndent", true); 
					} else {
						editor.setOption("smartIndent", false); 
					}  
				}
			}),
			new CSIDESetting({"id": "linewrap", "name": "Line Wrapping", "value": true, "type": "binary", "cat": "editor",
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
			new CSIDESetting({"id": "autosuggest", "name": "Auto Suggest", "value": true, "type": "binary", "cat": "editor",
				"apply": function(val) {
					if (val) {
						var setting = this;
						//assign function event to the editor instance
						setting.timeout;
						editor.on("inputRead", function(cm, change) {
							if (!setting.getValue()) { return; }
							if (change.text.length == 1) {
								if (change.text[0].match(/\w$/)) { //only fire on word characters
									if (setting.timeout) { clearTimeout(setting.timeout); }
									setting.timeout = setTimeout(function() {
										CodeMirror.showHint(cm, null, {completeSingle: false, extraKeys: {Enter: function() { return false; } }});
									}, 150);		
								}
							}
						});
					}
				}
			}),
			new CSIDESetting({"id": "spellcheck", "name": "Spell Check", "value": true, "type": "binary", "cat": "editor",
				"apply": function(val) {
					//conditional is handled in choicescript.js CodeMirror mode
					editor.setOption("spellcheck", val);
					editor.forceSyntaxRedraw();
				}
			}),
			new CSIDESetting({"id": "tabtype", "name": "Tab Type", "value": "tabs", "type": "variable", "cat": "editor", "options": 
				[{"desc": "Tabs", "value": "tabs"}, {"desc": "Spaces", "value": "spaces"}],
				"apply": function(val) {
					if (val == "spaces") {
						CodeMirror.keyMap.basic.Tab = "spacedTab";
						editor.setOption("indentWithTabs", false);
					}
					else {
						CodeMirror.keyMap.basic.Tab = "defaultTab";
						editor.setOption("indentWithTabs", true);
					}
				}
			}),
			new CSIDESetting({"id": "tabsize", "name": "Tab/Indent Block Size", "value": "4", "type": "variable", "cat": "editor", "options": 
				[{"desc": "2", "value": "2"}, {"desc": "4", "value": "4"}, {"desc": "6", "value": "6"}, {"desc": "8", "value": "8"}],
				"apply": function(val) {
					var intVal = parseInt(val, 10);
					editor.setOption("indentUnit", intVal);
					editor.setOption("tabSize", intVal);
				}
			}),
			new CSIDESetting({"id": "fontsize", "name": "Font Size (px)", "value": "12px", "type": "variable", "cat": "editor", "options": 
				[{"desc": "10", "value": "10px"}, {"desc": "12", "value": "12px"}, {"desc": "14", "value": "14px"}, {"desc": "16", "value": "16px"}],
				"apply": function(val) {
					$('#editor-wrap').css("font-size", val);
					editor.refresh(); 
				}
			}),
			new CSIDESetting({"id": "spell_dic", "name": "Spell Check Dictionary", "value": "en_US", "type": "variable", "cat": "editor", "options": 
				[{"desc": "English (US)", "value": "en_US"}, {"desc": "English (GB)", "value": "en_GB"}],
				"apply": function(val) {
					if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
						// FF can't handle backslashed paths?
						typo = new Typo (val, typo._readFile("lib/typo/dictionaries/" + val + "/" + val + ".aff"), typo._readFile("lib/typo/dictionaries/" + val + "/" + val + ".dic"), {
							platform: 'any'
						});
					} else {
						typo = new Typo (val, typo._readFile("lib\\typo\\dictionaries\\" + val + "\\" + val + ".aff"), typo._readFile("lib\\typo\\dictionaries\\" + val + "\\" + val + ".dic"), {
							platform: 'any'
						});
					}
					editor.forceSyntaxRedraw();
				}
			}),
			new CSIDESetting({"id": "theme", "name": "Editor Theme", "value": "cs-light", "type": "variable", "cat": "editor", "options": 
				[{"desc": "Dark", "value": "cs-dark"}, {"desc": "Light", "value": "cs-light"}, {"desc": "Dichromatic", "value": "cs-dichromatic" }],
				"apply": function(val) {
					//conditional is handled in choicescript.js CodeMirror mode
					if (val == "lesser-dark" || val == "choicescript" || val == "erlang-dark") { val = "cs-light"; } //handle any old config values
					editor.setOption("theme", val);
				}
			})
		]),
		"app": ko.observableArray([
			new CSIDESetting({"id": "autosave", "name": "Autosave Scenes & Projects", "value": false, "type": "binary",
				"apply": function(val) {
					if (val) {
						autoSaveFn = setInterval(function() {
							var status = noty({text: "<img src='./img/ui/loading.gif'/> Saving..."});
							for (var i = 0;i < projects().length; i++) {
								projects()[i].save();
							}
						}, 300000);
					} else {
						if (typeof autoSaveFn != "undefined" && autoSaveFn) {
							clearInterval(autoSaveFn);
						}
					}
				}
			}),
			new CSIDESetting({"id": "persist", "name": "Persistent Session", "value": false, "type": "binary",
				"apply": function(val) {
					if (val) {
						//self.updatePersistenceList(); causes issues
					}
				}
			}),
			new CSIDESetting({"id": "cmdhelp", "name": "Command Help (prompts & links)", "value": false, "type": "binary",
				"apply": function(val) {
					if (val) {
						$(".CodeMirror").off()
							.on('mouseover', '.cm-builtin', function() {
								//var text = $(this).html();
								//var commandName = text.match(/^\*[\w]+/)[0].substring(1, text.length); //regex = no spaces
								$(this).css("cursor", "pointer");
								$(this).attr("title", "Click for help with this command");
								//$(this).attr("title", "Click for help on *" + commandName);
							})
							.on('mouseout', '.cm-builtin', function() {
								$(this).css("cursor", "");
								$(this).removeAttr("title");
							})
							.on('click', '.cm-builtin', function() {
								var text = $(this).html();
								var commandName = text.match(/^\*[\w]+/)[0].substring(1, text.length); //regex = no spaces
								frames[1].$('#content').load('commands/' + commandName + '.html'); //CJW needs to not be a magic number?
								__selectTab("help");
								//gui.Shell.openExternal("http://www.choicescriptdev.wikia.com/" + commandName); Link to wiki command page directly
							});
					} else {
						$(".CodeMirror").off();
					}
				}
			}),
			new CSIDESetting({"id": "update-channel", "name": "Update Channel - v" + version, "value": "stable", "type": "variable", "options": 
				[{"desc": "Stable", "value": "stable"}, {"desc": "Latest", "value": "latest"}, {"desc": "None", "value": "none"}],
				"apply": function(val) {
					if (val != "none") {
						self.checkForUpdate();
					} else {
						//do nothing
					}
				}
			})
		]),
		"asObject": function (settingType) {
			if (typeof settings[settingType] != 'undefined') {
				var arr = settings[settingType]();
				var obj = {};
				console.log(arr);
				for (var i = 0; i < arr.length; i++) {
					obj[arr[i].getId()] = arr[i].getValue();
				}
				return obj;
			}
			else {
				console.log("Invalid settings type passed to settings.asObject function.");
			}
		}
	}