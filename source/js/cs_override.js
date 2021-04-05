nav = new SceneNavigator(["startup"]);
stats = {};
isHeadless = true;
var cside = {
  project: {},
  platform: null,
  popout: { is: window.opener, window: null },
  server: null,
  parent: () => {}
};

Scene.prototype.lineMsg = function lineMsg() {
	return "line " + (this.lineNum + 1) + " of " + stats.sceneName + ": ";
}

window.addEventListener("message", (event) => {
  switch (event.data.type) {
    case "startGame":
      window.allScenes = event.data.allScenes;
      cside.project = event.data.project;
      cside.server = event.data.server;
      window.CSIDEPlatform = event.data.platform;
      if (!event.data.allowScript)
        Scene.prototype["script"] = function script(code) { throw new Error("\*script usage is disabled."); }
      window.alreadyLoaded = false;
      window.onload();
      cside.parent = event.source;
    default:
      return;
  }
}, false);

if (cside.popout.is) window.allScenes = window.opener.allScenes;

/* ERROR HANDLING (FOR ISSUES) */
window.onerror = function(msg, file, line, stack) {
  var e = {};
  e.message = msg;
  if (msg) {
    // scene doesn't exist - don't bother trying to open it
    if (/file/i.test(msg) && /exist/i.test(msg)) {
      cside.parent.postMessage({type: "logIssue", project: cside.project, error: e});
      return;
    }
    //window.onerror(e.message, e.fileName, e.lineNumber, e.stack); avoid pop-ups if we can
    e.message.match(/line [0-9]+/) ? e.lineNumber = parseInt(e.message.match(/line ([0-9]+)/)[1]) : e.lineNumber = "undefined"; //attempt to source a line number (!e.lineNumber && e.message.match(/[0-9]+/))
    cside.parent.postMessage({type: "logIssue", error: e, project: cside.project, scene: { name: stats.sceneName }});
  }
}

//make image's sourced from the project directory
function printImage(source, alignment, alt, invert) {
  var img = document.createElement("img");
  img.src = source.match("data:image") ? source : cside.server + source; //interal image, don't add directory
  if (alt !== null && String(alt).length > 0) img.setAttribute("alt", alt);
  if (invert) {
    setClass(img, "invert align"+alignment);
  } else {
    setClass(img, "align"+alignment);
  }
  document.getElementById("text").appendChild(img);
}

//make link's target _blank
function printLink(target, href, anchorText, onclick) {
  if (!target) target = document.getElementById('text');
  var link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("target", "_blank");
  link.appendChild(document.createTextNode(anchorText));
  if (onclick) {
    if (link.addEventListener) {
      link.addEventListener("click", onclick, true);
    } else {
      link.onclick = onclick;
    }
  }
  target.appendChild(link);
  target.appendChild(document.createTextNode(" "));
}

//make sound sourced from the project directory
Scene.prototype.sound = function sound(source) {
	source = cside.server + source;
  if (typeof playSound == "function") playSound(source);
  if (this.verifyImage) this.verifyImage(source);
};

// create popout instance of game (at same state as original)
function popOutWindow() {
  if (cside.popout.window) {
    cside.popout.window.focus();
  }
  else { //create new
    cside.popout.window = window.open("run_index.html?persistence=CSIDE", cside.project.name, "height=500,width=500,scrollbars=1");
  }
};

//prevent links from opening *inside* desktop version
if (cside.platform != 'web-dropbox') {
	setTimeout(function() {
	 	window.$('body').on('click', 'a', function(e) {
			e.preventDefault();
			if ($(this).hasClass('alertify-button')) return false;
			cside.parent.postMessage({type: "handleLink", url: this.href});
			return false;
		});
	}, 1000); //needs a timeout or it seems to fire before the body is created.
}

//inject buttons:
$(document).ready(function() {
  if (!cside.popout.is) {
    //var button = document.createElement("button");
    //button.innerHTML = "Popout";
    //button.setAttribute("title", "Pop out window");
    //button.setAttribute("class", "spacedLink");
    //button.setAttribute('onclick', "popOutWindow();");
    //document.getElementById("buttons").appendChild(button);
  }
});
