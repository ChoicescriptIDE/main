	//define the editor instances and apply behaviour tweaks
	 var editor = CodeMirror.fromTextArea(document.getElementById("code-textarea"), {
		mode: {name: "choicescript",
			   version: 2,
			   singleLineStringErrors: false},
		lineNumbers: true,
		lineWrapping: true,
		tabSize: 4,
		indentUnit: 4,
		indentWithTabs: true,
		matchBrackets: true,
		extraKeys: keymap
	});  	
/*	editor.on("change", function(cm, change) {
		if (change.origin != "paste" || change.text.length < 2) return;
		cm.operation(function() {
			if (!editor.getLine(change.to.line)) return; //occasionally bugs out on normal paste events without this
			var targetLine = change.to.line;
			var currentIndent = CodeMirror.countColumn(editor.getLine(change.to.line), null, 1, 0, 0);
			for (var line = change.from.line, end = CodeMirror.changeEnd(change).line; line < end + 1; ++line) {
				if (line != targetLine) {
					var i = 0;
					while (i < currentIndent) {
						cm.indentLine(line, "add");
						i++;
					}
				}
			}
		});
	}); */
	editor.on("dragover", function(cm, e) {
		$('.CodeMirror-cursors .CodeMirror-cursor').css("visibility", "visible");
		var xy = {"left": e.x, "top": e.y};
		var newPos = editor.coordsChar(xy);
		editor.setCursor(newPos);
	});
	editor.on("dragstart", function(cm, e) {
		e.dataTransfer.setData("Text", editor.getSelection());
	});
	editor.on("renderLine", function(cm, line, elt) {
		var charWidth = editor.defaultCharWidth(), basePadding = 4;
		var off = CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
		var pixelTabSize = 8 * editor.options.tabSize;
		var indentLevel = off / pixelTabSize;
		var leftMargin = pixelTabSize * indentLevel;
		elt.style.paddingLeft = leftMargin + "px";
		elt.style.textIndent = "-" + (leftMargin / (indentLevel + 1)) + "px";
	});
	
	editor.refresh(); 

	editor["forceSyntaxRedraw"] = function() {  //ALIAS METHOD
		editor.setOption("mode", "choicescript");
	}