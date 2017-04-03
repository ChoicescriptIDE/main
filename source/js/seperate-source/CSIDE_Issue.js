	function CSIDE_Issue(issueData) {
		var self = this;
		
		//INSTANCE VARIABLES
		var scene = issueData.scene;
		var desc = issueData.desc;
		var date, time;
		var lineHandle = issueData.lineHandle;
		
		var d=new Date();
		date = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
		time = d.getHours() + ":" + d.getMinutes();
		
		//GETTER METHODS
		self.getScene = function() {
			return scene;
		}
		self.getDesc = function() {
			return desc;
		}
		self.getDate = function() {
			return date;
		}
		self.getTime = function() {
			return time;
		}
		self.hasLineNum = function() {
			return (typeof lineHandle != "undefined" && lineHandle != null);
		}
		self.getLineNum = function() { 
			return scene.getDoc().getLineNumber(lineHandle);
		}
		//methods
		self.dismiss = function() {
			scene.clearIssue(self);
		}
		self.show = function() {
			scene.select();
			editor.scrollIntoView({"line": self.getLineNum(), "ch": 0});
		}
	}