var cside = window.opener ? window.opener.parent.cside : parent.window.cside;
var parent = window.opener ? window.opener.parent : window.parent;

var ETmod = {};
ETmod.TOKENS = {
  "labels" : " span.cm-keyword",
  "comments" : " span.cm-comment",
  "variables" : " span.cm-variable",
  "options" : " span.cm-operator",
  "csplus" : " span.cm-cs-plus",
  "commands" : " span.cm-builtin",
  "spell-errors" : " span.cm-spell-error",
  "indentation" : " span.cm-visible-indentation",
  "error-lines" :  " .CodeMirror-error-background",
  "gutter": " .CodeMirror-gutters",
  "gutter-numbers": " .CodeMirror-linenumber",
  "matches" : " .cm-matchhighlight",
  "cursor": " .CodeMirror-cursor",
  "page" : ".CodeMirror"
}

ETmod.ATTRIBUTES = {
  "color" : "color",
  "background" : "background",
  "weight": "font-weight",
  "style": "font-style",
  "decoration" : "text-decoration",
  "bottom-border" : "border-bottom",
  "left-border" : "border-left"
}

ETmod.VALUES = {
  "color": __validColour,
  "background": __validColour,
  "font-weight": ["bold", "normal"],
  "font-style": ["italic", "normal"],
  "text-decoration" : ["overline", "underline", "line-through"],
  "border-bottom" : __validBorder,
  "border-left" : __validBorder,
}

ETmod.store = {};

ETmod.CSS_PREFIX = ".cm-s-cs-custom";

Scene.prototype.cside_theme_set = function(args) {
  args = args.split(" ");
  if (args.length < 3) {
    throw new Error("Expected three or more arguments: TOKEN ATTRIBUTE VALUE");
  } else if (args[args.length-1] == "!override" || args[args.length-1] == "!important") {
    var important = args.pop();
  }
  if (ETmod.TOKENS[args[0]]) {
    if (ETmod.ATTRIBUTES[args[1]]) {
      var valueList;
      if ((valueList = args.slice(2).join(" ")) && ( (typeof ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]] == "function" && ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]](valueList))
          || (Array.isArray(ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]]) && ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]].includes(valueList)) ) ) {
        if (!ETmod.store[args[0]])
          ETmod.store[args[0]] = {};
        if (!ETmod.store[args[0][args[1]]])
          ETmod.store[args[0]][args[1]] = null;
        var classString = ((ETmod.CSS_PREFIX + ETmod.TOKENS[args[0]]) + (" -> " + ETmod.TOKENS[args[1]])) + ( " = " + valueList);
        if (typeof important != "undefined") {
          valueList += " !important";
        }
        ETmod.store[args[0]][args[1]] = valueList;
      }
      else {
        throw new Error("'" + valueList + "' is not a valid value, " + this.lineMsg()); // improve this msg
      }
    }
    else {
      throw new Error("No such syntax attribute: " + args[1] + ", " + this.lineMsg());
    }
  }
  else {
    throw new Error("No such syntax token: " + args[0]+ ", " + this.lineMsg());
  }
}

Scene.prototype.cside_theme_apply = function(data) {
  ETmod.css = "";
  for (var token in ETmod.store) {
    println("Applying " + token.toUpperCase() + " style:");
    ETmod.curRule = ETmod.CSS_PREFIX + ETmod.TOKENS[token] + "{";
    for (var attribute in ETmod.store[token]) {
      println("\t-> " + attribute.toUpperCase() + " = " + ETmod.store[token][attribute]);
      ETmod.curRule += (ETmod.ATTRIBUTES[attribute] + ":" + ETmod.store[token][attribute] + ";");
    }
    ETmod.curRule += "}";
    ETmod.css += ETmod.curRule;
  }
  localStorage.setItem("CSIDE_userCSS", ETmod.css);
  parent.fs.writeFile("css/user.css", ETmod.css, {
    encoding: 'utf8'
  }, function(err) {
    if (!err) {
      parent.document.getElementById("user-theme").href = "";
      parent.document.getElementById("user-theme").href = "css/user.css";
    }
  });
}

function __validColour(stringToTest) {
  //Alter the following conditions according to your need.
  if (stringToTest === "") { return false; }
  if (stringToTest === "inherit") { return false; }
  if (stringToTest === "transparent") { return false; }

  var image = document.createElement("img");
  image.style.color = "rgb(0, 0, 0)";
  image.style.color = stringToTest;
  if (image.style.color !== "rgb(0, 0, 0)") { return true; }
  image.style.color = "rgb(255, 255, 255)";
  image.style.color = stringToTest;
  return image.style.color !== "rgb(255, 255, 255)";
}

function __validBorder(args) {
  var BORDER_TYPES = ["dotted", "dashed", "solid"];
  args = args.split(" ");
  if (args.length != 3) // expect: 1. dotted,solid,dashed 2. __validColour, 3. 1-5px
    return false;
  var color, width = args[2].replace("px", "");
  if (!BORDER_TYPES.includes(args[0]))
    return false;
  if (!(colour = __validColour(args[1])))
    return false;
  if (isNaN(width) || (width > 5 || width < 1))
    return false;
  return true;
}

 Scene.validCommands.cside_theme_set = 1;
 Scene.validCommands.cside_theme_apply = 1;
