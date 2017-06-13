var MAX_POST_DESC_LENGTH = 140;

marked.setOptions({
  highlight: function (code) {
    return require('highlight.js').highlightAuto(code).value;
  }
});

var csideHelp = {
  "current" : "home.html",
  "history" : ["home.html"],
  "breadcrumbs" : [
    {
      "title": "Home",
      "url": "home.html"
    }
  ],
  "busy": false,
  "extern": /^(https?|mailto):.+$/
}

String.prototype.capitalizeFirstLetter = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}
/* don't allow CSIDE control links in standalone documentation */
function CSIDE(func) {
  if ((typeof parent != 'undefined') && (typeof parent.cside != 'undefined')) {
    func();
  }
}

function blinkElement(selector) {
  CSIDE(function() {
    if (parent.$(selector) && !parent.$(selector).hasClass("pulse")) {
      parent.$(selector).addClass("pulse");
      setTimeout(function() {
        parent.$(selector).removeClass("pulse");
      }, 3000);
    }
  });
}

<!-- JQUERY -->
csideHelp.handleLink = function(e) {
  e.preventDefault();
  if (csideHelp.busy)
    return;
  csideHelp.busy = true;
  if (($(this).attr('rel') == "anchor") || ($(this).attr('rel') == "cside")) {
    csideHelp.busy = false;
    return;
  }
  if (csideHelp.extern.test($(this).attr('href')) && $(this).attr("rel") != "source") {
    parent.window.usingNode ? parent.window.gui.Shell.openExternal($(this).attr("href")) : parent.window.open($(this).attr("href"));
    csideHelp.busy = false;
    return;
  }
  var linkEle = $(this);
  if (linkEle.hasClass("breadcrumb")) {
    var breadcrumbIndex = $(linkEle).data('index');
    var popCount = (csideHelp.breadcrumbs.length - (breadcrumbIndex + 1));
    for (; popCount > 0; popCount--) {
      csideHelp.history.pop();
      csideHelp.breadcrumbs.pop();
    }
  }
  else {
    var bc = {};
    var newPage = true;
    bc.title = $(this).attr("title") || '???';
    bc.url = $(this).attr("href");
    /* prevent duplicate entries */
    for (var i  = 0; i < csideHelp.breadcrumbs.length; i++) {
      if (bc.url === csideHelp.breadcrumbs[i].url) {
        var newLength = (csideHelp.breadcrumbs.length - (i + 1));
        newPage = false;
        for (; newLength > 0; newLength--) {
          csideHelp.history.pop();
          csideHelp.breadcrumbs.pop();
        }
        break;
      }
    }
    if (newPage) {
      csideHelp.breadcrumbs.push(bc);
      csideHelp.history.push($(this).attr('href'));
    }
  }
  csideHelp.drawPage(linkEle.attr("href"));
  return false;
}

csideHelp.drawPage = function(url) {
  scrollTo(0, 0);
  csideHelp.redrawBreadcrumbs();
  $('#content').animate({opacity: 0}, 750, function() {
    $.get(url)
      .done(function(data) {
        var extension = url.substring(url.lastIndexOf("."), url.length);
        if (extension === ".md") {
          $("#content").html(marked(data));
        }
        else if (extension === ".xml") {
          $("#content").html("");
          document.getElementById("content").appendChild(parseXmlContent(data));
        }
        else {
          $("#content").html(data);
        }
        $('body a').attr("draggable", false); // disallow link 'drag'
      })
      .fail(function() {
        $("#content").load( "404.html", function( response, status, xhr ) {
          $('#content').animate({opacity: 1}, 1000);
        });
        return;
      })
      .always(function() {
        csideHelp.busy = false;
        csideHelp.current = url;
        $('#content').animate({opacity: 1}, 1000);
      })
  });
}

csideHelp.redrawBreadcrumbs = function() {

  // if we're getting busy remove the oldest page (that isn't the 'home' page)
  if (csideHelp.breadcrumbs.length > 5)
    csideHelp.breadcrumbs.splice(1, 1);

  // don't show bottom breadcrumbs on home page
  if (csideHelp.breadcrumbs.length < 2)
    $('.breadcrumbs').last().parent().fadeOut();
  else
    $('.breadcrumbs').last().parent().fadeIn();

  $('.breadcrumbs').html("");
  for (var i = 0; i < csideHelp.breadcrumbs.length; i++) {
    if ((i + 1) == csideHelp.breadcrumbs.length) {
      var ele = $('<span>');
    }
    else {
      var ele = $('<a>');
      ele.attr('href', csideHelp.breadcrumbs[i].url);
      ele.attr('title', csideHelp.breadcrumbs[i].title);
    }
    ele.text(csideHelp.breadcrumbs[i].title.capitalizeFirstLetter());
    ele.addClass('breadcrumb');
    ele.data('index', i);
    ele.appendTo('.breadcrumbs');
  }
}


/* ------------ W E B S I T E - N E W S - F E E D ------------ */
function parseXmlContent(data) {
  var container = document.createElement("ul");
  container.className = "feed";
  var header = document.createElement("h2");
  header.innerHTML = "News & Updates";
  container.appendChild(header);
  $(data).find("entry").each(function () { // or "item" or whatever suits your feed

    // construct components
    var listItem = document.createElement("li");
      var title = document.createElement("h3");
        var dDate = new Date($(this).find("published").text());
          title.innerHTML = $(this).find("title").text() + " - " + dDate.getDay() + "/" + dDate.getMonth() + "/" + dDate.getFullYear();
      var desc = document.createElement("p");
        desc.innerHTML = $(this).find("content").text().substring(0, MAX_POST_DESC_LENGTH) + "...";
      var link = document.createElement("a");
        link.href = $(this).find("id").text();
        link.innerHTML = "Read more";

    // append together
    listItem.appendChild(title);
    desc.appendChild(link);
    listItem.appendChild(desc);
    container.appendChild(listItem);
  });

  return container;
}
