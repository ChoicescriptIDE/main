		function CSIDE_FileManager() {
			//key events
			var shiftPressed = false;
			var ctrlPressed = false;
			$(document).keydown(function (e) {
				if (e.keyCode == 17) {
					e.preventDefault();
					ctrlPressed = true;
				} if (e.keyCode == 16) {
					e.preventDefault();
					shiftPressed = true;
				}
			});
			$(document).keyup(function (e) {
				if (e.keyCode == 17) {
					e.preventDefault();
					ctrlPressed = false;
				} if (e.keyCode == 16) {
					e.preventDefault();
					shiftPressed = false;
				}
			});
			//end key events
			var self = this;
			var visible = ko.observable(false);
			var loading = ko.observable(false);
			self.isVisible = ko.computed(function() {
				return visible();
			}, this);
			self.isLoading = ko.computed(function() {
				return loading();
			}, this);
			self.path = "/";
			self.filesAndFolders = ko.observableArray([]);
			self.selection = ko.observableArray([]);
			function fileFolderItem(data) {
				this.name = data.name;
				this.path = data.path;
				this.icon = data.icon ? data.icon : data.isFolder ? 'fa fa-folder-o fa-lg' : 'fa fa-file-o fa-lg';
				this.selected = ko.observable(false);
				this.index = data.listIndex;
				this.select = function(data, event, forcedValue, skipKeyCheck) {
					if (!skipKeyCheck) {
						var selectedList = self.selection();
						var fullList = self.filesAndFolders();
						if (!ctrlPressed && !shiftPressed && selectedList.length > 0) {
							for (var s in selectedList) {
								fullList[selectedList[s].index].selected(false);
							}
							self.selection([]);
						}
						else if (shiftPressed) {
							selectedList.sort(function(a, b) { return a.index - b.index}); //sort our selection array, so it's in sync with visual shift select
							var topToBottom = false;
							if (self.selection() < 1) {
								for (var i = 0; i < this.index; i++) {
									fullList[i].select({}, {}, true, true);
								}
							}
							else {
								//are we top to bottom or bottom to top
								for (var i = 0; i < this.index; i++) {
									if (fullList[i].selected()) { //bottom to top
										topToBottom = true;
										break;
									}
								}
								if (topToBottom) {
									for (var i = selectedList[0].index; i < this.index; i++) {
										if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
									}
								}
								else {
									for (var i = selectedList[selectedList.length - 1].index; i > this.index; i--) {
										if (!fullList[i].selected()) fullList[i].select({}, {}, true, true);
									}				
								}
							}
						}
					}
					forcedValue ? this.selected(forcedValue) : this.selected() ? this.selected(false) : this.selected(true);
					self.selection.push(this);
				}
				if (data.isFolder) {
					this.open = function() { self.redraw(this.path); }
				}
				else {
					this.open = function() { self.close(); openScene(this.path, platform); }
				}
				this.dateModified = data.modifiedAt || "";
				if (this.dateModified != "") {
					var parsedDate = {};
						parsedDate.day = data.modifiedAt.getDate();
						parsedDate.month = data.modifiedAt.getMonth();
						parsedDate.year = data.modifiedAt.getFullYear();
						parsedDate.hours = data.modifiedAt.getHours();
						parsedDate.mins = data.modifiedAt.getMinutes();
						if (parsedDate.mins.toString().length < 2) {
							parsedDate.mins = '0' + parsedDate.mins.toString();
						}
						this.dateModified = " - last modified at " + parsedDate.day + '/' + parsedDate.month + '/' + parsedDate.year + ' at ' + parsedDate.hours + ':' + parsedDate.mins;
				}
			}
			this.close = function() {
				var selectedList = self.selection();
				var fullList = self.filesAndFolders();
				for (var s in selectedList) {
					fullList[selectedList[s].index].selected(false);
				}
				self.selection([]);
				visible(false);
			}
			this.open = function(path) {
				path = path || self.path;
				visible(true);
				self.redraw(path);
			}
			this.redraw = function(path) {
				loading(true);
				self.path = path;
					self.filesAndFolders([]);
					self.selection([]);
					var position = 0;
				db.readdir(path, {}, function(err, list, folderStats, listStats) {
					if (self.path != "/" && self.path != "") {
						//backup option
						var array = self.path.split("/");
						array.pop(); //remove deepest folder
						var parentPath = array.join("/");
						self.filesAndFolders.push(new fileFolderItem({"name": "Up a level", "path": parentPath, "isFolder": true, "icon": 'fa fa-level-up fa-lg', 'listIndex': position}));
						position++;
					}
					for (var i = 0; i < listStats.length; i++) {
						if (!listStats[i].isFolder && getFileExtension(listStats[i].path) != '.txt') continue; //ignore anything but folders and .txt files
						listStats[i].listIndex = position;
						position++;
						self.filesAndFolders.push(new fileFolderItem(listStats[i]));
					}
					loading(false);
				});
/* 				self.filesAndFolders().sort(function (a, b) {
					if (a.isFolder === b.isFolder) {
						if (a.name === b.name){
							return 0;
						}
						else if (a.name < b.name) {
							return -1;
						}
						else {
							return 1;
						}
					}
					else if (b.isFolder) {
						return -1;
					}
					else {
						return 1;
					}
				}); */
			}

			this.executeTask = function() {
				var fullList = self.filesAndFolders();
				var selectedList = self.selection();
				for (var s in selectedList) {
					fullList[selectedList[s].index].open();
				}
			};
		}