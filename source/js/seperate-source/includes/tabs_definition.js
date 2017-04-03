	 self.tabs = ko.observableArray(
		[
			{"id" : "game", "title" : "Game", "iconClass" : "fa fa-cube", "href" : ko.observable("default.html"), "content" : "", "visible": ko.observable(true)},
			{"id" : "issues", "title" : "Issues", "iconClass" : "fa fa-exclamation-triangle", "href" : "", "content" : "", "visible": ko.observable(true)},
			{"id" : "settings", "title" : "Settings", "iconClass" : "fa fa-cog", "href" : "", "content" : "", "visible": ko.observable(true)},
			{"id" : "help", "title" : "Help", "iconClass" : "fa fa-question-circle", "href" : ko.observable("help/index.html"), "content" : "", "visible": ko.observable(true)},
			{"id" : "dictionary", "title" : "User Dictionary", "iconClass" : "fa fa-book", "href" : "", "content" : "", "visible": ko.observable(true)},
			{"id" : "snippets", "title" : "Code Snippets", "iconClass" : "fa fa-scissors", "href" : "", "content" : "", "visible": ko.observable(false)},
			{"id" : "notes", "title" : "Notes/Memos", "iconClass" : "img/ui/notes.png", "href" : "", "content" : "", "visible": ko.observable(false)}
		]
	);