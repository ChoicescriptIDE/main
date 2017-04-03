	var fh = { //FILE HANDLER
		"writeFile": function(path, data, callback) {
			switch(platform) {
				//WRITE
				case "web-dropbox":
					db.writeFile(path, data, {}, function(err, fileStats) {
						callback(normalizeError(err), fileStats);
					});
					break;
				default:
					fs.writeFile(path, data, {}, function(err) {
						callback(normalizeError(err));
					});
			}
		},
		"readFile": function(path, callback) {
			switch(platform) {
				//WRITE
				case "web-dropbox":
					db.readFile(path, {}, function(err, data, fileStats) {
						callback(normalizeError(err), data, fileStats);
					});
					break;
				default:
					fs.readFile(path, { encoding: 'utf8' }, function(err, data) {
						callback(normalizeError(err), data);
					});
			}
		},
		"copyFile": function(oldPath, newPath, callback) {
			switch(platform) {
				case "web-dropbox":
					db.copy(oldPath, newPath, function(err, fileStat) {
						callback(normalizeError(err), fileStat)
					});
					break;
				default:
					fs.readFile(oldPath, {}, function(err, data) {
						if (err) {
							callback(normalizeError(err));
						}
						else {
							fs.writeFile(newPath, data, function(err) {
								callback(normalizeError(err));
							});
						}
					});
			}			
		},
		"renameFile": function(curPath, newPath, callback) {
			switch(platform) {
				case "web-dropbox":
					db.move(curPath, newPath, function(err, fileStat) {
						callback(normalizeError(err), fileStat);
					});
					break;
				default:
					fs.rename(curPath, newPath, function(err) {
						callback(normalizeError(err));
					});		
			}			
		},
		"deleteFile": function(path, callback) {
			switch(platform)
			{
				case "web-dropbox":
					db.remove(path, function(err, fileStat) {
						callback(normalizeError(err), fileStat)
					});
					break;
				default:
					trash([path], function(err) {
						callback(normalizeError(err))
					});
					break;
			}
		},
		"readDir": function(path, callback) {
			switch(platform)
			{
				case "web-dropbox":
					db.readdir(path, {}, function(err, filePathArray, fileStatArray) {
						callback(normalizeError(err), filePathArray, fileStatArray)
					});
					break;
				default:
					fs.readdir(path, function(err, filePathArray) {
						callback(normalizeError(err), filePathArray);
					});
					break;
			}			
		},
		"makeDir": function(path, callback) {
			switch(platform)
			{
				case "web-dropbox":
					db.mkdir(path, function(err, folderStat) {
						if (err && err.status == 403) { //FOLDER ALREADY EXISTS
						alert("TEST");
							delete err.status;
							err.code = "EEXIST";
						}
						callback(normalizeError(err), folderStat);
					});
					break;
				default:
					fs.mkdir(path, function(err) {
						callback(normalizeError(err));
					});
					break;
			}			
		},
		"stat": function(path, callback) {
			switch(platform)
			{
				case "web-dropbox":
					db.stat(path, {}, function(err, fileStats) {
						callback(normalizeError(err), fileStats);
					});
					break;
				default:
					fs.stat(path, function(err, fileStats) {
						callback(normalizeError(err), fileStats);
					});
					break;
			}				
		}
	}