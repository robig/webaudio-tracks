var App = {
	Mix: {
		tracks: [],

		play() {
			App.Mix.tracks.forEach(t=>t.play());
		},

		pause() {
			App.Mix.tracks.forEach(t=>t.pause());
		},

		stop() {
			App.Mix.tracks.forEach(t=>t.stop());
		},

		arm() {
			App.Mix.tracks.filter(t=>t.type=='recorder').forEach(t=>t.armRecorder());
		},

		record() {
			App.Mix.play();
			App.Mix.tracks.filter(t=>t.armed).forEach(t=>t.record());
		}
	},

	onload: function() {
	},

	oninit: function() {
	},

	_eventLoad: function(t) {
		console.log("a track loaded: ", t.info.name);
		var ready=0;
		App.Mix.tracks.forEach(t=> ready+= t.isReady() ? 1 : 0);

		if(ready == App.Mix.tracks.length) {
			console.log("All tracks loaded and ready");
			App.onload();
		}
	},

	init: function() {
		var me = this;

		window.onload = function () {
			try {
				window.AudioContext = window.AudioContext || window.webkitAudioContext  || window.mozAudioContext || window.msAudioContext;
				navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
				window.URL = window.URL || window.webkitURL || window.mozURL  || window.msURL;
				me.context = new window.AudioContext();
				me.context.createGain = me.context.createGain || me.context.createGainNode;
			} catch (e) {
				window.alert('Your browser does not support WebAudio, try Google Chrome');
			}

			// load config
			jQuery.getJSON( "tracks.json", function( data ) {
				console.log("track Config loaded: ", data);
				if(data.title)
					$('#title').html(data.title);
				if(data.name)
					this.recorderName=data.name;
				if(data.tracks) {
					App.Mix.merger = me.context.createChannelMerger(data.tracks.length);
					data.tracks.forEach(e => App.Mix.tracks.push(new Track(e, me.context, App.Mix.merger, App._eventLoad)));
					App.Mix.merger.connect(me.context.destination);
				}
				App.oninit();
			}).fail(function(e){console.log("ERROR",e);alert("failed to load tracks")});
		}
	}, // end init
};

App.init();
