	self.checkForUpdate = function() {
		if (!usingNode) return; //web-version doesn't need to update
		var updateChannel = settings.asObject("app")["update-channel"];
		if (gui.App.manifest.window.toolbar)
			updateChannel = "dev";
		
		var status = noty({text: "<img src='./img/ui/loading.gif'/> Checking for updates...", closeWith: false, timeout: false});
		var request = http.get("http://cside.mazdrak.com/updates/version.json", function(response) {
			var content = "";
			var updateInfo = {};
			response.on('data', function (chunk) {
				content += chunk.toString();
			});
			response.on('end', function (chunk) {
				status.close();
				try {
					updateInfo = JSON.parse(content);
				}
				catch(e) {
					console.log("Couldn't retrieve update info");
					return;
				}
				console.log(updateInfo);
				updateInfo = updateInfo[updateChannel];
				if (isNewVer(updateInfo.version)) {
					noty({
						layout: "bottom",
						text: 'There is an update available for the Choicescript IDE, would you like to download it?'
						+ "<br><br>Description: " + updateInfo.desc,
						buttons: [
							{addClass: 'btn btn-primary', text: 'Ok', 
								onClick: function($noty) {
									$noty.close();
									update(updateInfo.target);
								}
							},
							{addClass: 'btn btn-danger', text: 'Cancel', 
								onClick: function($noty) {
									$noty.close();
								}
							}
						]
					});
				} 
				else {
					//we're up to date!
				}
			});
		});
		
		request.on('error', function(err) { // Handle errors
			status.close()
			var errmsg = "";
			if (err.code === "ENOTFOUND") {
			//no internet, don't bother the user;
			} else noty({type:"error", text: "Update Failed<br>" + err, closeWith: ["click"], timeout: false});
		});

		function update(targetFilepath) {
			//backup the old package file incase the update fails
			if (cside.platform != "mac_os") {
				var installFolderPath = cside.execPath;
				var filename = "package.nw";
			}
			else {
				var usefulDirIndex = process.execPath.lastIndexOf('Frameworks');
				var installFolderPath = process.execPath.substring(0, usefulDirIndex) + "Resources/";
				var filename = "app.nw";
			}
			try {
				fs.unlinkSync(installFolderPath + "old-" + filename);
			}
			catch (e) {
				if (e.code != "ENOTFOUND" && e.code != "ENOENT" && e.code !=  "EPERM") bootbox.alert(e);
				return;
			}
			try {
				fs.renameSync(installFolderPath + filename, "old-" + filename);
			}
			catch (e) {
				if (e.code != "ENOTFOUND" && e.code != "ENOENT" && e.code !=  "EPERM") bootbox.alert(e);
				return;
			}
			var request = http.get("http://cside.mazdrak.com/updates/" + targetFilepath, function(response) {
				var status = noty({text: "Downloading Update... 0%<br> <b>DO NOT</b> close the program", closeWith: false, timeout: false});
				var fileStream = fs.createWriteStream(installFolderPath + filename);
				var fileSize = parseInt(response.headers["content-length"]);
				if (response.statusCode != 200) {
					status.close();
					noty({type:"error", text: "Update Failed<br>Could not connect to server", closeWith: ["click"], timeout: false});
					return;
				}
				response.pipe(fileStream);
				var timeOut;
				var timeOutMsg;
				function noConnection() {
					timeOut = setTimeout(function() { noConnection(); }, 5000);
					if (!timeOutMsg || timeOutMsg.closed) {
					timeOutMsg = noty({type:"error", text:"Error<br>Not receiving any data...<br>Please check your internet connection", timeout: false, closeWith: false});
					}
					else if (timeOutMsg.closed) {
					timeOutMsg.show();
					}
				}
				response.on('data', function(chunk) {
					clearInterval(timeOut);
					if (timeOutMsg && !timeOutMsg.closed) timeOutMsg.close();
					timeOut = setTimeout(function() { noConnection(); }, 5000);
					var mbWritten = (fileStream.bytesWritten / 1048576); //1024^2 (converts from bytes to megabytes)
					mbWritten += "MB" 
					var percentComplete = (100 / (fileSize / fileStream.bytesWritten)).toFixed(2);
					status.setText("Downloading Update... " + percentComplete + "%" + "<br><b>DO NOT</b> close the program" );
				})
				.on('close', function(chunk) {
					noty({type:"error", text:"close error"});
				})
				.on('connect', function(chunk) {
					noty({type:"error", text:"connect error"});
				})
				.on('end', function() {
					clearInterval(timeOut);
					if (timeOutMsg && timeOutMsg.showing) timeOutMsg.close();
					status.setType("success");
					status.setText("<b>Update downloaded successfully</b><br>"
					+ "Please restart the IDE");
					//status.setTimeout(5000); leave it open (incentive to close the IDE?)		
				});
				fileStream.on('end', function() {
					//never fires?
				})
				.on('error', function(err) { // Handle errors
					alert(err);
					return;
				});
			});
			request.on('error', function(err) { // Handle errors
				var errmsg = "";
				if (err.code === "ENOTFOUND") {
					errmsg = "Please check your internet connection";
				}
				if (errmsg != "") noty({type:"error", text: "Update Failed<br>" + errmsg, closeWith: ["click"], timeout: false});
				else noty({type:"error", text: "Update Failed<br>" + err, closeWith: ["click"], timeout: false});
			});
		}

		function isNewVer(newVer) {
			var patt = /[0-9]{1}(?=\.)?/gi;
			var currentVer = version.match(patt);
			newVer = newVer.match(patt);
			var shortestVer = (newVer.length < currentVer.length) ? newVer : currentVer;
			var update = false;
			for (var i = 0; i < shortestVer.length; i++) {
				if ((parseInt(newVer[i]) > parseInt(currentVer[i]))) {
					update = true;
					break;
				} 
				else if ((parseInt(newVer[i]) < parseInt(currentVer[i]))) {
					break;
				}
				if (i == shortestVer.length - 1 && !update && (newVer.length > currentVer.length)) {
					//if we've not got an update yet
					//but the new version is longer, we also update
					update = true;
				}
			}
			return update;
		}
	}