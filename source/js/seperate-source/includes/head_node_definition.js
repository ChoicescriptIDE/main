//are we using node?
if (typeof nwDispatcher === "object") {
	window.usingNode = true;
	
	//load our modules:
	var fs = require('fs');
	var gui = require('nw.gui');
	var http = require('http');
	var trash = require('trash');
	var stream = require('stream');
	var win = gui.Window.get();

} else {
	window.usingNode = false;
}
