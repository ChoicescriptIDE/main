	function CSIDE_Setting(settingData) {
		var self = this;
		var value = ko.observable(settingData.value);
		var id = settingData.id;
		var name = settingData.name;
		var selectedOption = 0;
		var type = settingData.type || "binary";
		var cat = settingData.cat || "app";
		
		if (type === "binary") {
			var options = [{"desc": "on", "value": true}, {"desc": "off", "value": false}]
		} else {
			var options = settingData.options;
		}
		
		//ACCESSOR METHODS
		self.getValue = ko.computed(function() {
			return value();
		}, this);
		self.setValue = function(newVal) {
			for (var i = 0; i < options.length; i++) {
				if (newVal == options[i].value)
					value(newVal);
			}
		}
		self.getId = function() {
			return id;
		}
		self.getName = function() {
			return name;
		}
		self.getType = function() {
			return type;
		}
		self.getCat = function() {
			return cat;
		}
		self.getOptions = function() {
			return options;
		}
		
		//MUTATOR METHODS
		self.apply = settingData.apply; //unique apply method for each setting
		self.toggle = function(option) {
			if (type != "binary") {
				value(option.value);
			}
			else if ((selectedOption + 1) == options.length) {
				selectedOption = 0;
				value(options[selectedOption].value);
			}
			else {
				selectedOption += 1;
				value(options[selectedOption].value);
			}
			self.apply(value());
			config.settings[cat][id] = value(); //store 
			__updateConfig(); //then write new settings object to localStorage
		}
	}