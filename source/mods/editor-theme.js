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
  "page" : ".CodeMirror.CodeMirror-wrap"
}

ETmod.ATTRIBUTES = {
  "color" : "color",
  "background" : "background",
  "weight": "font-weight",
  "style": "font-style",
  "decoration" : "text-decoration"
}

ETmod.VALUES = {
  "color": __validColour,
  "background": __validColour,
  "font-weight": ["bold", "normal"],
  "font-style": ["italic", "normal"],
  "text-decoration" : ["overline", "underline", "line-through"],
}

ETmod.store = {};

ETmod.CSS_PREFIX = ".cm-s-cs-custom";

Scene.prototype.cside_theme_set = function(args) {
  args = args.split(" ");
  if (args.length < 0) {
    throw new Error("Expected zero or one arguments");
  }
  if (ETmod.TOKENS[args[0]]) {
    if (ETmod.ATTRIBUTES[args[1]]) {
      if (args[2]  && ( (typeof ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]] == "function" && ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]](args[2]))
          || (Array.isArray(ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]]) && ETmod.VALUES[ETmod.ATTRIBUTES[args[1]]].includes(args[2])) ) ) {
        if (!ETmod.store[args[0]])
          ETmod.store[args[0]] = {};
        if (!ETmod.store[args[0][args[1]]])
          ETmod.store[args[0]][args[1]] = null;
        var classString = ((ETmod.CSS_PREFIX + ETmod.TOKENS[args[0]]) + (" -> " + ETmod.TOKENS[args[1]])) + ( " = " + args[2]);
        ETmod.store[args[0]][args[1]] = args[2];
      }
      else {
        throw new Error("'" + args[2] + "' is not a valid syntax property, " + this.lineMsg());
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

 Scene.validCommands.cside_theme_set = 1;
 Scene.validCommands.cside_theme_apply = 1;
