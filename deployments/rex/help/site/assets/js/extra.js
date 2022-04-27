var cside = parent.window.cside;
var color = cside.getUIColour(-8);

// Update docs headers to match CSIDE UI color
var nodeList = document.getElementsByClassName("md-header");
for (let node of nodeList) {
    node.style.transition = "all .5s ease";
    node.style.backgroundColor = color;
}

// Update docs theme to match CSIDE night mode
var bodyTag = document.getElementsByTagName("body")[0];
if (bodyTag) {
    var themeBtn = document.querySelector("form[data-md-component='palette'] > label:not([hidden])");
    if (themeBtn) {
        var docsInNightMode = (bodyTag.getAttribute("data-md-color-scheme") === "slate");
        if (cside.isInNightMode() !== docsInNightMode) {
            themeBtn.click();
        }
    }    
}

// Open external links in browser
var exLinks = document.querySelectorAll("a");
for (let link of exLinks) {
    if (link.href.match(/^http/)) {
        link.setAttribute("target", "_blank");
    }
}

// don't allow CSIDE control links in standalone documentation
function CSIDE(func) {
    if ((typeof parent != 'undefined') && (typeof parent.cside != 'undefined')) {
        func();
    }
}