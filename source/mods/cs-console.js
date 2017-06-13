var cside = window.parent.cside;

Scene.prototype.CSIDEConsole_tracking = {track_all: false, temps: {}, stats: {}};
Scene.prototype.CSIDEConsole_getVarCat = function(variable) {
    if (typeof this.temps[variable] === "undefined") {
        if (typeof this.stats[variable] === "undefined") {
            throw new Error("Non-existent variable '"+variable+"'");
        }
        else {
            return "stats";
        }
    }
    else {
        return "temps";
    }
}
Scene.prototype.CSIDEConsole_quoteStringVal = function(value) {
    if (typeof value === "string")
        return ("'" + value + "'");
    return value; //else
}

Scene.prototype.console_help = function (line) {
    var stack = this.tokenizeExpr(line);
    if (stack.length < 0) {
        throw new Error("Expected zero or one arguments");
    }
    var help = {
        options: {
            commands: {
                options: {
                    console_log: {
                        text:
                            "Can be used inside of scene files to log the result of any valid \
                            choicescript expression to the console.\
                            \n\nExamples:\n\
                            -- *console_log ((first_name&\" \")&last_name)\
                            \n-- *console_log num + 5\
                            \n-- *console_log (this_var) and not(that_var)",
                        options: {}
                    },
                    console_clear: {
                        text:
                            "Used to clear the console of all current logs.",
                        options: {}
                    },
                    console_track: {
                        text:
                            "Start tracking (logging) changes in the given variable(s). If there is a temp variable and a global variable\
                            with the same name, the temp variable takes preference.\
                            \n\nExamples:\n\
                            -- *console_track var1\
                            \n-- *console_track var1 var2 var3\
                            \n-- *console_track var1 var2 var3 var4",
                        options: {}
                    },
                    console_untrack: {
                        text:
                            "Stop tracking (logging) changes in the given variable(s). If there is a temp variable and a global variable\
                            with the same name, the temp variable takes preference. \
                            If no arguments are given, all currently tracked variables will become untracked.\
                            \n\nExamples:\n\
                            -- *console_untrack\
                            \n-- *console_untrack var1\
                            \n-- *console_untrack var1 var2",
						options: {}
                    },
                    console_track_list: {
                        text:
                            "Display a list of any variables currently being tracked along with their current value. Variable names are prefixed by their type (temps/local or stats/global). \
                            An optional filter argument can be passed to match against variable names, filtering the output list to variables that match.\
                            \n\nExamples:\n\
                            -- *console_track_list (all tracked variables)\
                            \n-- *console_track_list player (e.g. player_name, playerscore)\
                            \n-- *console_track_list temps (all temps/local variables) \
                            \n-- *console_track_list stats (all stats/global variables)",
                        options: {}
                    },
                    console_track_all_on: {
                        text:
                            "Override the track list and log ALL changes to ALL variables.",
                        options: {}
                    },
                    console_track_all_off: {
                        text:
                            "Disable the track_all_on override. Changes to variables set by *console_track will still be logged.",
                        options: {}
                    }
                },
                text: "The console supports a subset of Choicescript commands: 'set', 'setref', 'temp', 'achieve', 'rand', 'print', 'goto**' and 'goto_scene'.\
                      All of which function exactly the same as they do within the Choicescript language.\
                      In addition, the console also provides some of its own commands: \
                      'console_log', 'console_clear', 'console_track', 'console_untrack', 'console_track_all_on', 'console_track_all_off'\
                      and 'console_track_list'. To find out more about each of the console commands, you can type *console_help [command].\
                      \n\n**Note: the *goto command will cause the current screen to be completely cleared when it is used from the console."
            },
            expressions: { title: "commands",
                text: "",
                options: {

                }
            }
        },
        text: "Welcome to the IDE's Choicescript Console!\
                \nType *console_help [category] or *help [category] for more information\
                \n- commands\
                \n- expressions"
    }
    var token;
    var cat = help.options.commands; //cat = help (for global, category)
    while (stack.length > 0) {
        token = this.evaluateReference(stack);
        if (cat.options[token]) {
            cat = cat.options[token];
        }
        else if (cat.options["console_" + token]) {
            cat = cat.options["console_" + token];
        }
        else {
            throw new Error("Invalid help category '" + token + "'");
        }
    }
    thisProject.logToConsole(cat.text, "null");
};

Scene.prototype.console_log = function(line) {
    var stack = this.tokenizeExpr(line);
    var value = this.CSIDEConsole_quoteStringVal(this.evaluateExpr(stack));
    thisProject.logToConsole(value, "output", {scene: stats.sceneName + ".txt: ", line: stats.scene.lineNum + 1});
}

 Scene.prototype.console_clear = function() {
     thisProject.clearConsole();
 }

 Scene.prototype.console_track = function(line) {
     var stack = this.tokenizeExpr(line);
     if (stack.length === 0) { //track everything??
         throw new Error("Expected one or more arguments");
     }
     var valid_entries = [];
     var variable, type;
     while (stack.length > 0) {
         variable = this.evaluateReference(stack);
         type = this.CSIDEConsole_getVarCat(variable);
         if (!this.CSIDEConsole_tracking[type][variable]) {
             valid_entries.push({t: type, v: variable});
             //continue;
         }
         //throw new Error("Already tracking variable '"+variable+"'");
     }
     for (var i = 0; i < valid_entries.length; i++) {
         this.CSIDEConsole_tracking[valid_entries[i].t][valid_entries[i].v] = true;
     }
     return true;
 }

Scene.prototype.console_untrack = function(line) {
    var stack = this.tokenizeExpr(line);
    if (stack.length === 0) { //untrack everything
        this.stats.scene.CSIDEConsole_tracking = {track_all: this.CSIDEConsole_tracking.track_all, temps: {}, stats: {}};
        return;
    }
    var valid_entries = [];
    var variable, type;
    while (stack.length > 0) {
        variable = this.evaluateReference(stack);
        type = this.CSIDEConsole_getVarCat(variable);
        if (this.CSIDEConsole_tracking[type][variable]) {
            valid_entries.push({t: type, v: variable});
            //continue;
        }
        //throw new Error("Not tracking variable '"+variable+"'");
    }
    for (var i = 0; i < valid_entries.length; i++) {
        delete this.CSIDEConsole_tracking[valid_entries[i].t][valid_entries[i].v];
    }
    return true;
}

Scene.prototype.console_track_all_on = function() {
    this.CSIDEConsole_tracking.track_all = true;
    return true;
}

Scene.prototype.console_track_all_off = function() {
    this.CSIDEConsole_tracking.track_all = false;
    return true;
}

Scene.prototype.console_track_list = function(line) {
    var counter = 0;
    var filter;
    if (line.length > 0 ) {
        filter = line;
        if (!filter.match(/^\w+$/)) {
            throw new Error("Bad filter parameter. Only letters, numbers and underscores are allowed.")
        }
        else {
            filter = new RegExp(filter);
        }
    }
    else {
        filter = /^./;
    }
    for (var variable in this.CSIDEConsole_tracking.temps) {
        if (this.CSIDEConsole_tracking.temps.hasOwnProperty(variable)) {
            if (variable.match(filter)) {
                thisProject.logToConsole("temps." + variable + " " + this.CSIDEConsole_quoteStringVal(this.temps[variable]), "output");
                counter++;
            }
        }
    }
    for (var variable in this.CSIDEConsole_tracking.stats) {
        if (this.CSIDEConsole_tracking.stats.hasOwnProperty(variable)) {
            if (variable.match(filter)) {
                thisProject.logToConsole("stats." + variable + " " + this.CSIDEConsole_quoteStringVal(this.stats[variable]), "output");
                counter++;
            }
        }
    }
    if (counter === 0) {
        thisProject.logToConsole("Empty.", "output");
    }
}

Scene.prototype.CSIDEConsole_goto = function(data) {
    var self = this;
    this.goto(data);
    this.finished = false;
    clearScreen(function() {
        self.execute();
    });
}

Scene.prototype.CSIDEConsole_goto_scene = function(data) {

    var result = this.parseGotoScene(data);

    if (typeof result.sceneName !== "undefined" && typeof allScenes[result.sceneName] !== "undefined") {
        var scene = new Scene(result.sceneName, this.stats, this.nav, {debugMode:this.debugMode, secondaryMode:this.secondaryMode, saveSlot:this.saveSlot});
    }
    else {
        throw new Error("Couldn't load scene '" + result.sceneName + "'. The file doesn't exist.");
    }
    if (typeof result.label !== "undefined" && typeof allScenes[result.sceneName].labels[result.label] === "undefined") {
        throw new Error(scene.name + " doesn't contain label " + result.label);
    }
    else if (typeof result.label === "undefined") {
        result.label = "";
    }

    var pseduo_scene = new Scene("cside_save_slot", this.stats, this.nav, {debugMode:this.debugMode, secondaryMode:this.secondaryMode, saveSlot:this.saveSlot});
    pseduo_scene.loadLines(("*goto_scene " + result.sceneName + " " + result.label).trim());
    allScenes["cside_save_slot"] = {};
    allScenes["cside_save_slot"].crc = pseduo_scene.temps.choice_crc;
    allScenes["cside_save_slot"].labels = pseduo_scene.labels;
    allScenes["cside_save_slot"].lines = pseduo_scene.lines;

    var self = this;

    clearScreen(function() {
        self.finished = true;
        self.prevLine = "empty";
        self.screenEmpty = true;
        self.save("");
        pseduo_scene.execute();
    });
}

Scene.prototype.CSIDEConsole_forceStoreVarUpdate = function(type, variable) {
    var self = this;
    restoreObject(store, "state", null, function(result) {
        if (result) {
            result[type][variable] = self[type][variable];
            result = JSON.stringify(result);
            writeCookie(result, "", function() {
                writeCookie(result, "temp", function() {});
            });
        }
        //fail silently (likely on the first page of a run) - store isn't yet instantiated?
    });
}

 Scene.prototype.setVar = function setVar(variable, value) {
     variable = variable.toLowerCase();
     if (this.debugMode) println(variable +"="+ value);
     if ("undefined" === typeof this.temps[variable]) {
         if ("undefined" === typeof this.stats[variable]) {
             throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
         }
         if (this.CSIDEConsole_tracking.track_all || this.CSIDEConsole_tracking.stats[variable]) {
             var log = "value of stats." + variable + " changed from " + this.CSIDEConsole_quoteStringVal(this.stats[variable]) + " to " + this.CSIDEConsole_quoteStringVal(value);
             thisProject.logToConsole(log, "null", {scene: stats.sceneName + ".txt: ", line: (stats.scene.lineNum + 1)});
         }
         this.stats[variable] = value;
         this.CSIDEConsole_forceStoreVarUpdate("stats", variable);
     } else {
         if (this.CSIDEConsole_tracking.track_all || this.CSIDEConsole_tracking.temps[variable]) {
             var log = "value of temps." + variable + " changed from " + this.CSIDEConsole_quoteStringVal(this.temps[variable]) + " to " + this.CSIDEConsole_quoteStringVal(value);
             thisProject.logToConsole(log, "null", {scene: stats.sceneName + ".txt: ", line: (stats.scene.lineNum + 1)});
         }
         this.temps[variable] = value;
         this.CSIDEConsole_forceStoreVarUpdate("temps", variable);
     }
 };

 Scene.validCommands.console_log = 1;
 Scene.validCommands.console_help = 1;
 Scene.validCommands.console_clear = 1;
 Scene.validCommands.console_track = 1;
 Scene.validCommands.console_untrack = 1;
 Scene.validCommands.console_track_all_on = 1;
 Scene.validCommands.console_track_all_off = 1;
 Scene.validCommands.console_track_list = 1;
