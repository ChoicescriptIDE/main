	if (self.platform !== "mac_os") {
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
			"Ctrl-Q": function(ed) {
				selectedProject().run();
			},
			"Ctrl-O": function(ed) {
				self.openScenes();
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
			"Shift-Ctrl-P": function(ed) {
				self.tabPanel();
			},
			"Shift-Tab": function(ed) {
				ed.indentSelection("subtract");
			},
			"Ctrl-B": function(ed) {
				insertTextTags("b");
			},
			"Ctrl-I": function(ed) {
				insertTextTags("i");
			},
			"F11": function(ed) {
				ed.setOption("fullScreen", !ed.getOption("fullScreen"));
			},
			"Esc": function(ed) {
				ed.setOption("fullScreen", !ed.getOption("fullScreen"));
			} 
		}
	}
	else if (self.platform === "mac_os") {
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
				gui.App.closeAllWindows();
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
			"Shift-Cmd-P": function(ed) {
				self.tabPanel();
			},	
			"Shift-Cmd-O": function(ed) {
				selectedProject().openAllScenes();
			},
			"Shift-Tab": function(ed) {
				ed.indentSelection("subtract");
			},
			"Cmd-O": function(ed) {
				self.openScenes();
			},
			"Cmd-B": function(ed) {
				insertTextTags("b");
			},
			"Cmd-I": function(ed) {
				insertTextTags("i");
			},
			"F11": function(ed) {
				ed.setOption("fullScreen", !ed.getOption("fullScreen"));
			},
			"Esc": function(ed) {
				ed.setOption("fullScreen", !ed.getOption("fullScreen"));
			},
			//Mac cut, copy and paste don't work by default? MIGHT be a node-webkit thing.
			"Cmd-X": function(ed) {
				document.execCommand("cut");
			},
			"Cmd-C": function(ed) {
				document.execCommand("copy");
			},
			"Cmd-V": function(ed) {
				document.execCommand("paste");
			}
		}
	}