var MouseTrap = require('mousetrap');
var Mousetrap = new MouseTrap(document.documentElement);
usingNode = true;
if (usingNode) {

	var macosKeyDown = false;
	var wKeyDown = false;

	window.addEventListener('keydown', function(event) {
		if (event.key === "Meta") {
			macosKeyDown = true;
		}
		return true;
	});
	window.addEventListener('keyup', function(event) {
		if (event.key === "Meta") {
			macosKeyDown = false;
		}
		return true;
	});
	window.addEventListener('close', function (event) {
		if (macosKeyDown || wKeyDown) {
			// try to redirect anything that looks like a CMD+W quit
			if (cside.getActiveFile()) cside.getActiveFile().close();
			return;
		}
		if (["IFRAME", "WEBVIEW"].includes(document.activeElement.tagName)) {
			// don't allow CMD+W in iframes to quit the app either
			return;
		}
		console.log(event);
		if (cside.isUpdating()) {
			updateClosure();
		} else {
			dirtyClosure(); //handles dirty saves/projects and calling win.close(true);
		}
	});
}

Mousetrap.bind(['command+s', 'ctrl+s'], function(e) {
	if (cside.getSelectedScene()) cside.getSelectedScene().save();
	return false;
});
Mousetrap.bind(['command+t', 'ctrl+t'], function(e) {
	if (cside.getSelectedProject()) cside.getSelectedProject().test("quick");
	return false;
});
Mousetrap.bind(['command+shift+t', 'ctrl+shift+t'], function(e) {
	if (cside.getSelectedProject()) cside.getSelectedProject().test("random");
	return false;
});
Mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], function(e) {
	if (cside.getSelectedProject()) cside.getSelectedProject().save();
	return false;
});
Mousetrap.bind(['command+w', 'ctrl+w'], function(e) {
	if (cside.getSelectedScene()) cside.getSelectedScene().close();
	return false;
});
Mousetrap.bind(['command+shift+w', 'ctrl+shift+w'], function(e) {
	if (cside.getSelectedProject()) cside.getSelectedProject().close();
	return false;
});
Mousetrap.bind(['command+n', 'ctrl+n'], function(e) {
	if (cside.getSelectedProject()) cside.getSelectedProject().addNewScene();
	return false;
});
Mousetrap.bind(['command+shift+n', 'ctrl+shift+n'], function(e) {
	cside.createProject();
	return false;
});
if (usingNode && win.showDevTools) {
    Mousetrap.bind(['command+option+i', 'F12'], function(e) {
    	win.showDevTools();
    	return false;
    });
}
Mousetrap.bind(['command+shift+p', 'ctrl+shift+p'], function() {
	cside.tabPanel();
	return false;
});
Mousetrap.bind(['command+shift+f'], function() {
    cside.session.win.toggleMaximize();
	return false;
});
Mousetrap.bind(['command+ctrl+f'], function() {
	cside.maxFramelessWindow();
	return false;
});
Mousetrap.bind(['command+shift+o', 'ctrl+shift+o'], function() {
	if (cside.getSelectedProject()) cside.getSelectedProject().openAllScenes();
	return false;
});
Mousetrap.bind(['command+o', 'ctrl+o'], function() {
	cside.openFileBrowser();
	return false;
});
Mousetrap.bind(['command+q', 'ctrl+shift+q'], function() {
    win.close();
	return false;
});

function dirtyClosure() {
    function quit() {
        try {
            //saveWindowState();
            //if (win.isFullscreen) win.leaveFullscreen();
            win.hide();
            gui.App.closeAllWindows();
            win.close(true);
        }
        catch(e) {
            gui.App.closeAllWindows();
            win.close(true);
        }
    }
	if (!cside.session.isDirty() || cside.getProjects().length === 0) {
		window.electronAPI.process.exit();
	}
	bootbox.dialog({
		message: "One or more scenes has unsaved changes, are you sure you want to quit?",
		title: "Unsaved Changes",
		buttons: {
			yes: {
				label: "Don't save",
				className: "btn-primary",
				callback: function() {
                    quit();
				}
			},
			saveandquit: {
				label: "Save & Quit",
				callback: function() {
					var n = cside.notification("", "<i aria-hidden=true class='fa fa-refresh fa-spin'></i> Saving files. Please do not close CSIDE.",
						{ closeWith: false, timeout: false });
					cside.session.save(function(err) {
						n.close();
						if (!err) {
							quit();
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
}

function updateClosure() {
    if (cside.isUpdating()) {
        bootbox.dialog({
            message: "The IDE is currently updating, are you sure wish to close the program? This is likely to cause the app package to corrupt.",
            title: "Update in Progress",
            buttons: {
                yes: {
                    label: "Quit",
                    className: "btn-primary",
                    callback: function() {
                        dirtyClosure();
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
    }
}

//handle drag and drop opening of files
$('#splash').fadeOut(100);
document.ondragenter = function(e) {
	e.preventDefault();
	e.stopPropagation();
    var dt = e.dataTransfer;
	return false;
};
document.ondragleave = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
document.ondragover = function(e) { e.preventDefault(); return false };
document.ondrop = function(e) { e.preventDefault(); return false };

window.onload = function() {
	//stops drop behaviour on iframes
	for (var i = 0; i < window.frames.length; i++) {
		window.frames[i].ondragover = function(e) { e.preventDefault(); return false };
		window.frames[i].ondrop = function(e) { e.preventDefault(); return false };
	}
}

document.getElementById("sidebar").ondragover = function(e) {
	e.preventDefault();
	e.stopPropagation();
	return false;
};
document.getElementById("sidebar").ondragleave = function(e) {
	e.preventDefault();
	e.stopPropagation();
	return false;
 }
document.getElementById("sidebar").ondragenter = function(e) {
	e.preventDefault();
	e.stopPropagation();
	return false;
}

document.getElementById("sidebar").ondrop = function(e) {
	e.preventDefault();
	if (!window.usingNode) return false;
	  var fileList = e.dataTransfer.files;
	  var file;
	  for (var i = 0; i <  fileList.length; i++) {
		  file = e.dataTransfer.files[i];
		  if (file.path.substring(file.path.lastIndexOf("."), file.path.length) == ".txt") {
			cside.openScene(file.path);
		  }
	  }
};