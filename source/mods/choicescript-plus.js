Scene.prototype.create_array = function create_array(data) {
  data = data || "";
  var args = data.split(" ");
  console.log(args);
  if (args.length > 3) throw new Error(this.lineMsg()+"Too many arguments; expected name, size and (optionally) a default value.");
  if (args.length < 2) throw new Error(this.lineMsg()+"Too few arguments; expected name, size and (optionally) a default value.");
  var arrName = args[0];
  var arrSize = parseInt(args[1]);
  var defaultVal = args[2] || "";
  if (isNaN(arrSize)) throw new Error(this.lineMsg()+"Size must be a number: " + args[1]);
  
  for (var i = 1; i <= arrSize; i++)
    this.create(arrName + "_" + i + " " + defaultVal);
};

Scene.prototype["for"] = function scene_for(line) {

};

Scene.prototype["while"] = function scene_while(data) {
  var stack = this.tokenizeExpr(line);
  var result = this.evaluateExpr(stack);
  if (this.debugMode) println(line + " :: " + result);
  result = bool(result, this.lineNum+1);
  if (result) {
      // "true" branch, just go on to the next line
      this.indent = this.getIndent(this.nextNonBlankLine());
  } else {
      // "false" branch; skip over the true branch
      this.skipTrueBranch(false);
  }
};

Scene.prototype.repeat = function repeat(data) {
  this.loop_for(data);
};

Scene.prototype.repeat_while = function repeat_while(data) {
  this.loop_while(data);
};

Scene.validCommands.create_array = 1;
Scene.validCommands.loop_for = 1;
Scene.validCommands.loop_while = 1;
Scene.validCommands.repeat = 1;
Scene.validCommands.repeat_while = 1;

Scene.prototype["if"] = function scene_if(line) {
    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
    if (this.debugMode) println(line + " :: " + result);
    result = bool(result, this.lineNum+1);
    if (result) {
        // "true" branch, just go on to the next line
        this.indent = this.getIndent(this.nextNonBlankLine());
    } else {
        // "false" branch; skip over the true branch
        this.skipTrueBranch(false);
    }
};

Scene.prototype.cse = {
  "getFreeLabelName": function(prefix) {
    for (var i = 0; i < prefix; i++) {
      if (this.labels[prefix + ("_" + i)]) {
        break;
      }
    }
    return (prefix + ("_"  + i));
  },
  "while": {
    "transpile": function(expr) {
      var lines = [];
      var label = getFreeLabelName("while_loop");
      lines.push("*label " + getFreeLabelName("while_loop"));
      lines.push("*if " + x.lines[0].replace(/^\w+\s/, ""));
      lines = lines.concat(x.lines.slice(1));
      lines.push("\t*goto " + label);
      console.log(lines.join("\n"));

    var stack = this.tokenizeExpr(line);
    var result = this.evaluateExpr(stack);
        var stack = this.tokenizeExpr(line);
        var result = this.evaluateExpr(stack);
      }.bind(this),
    },
    "validate": function(tokens) {
      
    }
 }

/*
var scene = new Scene();
scene.loadLines();
for (var line = 0; line < scene.lines.length; line++) {
  var command = /^\s*\*(\w+)(.*)/.exec(line);
  if (!command) {
    //skip
  }
  else if (cse[command[1]]) {
    //cse command
    cse[command[1]].transpile(command[2]);
  }
} 

    var stack = this.tokenizeExpr(data);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var variable = this.evaluateReference(stack);
    if ("undefined" === typeof this.temps[variable] && "undefined" === typeof this.stats[variable]) {
      throw new Error(this.lineMsg() + "Non-existent variable '"+variable+"'");
    }

    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var minimum = this.evaluateValueToken(stack.shift(), stack);
    if (!stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var maximum = this.evaluateValueToken(stack.shift(), stack);
    if (stack.length) throw new Error(this.lineMsg() + "Invalid rand statement, expected three args: varname min max");
    var diff;
    
    */