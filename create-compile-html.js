knownScenes = [];
var scene_object = "";
var success = true;
var skip = false;
var loadFailed = false;
var fs = require('fs');
var rootDir = "build/node_modules/cside-choicescript/web/";

function compile(){

  var slurpFile = function(path) {
      return fs.readFileSync(path).toString();
  }

  function safeSlurpFile(file) {
    try {
      return slurpFile(file, false);
    } catch (e) {
      return null;
    }
  }

  //1. Grab the game's html file
  var url = rootDir+"mygame/index.html";
  var game_html = slurpFile(url, true);

  //2. Find and extract all .js file data
  var next_file = "";
  var patt = /<script.*?src=["'](.*?)["'][^>]*><\/script>/gim;
  var doesMatch;
  var jsStore = "";
  console.log("\nExtracting js data from:");
  while (doesMatch = patt.exec(game_html)) {
    console.log(doesMatch[1]);
    next_file = safeSlurpFile(rootDir+'mygame/' + doesMatch[1]);
    if (next_file != "undefined" && next_file !== null) {
      jsStore = jsStore + next_file;
    }
  }

  console.log("");

  //3. Find and extract all .css file data
  patt = /^<link[\s][\w'"\=\s\.\/]*[\s]?href\=["']([\w\.\/]*.css)["']/gim;
  var cssStore = "";
  console.log("\nExtracting css data from:");
  while (doesMatch = patt.exec(game_html)) {
    // console.log(doesMatch[0]);
    console.log(doesMatch[1]);
    next_file = slurpFile(rootDir+'mygame/' + doesMatch[1], true);
    if (next_file != "undefined" && next_file !== null) {
      cssStore = cssStore + next_file;
    }
  }

  //4. Remove css links
  patt = /^<link[\s][\w'"\=\s\.\/]*>/gim;
  game_html=game_html.replace(patt,"");

  //5. Remove js links
  patt = /^<script src\=[^>]*><\/script>/gim;
  game_html=game_html.replace(patt,"");

  //6. Slice the document and check for a *title
  var top = game_html.slice(0, (game_html.indexOf("</head>") - 1));
    top += "\n<meta charset='UTF-8'>\n" //ensure browsers don't misinterpret charset thanks to inline JS
  var bottom = game_html.slice((game_html.indexOf("</head>")),game_html.length);

  //8. Reassemble the document (selfnote: allScenes object seems to cause issues if not in its own pair of script tags)
  console.log("Assembling new html file...");
  var head = top + "<script>" + jsStore + "<\/script><style>" + cssStore + "</style>";
  return {head: head, tail: bottom};
}

function addFile(name) {
  for (var i = 0; i < knownScenes.length; i++) {
    if (knownScenes[i] == name) return;
  }
  knownScenes.push(name);
}

function verifyFileName(name) {
  addFile(name);
}

var html = compile();
fs.writeFileSync('build/compile_head.txt', html.head ,"utf8");
fs.writeFileSync('build/compile_tail.txt', html.tail ,"utf8");
console.log("DONE!");
