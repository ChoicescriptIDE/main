var winState;
var currWinMode;
var resizeTimeout;
var isMaximizationEvent = false;
// extra height added in linux x64 gnome-shell env, use it as workaround
var deltaHeight = gui.App.manifest.window.frame ? 0 : 'disabled';


function initWindowState() {
    // Don't resize the window when using LiveReload.
    // There seems to be no way to check whether a window was reopened, so let's
    // check for dev tools - they can't be open on the app start, so if
    // dev tools are open, LiveReload was used.
    if (typeof win.isDevToolsOpen === "function" && !win.isDevToolsOpen() || typeof win.isDevToolsOpen === "undefined") {
        winState = JSON.parse(localStorage.windowState || 'null');

        if (winState) {
            currWinMode = winState.mode;
            restoreWindowState(); //always restore position
            if (currWinMode === 'maximized') { //THEN maximise if necessary
                process.platform === "darwin" ? win.enterFullscreen() : win.maximize(); //fullscreen on mac or maximize on Windows
            }
            //win.show();
        } else {
            currWinMode = 'normal';
            win.setPosition("center");
            //win.show();
        }
    }
}

function dumpWindowState() {
    if (!winState) {
        winState = {};
    }

    // we don't want to save minimized state, only maximized or normal
    if (currWinMode === 'maximized') {
        winState.mode = 'maximized';
    } else {
        winState.mode = 'normal';
    }

    // when window is maximized you want to preserve normal
    // window dimensions to restore them later (even between sessions)
    if (currWinMode === 'normal') {
        winState.x = win.x;
        winState.y = win.y;
        winState.width = win.width;
        winState.height = win.height;

        // save delta only of it is not zero
        if (deltaHeight !== 'disabled' && deltaHeight !== 0 && currWinMode !== 'maximized') {
            winState.deltaHeight = deltaHeight;
        }
    }
}

function restoreWindowState() {
    // deltaHeight already saved, so just restore it and adjust window height
    if (deltaHeight !== 'disabled' && typeof winState.deltaHeight !== 'undefined') {
        deltaHeight = winState.deltaHeight
        winState.height = winState.height - deltaHeight
    }


    //Make sure that the window is displayed somewhere on a screen that is connected to the PC.
    //Imagine you run the program on a secondary screen connected to a laptop - and then the next time you start the
    //program the screen is not connected...
    gui.Screen.Init();
    var screens = gui.Screen.screens;
    var locationIsOnAScreen = false;
    for (var i = 0; i < screens.length; i++) {
        var screen = screens[i];
        if (winState.x > screen.bounds.x && winState.x < screen.bounds.x + screen.bounds.width) {
            if (winState.y > screen.bounds.y && winState.y < screen.bounds.y + screen.bounds.height) {
                console.debug("Location of window (" + winState.x + "," + winState.y + ") is on screen " + JSON.stringify(screen));
                locationIsOnAScreen = true;
            }
        }
    }

    if (!locationIsOnAScreen) {
        console.debug("Last saved position of windows is not usable on current monitor setup. Moving window to center!");
        win.setPosition("center");
    }
    else {
        win.resizeTo(winState.width, winState.height);
        win.moveTo(winState.x, winState.y);
    }
}

function saveWindowState() {
    dumpWindowState();
       localStorage['windowState'] = JSON.stringify(winState);
}

initWindowState();

win.on('maximize', function () {
    isMaximizationEvent = true;
    currWinMode = 'maximized';
});

win.on('minimize', function () {
    currWinMode = 'minimized';
});

win.on('enter-fullscreen', function() {
    //write and update instantly so we store both the original position AND whether or not its maximized
    isMaximizationEvent = true;
    winState.mode = "maximized";
    localStorage['windowState'] = JSON.stringify(winState);
});

win.on('leave-fullscreen', function() {
    //write and update instantly so we store both the original position AND whether or not its maximized
    winState.mode = "normal";
    localStorage['windowState'] = JSON.stringify(winState);
});

win.on('restore', function () {
    //write and update instantly so we store both the original position AND whether or not its maximized
    winState.mode = "normal";
    localStorage['windowState'] = JSON.stringify(winState);
});

win.on('move', function(x, y) {
    saveWindowState();
});

win.window.addEventListener('resize', function () {
    // resize event is fired many times on one resize action,
    // this hack with setTimeout forces it to fire only once
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {

        // on MacOS you can resize maximized window, so it's no longer maximized
        if (isMaximizationEvent) {
            // first resize after maximization event should be ignored
            isMaximizationEvent = false;
        } else {
            if (currWinMode === 'maximized') {
                currWinMode = 'normal';
            }
        }

        // there is no deltaHeight yet, calculate it and adjust window size
        if (deltaHeight !== 'disabled' && deltaHeight === false) {
            deltaHeight = win.height - winState.height;

            // set correct size
            if (deltaHeight !== 0) {
                win.resizeTo(winState.width, win.height - deltaHeight);
            }
        }

        dumpWindowState();

    }, 500);
}, false);
