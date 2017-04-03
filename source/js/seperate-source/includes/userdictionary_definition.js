	userDictionary = {
		"persistentList": {
			//always ignore these words
		},
		"persistentListArray": ko.observableArray([
			//for GUI display
		]),
		"sessionList": {
			//for this session only
		},
		"add": function(word, list) {
			//CJW needs to only allow WORDS i.e. add a regex match
			userDictionary[list + "List"][word] = true;
			if (list == "persistent") { userDictionary.update(); }
		},
		"remove": function(word, list) {
			if (userDictionary[list + "List"]) { delete userDictionary[list + "List"][word]; }
			userDictionary.update();
		},
		"check": function(word) {
			var pList = this.persistentList;
			var sList = this.sessionList;
			if (sList[word] || pList[word]) {
				return true;
			}
			else {
				return false;
			}
		},
		"load": function() {
			try {
				userDictionary.persistentList = JSON.parse(localStorage.getItem("userDictionary")) || { };
				for (var i in userDictionary.persistentList) {
					if (userDictionary.persistentList.hasOwnProperty(i))
						userDictionary.persistentListArray.push(i);
				}
			}
			catch(err) {
				if (err) {
					//no userDictionary.json file - write it:
					userDictionary.update();
				} else {
					bootbox.alert("Sorry, there was a problem loading or parsing your user dictionary data.<br>"
					+ "If you're seeing this message frequently, please file a bug report.");			
				}
			}
		},
		"update": function() {
			var newDictionary = JSON.stringify(userDictionary.persistentList, null, "\t");
			localStorage.setItem("userDictionary", newDictionary);
			userDictionary.persistentListArray.removeAll();
			for (var i in userDictionary.persistentList) {
				if (userDictionary.persistentList.hasOwnProperty(i))
					userDictionary.persistentListArray.push(i);
			}
			editor.forceSyntaxRedraw();
		}
	}
	self.dictWord = ko.observable("");
	self.addToDictionary = function(obj, e) {
		if (e.type == "click" || e.type == "keyup" && e.keyCode == 13) {
			if (!self.dictWord().match(/^\w+$/)) {
				return;
			}
			self.dictWord(self.dictWord().toLowerCase());
			userDictionary.add(self.dictWord(), "persistent");
			self.dictWord("");
		}
	};
	self.removeFromDictionary = function(word) {
		if (userDictionary.persistentList.hasOwnProperty(word)) {
			userDictionary.remove(word, "persistent");
		}
	};