//var MouseTrap = require('mousetrap');
//var Mousetrap = new MouseTrap(document.documentElement);

if (usingNode) {
	gui.App.on('open', function(path) {
		if (path.substring(path.lastIndexOf("."), path.length) == ".txt") cside.openScene(path.replace("file://", ""));
	});

	if (gui.App.argv) {
		var path = "";
		for (var i = 0; i < gui.App.argv.length; i++) {
			path = gui.App.argv[i];
			if (path.substring(path.lastIndexOf("."), path.length) == ".txt") cside.openScene(path.replace("file://", ""));
		}
	}

	win.on('close', function (event) {
        if (cside.isUpdating()) {
            updateClosure();
        } else {
            dirtyClosure(); //handles dirty saves/projects and calling win.close(true);
        }
	});
	win.on('new-win-policy', function(frame, url, policy) {
		//disallow new windows (even via middle mouse button)
    if (!url.indexOf("https://choicescriptdev.wikia.com")) {
      policy.ignore();
    }
    require('nw.gui').Shell.openExternal(url);
    policy.ignore();
    return;
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
	if (!cside.session.isDirty() || cside.getProjects().length === 0)
        quit();
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
					noty({"text":"Saving & Quitting...", "closeWith": false, "timeout": false});
					cside.session.save(function() {
                        quit();
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

/* //EXPERIMENTAL MOBILE SUPPORT
document.getElementById("headbar").addEventListener('touchstart', handleTouchStart, true);
document.getElementById("headbar").addEventListener('touchmove', handleTouchMove, true);

var xDown = null;
var yDown = null;

function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
};

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {//most significant
        if ( xDiff > 0 ) {
			//left
           if ($('#sidebar').width() == $('body').width() && $('#sidebar:visible').length > 0) {
			   $('#sidebar').animate({ "left": $(this).width() * -1 }, 750, function() {
				   $('#sidebar').hide();
			   });
		   }
			else if ($('#sidebar').width() == $('body').width() && $('.left-wrap').css("left") === "0px") {
			   $('.left-wrap').animate({ "left": $(this).outerWidth() * -1 }, 750, function() {
				   //
			   });
			}
        }
		else {
		   if ($('#sidebar').width() == $('body').width() && $('.left-wrap').css("left") != "0px") {
			   $('.left-wrap').animate({ "left": 0 }, 750, function() {
				   //
			   });
		   }
           else if ($('#sidebar:visible').length == 0) {
			    $('#sidebar').show();
			   $('#sidebar').animate({ "left": 0 }, 750, function() {
				   //
			   });
		   }
		}
    } else {
        if ( yDiff > 0 ) {
           //alert("up");
        } else {
           //alert("down");
        }
    }
    // reset values
    xDown = null;
    yDown = null;
}; */
