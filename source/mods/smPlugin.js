// ChoiceScript (c) Dan Fabulich
// smPlugin.js - CJW @ www.choiceofgames.com/forum
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this file, to utilize it without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//  * The 'usage' of this file is kept within compliance of the 'ChoiceScript License'.
//    You can obtain a copy of the license at http://www.choiceofgames.com/LICENSE-1.0.txt
//  
//  * The copyright, attributions and permission notices must be retained 
//    within all copies of the code (modified or otherwise).

//  *Unless required by applicable law or agreed to in writing, the
//    licensor provides the work on an "AS IS" BASIS, WITHOUT WARRANTIES OR
//    CONDITIONS OF ANY KIND, either express or implied, including, without
//    limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT,
//    MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely
//    responsible for determining the appropriateness of using or
//    redistributing the works and assume any risks associated with your
//    exercise of permissions under this license.
//
//  * In no event and under no legal theory, whether in tort (including
//	  negligence), contract, or otherwise, unless required by applicable law
//    (such as deliberate and grossly negligent acts) or agreed to in
//    writing, shall the licensor be liable to you for damages, including
//    any direct, indirect, special, incidental, or consequential damages of
//    any character arising as a result of this license or out of the use or
//    inability to use the works (including but not limited to damages for
//    loss of goodwill, work stoppage, computer failure or malfunction, or
//    any and all other commercial damages or losses), even if the licensor
//    has been advised of the possibility of such damages.

var saveMod	=	{
					game_id: "",
					slotCount: 3,
					justLoaded: false,
					using_cookies: false
				};

//Validate New Commands
Scene.validCommands.sm_load = 1;
Scene.validCommands.sm_save = 1;
Scene.validCommands.sm_delete = 1;
Scene.validCommands.sm_init = 1;
Scene.validCommands.whatever = 1;

(function(){
 "use strict";
function checkLocalStorage() {
 //Algorithm to emulate local storage with cookies from MDN
if (!window.localStorage) {
	saveMod.using_cookies = true;
  window.localStorage = {
    getItem: function (sKey) {
      if (!sKey || !this.hasOwnProperty(sKey)) { return null; }
      return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
    },
    key: function (nKeyId) {
      return unescape(document.cookie.replace(/\s*\=(?:.(?!;))*$/, "").split(/\s*\=(?:[^;](?!;))*[^;]?;\s*/)[nKeyId]);
    },
    setItem: function (sKey, sValue) {
      if(!sKey) { return; }
      document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
      this.length = document.cookie.match(/\=/g).length;
    },
    length: 0,
    removeItem: function (sKey) {
      if (!sKey || !this.hasOwnProperty(sKey)) { return; }
      document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      this.length--;
    },
    hasOwnProperty: function (sKey) {
      return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    }
  };
  window.localStorage.length = (document.cookie.match(/\=/g) || window.localStorage).length;
}
}

//COMMANDS:
Scene.prototype.sm_init = function sm_init(data) {
checkLocalStorage();
	if (!window.localStorage && !saveMod.using_cookies) {
		alertify.error("SaveMod Error: Your browser is not supported, or data storage is prevented!" );
		for (var i=0;i<=saveMod.slotCount;i++) {
			stats["savemod_slot_" + i] = "Saving is not supported";
		}
		return;
	}
	data = data || "";
	var args = data.split(" | ");
		if (args[0]) {
			saveMod.game_id = args[0].toLowerCase();        
		}
		else { 
			throw new Error("SaveMod: Non existent game_id argument for *init_savemod!");
		}
		if (args[1]) {
			saveMod.slotCount = Number(args[1]);
		}
		else { 
			throw new Error("SaveMod: Non existent slotCount argument for *init_savemod!");
		}
		if (args.length != 2) {
			throw new Error("SaveMod: Expected 2 arguments for *sm_init but got " + args.length);
		}
	for (var i=0;i<=saveMod.slotCount;i++) {
		if (localStorage[saveMod.game_id + "_savemod_name_" + i]) {
			stats["savemod_slot_" + i] = localStorage[saveMod.game_id + "_savemod_name_" + i];
		}
		else {
			stats["savemod_slot_" + i] = "No Data";
		}
	}
}

Scene.prototype.sm_load = function sm_load(data) {
	if (!window.localStorage && !saveMod.using_cookies) {
		alertify.error("SaveMod Error: Your browser is not supported, or data storage is prevented!" );
		return;
	}
	if (saveMod.justLoaded) { 
		saveMod.justLoaded = false; //If we've only just loaded, don't try and reload.
		return; 
		}
	if (!saveMod.game_id) {
		throw new Error("SaveMod: Unable to *load before *init_savemod");
	}

    data = data || "";
    var args = data.split(" | ");
    if (args.length != 2) { throw new Error("SaveMod: Expected 2 arguments for *sm_load but got " + args.length); }
    
    var saveSlot = args[0];
    if ((isNaN(saveSlot))) {throw new Error("SaveMod: '" + saveSlot + "' is not a valid save slot! It must be a number!"); }
    var doPrompt = args[1];
        doPrompt = str_to_boolean(doPrompt);

    if (!localStorage[saveMod.game_id + "_savemod_data_" + args[0]]) {
         alertify.error("There is no saved data!" ); return; 
    }
        
    if (doPrompt) {
        var x = confirm( "Are you sure you wish to load this game?\nYour current progress will be lost.");
            if (x) {
                    window.stats.scene.restore_localStorage(saveSlot);
            }
            else {
                return;
            }
    }
    else {
        window.stats.scene.restore_localStorage(saveSlot);
    }
}

Scene.prototype.sm_save = function sm_save(data) {
	if (!window.localStorage && !saveMod.using_cookies) {
		alertify.error("SaveMod Error: Your browser is not supported, or data storage is prevented!" );
		return;
	}
	if (saveMod.justLoaded) { 
		saveMod.justLoaded = false;  //If we just loaded, don't try and save.
		return; 
	} 
    if (!saveMod.game_id) {
		throw new Error("SaveMod: Unable to *sm_save before *sm_init");
    }

    data = data || "";
    var args = data.split(" | ");
    if (args.length != 2 && args.length != 3) { 
		throw new Error("SaveMod: Expected two or three arguments for *sm_save but got " + args.length); 
		return; 
	}
    
    var saveSlot = args[0];
    if ((isNaN(saveSlot))) {
		throw new Error("SaveMod: '" + saveSlot + "' is not a valid save slot! Must be a number!"); 
	}
	else if (saveSlot > saveMod.slotCount) {
		throw new Error("SaveMod: Specified save slot is out of bounds!");
	}
	
    var doPrompt = args[1];
        doPrompt = str_to_boolean(doPrompt);
      
    if (args[2]) {      
        var saveName = args[2];
    }
	else {
		var saveName = getSaveDate();
	}
        
    if (doPrompt) {
        var ok = confirm( "Are you sure you wish to save your game?\nThe data in the selected slot will be overwritten.");
        if (ok) {
            saveName = prompt("What would you like to name your save?", saveName);
			if (saveName) {
				sm_ProcessSave(saveSlot, saveName);
			}
			else { 
				alertify.error("Game wasn't saved!");
				return; 
			}
		}
		else {
			alertify.error("Game wasn't saved!");
			return; 
		}
	}
    else {
		sm_ProcessSave(saveSlot, saveName);
	}
}

function sm_ProcessSave(saveSlot, saveName) {
	if (!saveName || saveName == "") {
		saveName = getSaveDate();
	}
	if (saveMod.using_cookies) {
		//Cookie Emulation of Local Storage
		localStorage.setItem(saveMod.game_id + "_savemod_data_" + saveSlot, saveMod.c_password)
		localStorage.setItem(saveMod.game_id + "_savemod_name_" + saveSlot, saveName)
	}
	else {
		//Local Storage
		localStorage[saveMod.game_id + "_savemod_data_" + saveSlot] = saveMod.c_password;
		localStorage[saveMod.game_id + "_savemod_name_" + saveSlot] = saveName;
	}
	stats["savemod_slot_" + saveSlot] = saveName;
	alertify.success(saveName + " saved successfully!" );
}

Scene.prototype.sm_delete = function sm_delete(data) {
	if (!window.localStorage && !saveMod.using_cookies) {
		alertify.error("SaveMod Error: Your browser is not supported, or data storage is prevented!" );
		return;
	}
    if (!saveMod.game_id) {
		throw new Error("SaveMod: Unable to use *sm_delete before *sm_init");
    }
    data = data || "";
	var args = data.split(" | ");
    var saveSlot = args[0];
    if (args.length != 1) { 
		throw new Error("SaveMod: Expected one argument for *sm_delete but got " + args.length); 
		return; 
	}
    if ((isNaN(saveSlot))) {
		throw new Error("SaveMod: '" + saveSlot + "' is not a valid save slot! Must be a number!"); 
	}
	else if (saveSlot > saveMod.slotCount) {
		throw new Error("SaveMod: Specified save slot is out of bounds!");
	}
    if (localStorage[saveMod.game_id + "_savemod_name_" + data] || localStorage[saveMod.game_id + "_savemod_data_" + data]) {
        var ok = confirm( "Are you sure you wish to delete your saved game?\nThis action cannot be undone.");
            if (ok) {
                var saveID = saveMod.game_id + "_savemod_name_" + data;
                var saveData = saveMod.game_id + "_savemod_data_" + data;
                localStorage.removeItem(saveID);
                localStorage.removeItem(saveData);
                stats["savemod_slot_" + data] = "No Data";
                alertify.success("Deletion succesful!" );
            }
            else {
                return;
            }
    }
    else { 
        alertify.error("There is nothing to delete!" ); return;
    }
}

Scene.prototype.restore_localStorage = function restore_localStorage(saveSlot) { 
    saveMod.justLoaded = true; //Prevent load/save loops
    var alreadyFinished = this.finished;
    var self = this;
    var unrestorableScenes = this.parseRestoreGame(alreadyFinished);

    var password = localStorage[saveMod.game_id + "_savemod_data_" + saveSlot];
        password = password.replace(/\s/g, "");
        password = password.replace(/^.*BEGINPASSWORD-----/, "");
        var token = this.deobfuscatePassword(password);
        token = token.replace(/^[^\{]*/, "");
        token = token.replace(/[^\}]*$/, "");
        try {
          var state = jsonParse(token);
        } catch (e) {
          var supportEmail = "support-unknown@choiceofgames.com";
          try {
            supportEmail=document.getElementById("supportEmail").getAttribute("href");
            supportEmail=supportEmail.replace(/\+/g,"%2B");
            supportEmail=supportEmail.replace(/mailto:/, "");
          } catch (e) {
            supportEmail = "support-unknown@choiceofgames.com";
          }
          alert("Sorry, that password was invalid. Please contact " + supportEmail + " for assistance. Be sure to include your password in the email.");
		  alert(password);
          return;
        }
        
        var sceneName = null;
        if (state.stats && state.stats.sceneName) sceneName = (""+state.stats.sceneName).toLowerCase();
        
        var unrestorable = unrestorableScenes[sceneName];
        if (unrestorable) {
          alert(unrestorable);
          self.finished = false;
          self.resetPage();
          return;
        }
        saveCookie(function() {
          clearScreen(function() {
            // we're going to pretend not to be user restored, so we get reprompted to save
            restoreGame(state, null, /*userRestored*/false);
          })
        }, "", state.stats, state.temps, state.lineNum, state.indent, this.debugMode, this.nav);
 alertify.success("Load succesful!" );
}

//Overwrites a native cs interpreter function
// reset the page and invoke code after clearing the screen
Scene.prototype.resetPage = function resetPage() {
    if (typeof(Storage)!=="undefined") {
        var scene = window.stats.scene;

        var password = computeCookie(scene.stats, scene.temps, scene.lineNum, scene.indent);
        password = scene.obfuscate(password);
        password = "----- BEGIN PASSWORD -----\n" + password + "\n----- END PASSWORD -----";
        saveMod.c_password = password; //Stores password but doesn't "save it".
    } 
    var self = this;
    clearScreen(function() {
      // save in the background, eventually
      self.save("");
      self.prevLine = "empty";
      self.screenEmpty = true;
      self.execute();
    });
}

function str_to_boolean(string) {
    string = string.toLowerCase();
    if (string == "true" || string == "false") {
        if (string == "true") {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        throw new Error("SaveMod: Second argument must be either true or false!"); 
    }
}

function getSaveDate() {
	    var date = new Date();
        var year = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
        var hours = date.getHours();
        var mins = date.getMinutes();
        date = day + "/" + month + "/" + year;
        var time = hours + ":" + mins;
		var saveName = "Autosave on the " + date + " at " + time;
		return saveName;
}
})();