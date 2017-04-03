window.onload = function() {	
	if (!Object.prototype.watch) {
		Object.defineProperty(Object.prototype, "watch", {
			  enumerable: false
			, configurable: true
			, writable: false
			, value: function (prop, handler) {
				var
				  oldval = this[prop]
				, newval = oldval
				, getter = function () {
					return newval;
				}
				, setter = function (val) {
					oldval = newval;
					return newval = handler.call(this, prop, oldval, val);
				}
				;
				
				if (delete this[prop]) { // can't watch constants
					Object.defineProperty(this, prop, {
						  get: getter
						, set: setter
						, enumerable: true
						, configurable: true
					});
				}
			}
		});
	}
	 
	// object.unwatch
	if (!Object.prototype.unwatch) {
		Object.defineProperty(Object.prototype, "unwatch", {
			  enumerable: false
			, configurable: true
			, writable: false
			, value: function (prop) {
				var val = this[prop];
				delete this[prop]; // remove accessors
				this[prop] = val;
			}
		});
	}
	var button = document.createElement("button");
	button.innerHTML = "Variables";
	button.setAttribute('onclick', "openVarWindow()");
	var p = moveButtonsInline();
	p.appendChild(button);
	document.title = "CSIDE Variable Tracker";
}

console.log = function(str, stats) {
	if (!varWindow) return;
	var console = varWindow.document.getElementById("testconsole");
	var newLine = document.createElement("li");
		var timeStamp = document.createElement("span");
		timeStamp.innerHTML = stats.sceneName + ".txt: " + stats.scene.lineNum;
		timeStamp.setAttribute("class", "timestamp");
		var message = document.createElement("span");
		message.innerHTML =  ": " + str;
		newLine.appendChild(timeStamp);
		newLine.appendChild(message);
	console.insertBefore(newLine, console.firstChild);
}

function moveButtonsInline() {
	var header = document.getElementById("header");
	var tags = header.getElementsByTagName("p");
	return tags[1];
}

function openVarWindow() {
	//only allow one instance of the var tracker at a time
	if (window.varWindow && !window.varWindow.closed) {
		varWindow.focus();
		return;
	}
	window.varWindow = window.open();
	varDocument = varWindow.document;
	varDocument.write(
		  "<h1>Variable Tracker</h1>"
		+ "<h3 style='display:inline-block;width:50%;'>Global Variables</h3>"
		+ "<h3 style='display:inline-block;width:50%;'>Temp Variables</h3>"
		+ "<div id='console-wrap'>"
			+ "<span id=''>Console</span>"
			+ "<a id='close' href='#'>collapse</a>"
			+ "<ul id='testconsole'></ul>"
		+ "</div>"
	);	
		var body = varDocument.getElementsByTagName("body")[0];
		var ul = varDocument.createElement("ul");
		ul.setAttribute("id", "statslist");
		ul.setAttribute("class", "var-list");
		var ul2 = varDocument.createElement("ul");
		ul2.setAttribute("id", "tempslist");
		ul2.setAttribute("class", "var-list");
		varDocument.getElementsByTagName("body")[0].appendChild(ul);
		varDocument.getElementsByTagName("body")[0].appendChild(ul2);
		for (var i in stats.scene.stats) {
			addWatcher(i, "stats");
		}
		for (var i in stats.scene.temps) {
			addWatcher(i, "temps");
		}
	
	
	//click handlers
	varDocument.getElementById('close').addEventListener('click', function() {
		hideConsole(this.innerHTML);
	});
	var liList = varDocument.getElementsByTagName('ul');
	for (var i = 0; i < liList.length; i++) {
		liList[i].addEventListener('keydown', function(e) {
			if (e.target && e.target.nodeName == "INPUT" && e.keyCode == 13) {
				if (this.id == "tempslist") {
					stats.scene.temps[e.target.id] = e.target.value;
				} else {
					stats.scene.stats[e.target.id] = e.target.value;
				}
			}
		});
		liList[i].addEventListener('blur', function(e) {
			if (e.target && e.target.nodeName == "INPUT") {
				if (this.id == "tempslist") {
					e.target.value = stats.scene.temps[e.target.id];
				} else {
					e.target.value = stats.scene.stats[e.target.id];
				}
			}
		}, true);
	}
	style();
}

function style() {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = 
		'body {'
				+ 'height: 100%;'
				+ 'max-height: 100%;'
				+ 'background-color: whitesmoke;'
				+ 'font-family: "century gothic", arial;'
				+ 'font-size: 14px;'
				+ 'position: relative;'
				+ 'padding: 0px;'
				+ 'margin: 0px;'
				+ 'overflow: hidden;'
			+ '}'
			+ 'ul {'
				+ 'background-color: darkgrey;'
				+ 'list-style: none;'
				+ 'padding: 5px;'
				+ 'box-sizing: border-box;'
			+ '}'
			+ 'li {'
				+ 'background-color: white;'
				+ 'width: 100%;'
				+ 'border: solid darkgrey;'
				+ 'border-width: 1px 0px 0px 0px;'
			+ '}'
			+ '.timestamp {'
				+ 'color:grey;'
				+ 'float:right;'
			+ '}'
			+ '.var-list {'
				+ 'display: inline-block;'
				+ 'width: 50%;'
				+ 'background-color: darkgrey;'
				+ 'list-style: none;'
				+ 'height: 70%;'
				+ 'overflow: scroll;'
				+ 'overflow-x: hidden;'
				+ 'border: solid 5px lightgrey;'
			+ '}'
			+ '.var-list li {'
				+ 'background-color: #DADADA;'
				+ 'padding: 2px;'
				+ 'box-sizing: border-box;'
			+ '}'
			+ '.var-list li span {'
				+ 'color: rgb(66, 66, 66);'
			+ '}'
			+ '#console-wrap {'
				+ 'position: fixed;'
				+ 'bottom: 0px;'		
				+ 'width: 100%;'
				+ 'background-color: rgb(235, 235, 235);'
				+ 'border: solid 1px rgb(182, 182, 182);'
				+ 'border-width: 1px 0px;'
				+ 'z-index: 100;'
			+ '}'
			+ '#console-wrap li {'
				+ 'background-color: #FFF;'
			+ '}'
			+ '#testconsole {'
				+ 'width: 100%;'
				+ 'overflow: auto;'
				+ 'max-height: 200px;'
				+ 'border: solid rgb(221, 221, 221);'
				+ 'border-width: 2px 0px 0px 0px;'
				+ 'padding: 0px;'
			+ '}'
			+ '#console .oldval {'
				+ 'color: red;'
			+ '}'
			+ '#console .newval {'
				+ 'color: blue;'
			+ '}'
			+ '#close {'
				+ 'position: absolute;'
				+ 'right: 5px;'
				+ 'top: -1px;'
			+ '}'
		
	varWindow.document.getElementsByTagName('head')[0].appendChild(style);

	//document.getElementById('someElementId').className = 'cssClass';
}

function hideConsole(action) {
	if (action == "collapse") {
		varDocument.getElementById('console-wrap').style.height = "20px";
		varDocument.getElementById('console-wrap').style.overflow = "hidden";
		varDocument.getElementById('close').innerHTML = "expand";
	} else {
		varDocument.getElementById('console-wrap').setAttribute("style", "");
		varDocument.getElementById('close').innerHTML = "collapse";
	}
}

function addWatcher(variable, varType) {
	var wrapper = document.createElement("li");
	var name = document.createElement("span");
	var type = document.createElement("span");
	var value = document.createElement("input");
	var br = document.createElement("br");
	wrapper.appendChild(name);
	wrapper.appendChild(br);
	wrapper.appendChild(type);
	wrapper.appendChild(value);
	name.innerHTML = "<b>" + variable + "</b>";
	type.innerHTML = typeof stats.scene[varType][variable] + ": ";
	value.setAttribute("id", variable);
	value.value = stats.scene[varType][variable];
	varDocument.getElementById(varType + "list").appendChild(wrapper);
	stats.scene[varType].watch(variable, function (id, oldval, newval) {
		if (oldval === newval) return; //we don't care
		console.log( varType + "." + id + " changed from <i>" + oldval + "</i> to <i>" + newval + "</i>", stats);
		// we are going to have issues with like named temps/globals
		varDocument.getElementById(id).value = newval;
		return newval;
	});
}

function getTimeStamp() {
	var timeStr = "";
	var currentTime = new Date()
	var hours = currentTime.getHours()
	var minutes = currentTime.getMinutes()
	var seconds = currentTime.getSeconds()

	if (minutes < 10) {
		minutes = "0" + minutes
	}
	if (seconds < 10) {
		seconds = "0" + seconds
	}
	timeStr += hours + ":" + minutes + ":" + seconds + " ";
	if(hours > 11){
		timeStr += "PM"
	} else {
		timeStr += "AM"
	}
	return timeStr;
}


//we need to overwrite *temp so we can plug a catch in for new temps
Scene.prototype.temp = function temp(line) {
    var result = /^(\w*)(.*)/.exec(line);
    if (!result) throw new Error(this.lineMsg()+"Invalid temp instruction, no variable specified: " + line);
    var variable = result[1];
    this.validateVariable(variable);
    var expr = result[2];
    var stack = this.tokenizeExpr(expr);
    if (stack.length === 0) {
      this.temps[variable.toLowerCase()] = null;
      return;
    }
    var value = this.evaluateExpr(stack);
    this.temps[variable.toLowerCase()] = value;
	if (typeof varWindow != "undefined") {
		addWatcher(variable.toLowerCase(), "temps"); //add to variable tracker
	}
};