var App = {
	Mix: {
		tracks: [],

		play() {
			App.Mix.playing=true;
			// queues a timed playback start
			var offset = (App.playbackOffset || 150) / 1000;
			var context = App.Mix.tracks[0].context;
			console.log("Que playback start at: +", offset);
			App.Mix.tracks.forEach(t=>t.play(context.currentTime + offset));
		},

		pause() {
			App.Mix.playing=false;
			App.Mix.tracks.forEach(t=>t.pause());
		},

		stop() {
			App.Mix.playing=false;
			App.Mix.tracks.forEach(t=>t.stop());
		},

		arm() {
			App.Mix.tracks.filter(t=>t.type=='recorder').forEach(t=>t.armRecorder());
		},

		record() {
			//App.Mix.play();
			//App.Mix.tracks.filter(t=>t.armed).forEach(t=>t.record());
			App.Mix.playing=true;
			// queues a timed playback start
			var offset = (App.config.playbackOffset || 150) / 1000;
			var context = App.Mix.tracks[0].context;
			var startTime = context.currentTime + offset;
			console.log("Que playback start at: +", offset, startTime);
			App.Mix.tracks.forEach(t=>t.play(startTime));
			App.Mix.tracks.filter(t=>t.armed).forEach(t=>t.record(startTime));
		},

		armedTracks() {
			return App.Mix.tracks.filter(t=>t.armed);
		},

		playing: false,

		isPlaying() {
			return App.Mix.playing;
		}
	},

	getConfig: function(key) {
		if(!App.config || !App.config[key]) return null;
		return App.config[key];
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
				App.config=data.config || {};
				if(data.title)
					$('#title').html(data.title);
				if(data.name)
					this.recorderName=data.name;
				if(data.tracks) {
					App.Mix.merger = me.context.createChannelMerger(data.tracks.length);
					data.tracks.filter(t=>t.enabled!==false).forEach(e => App.Mix.tracks.push(new Track(e, me.context, App.Mix.merger, App._eventLoad)));
					App.Mix.merger.connect(me.context.destination);
				}
				App.oninit();
			}).fail(function(e){console.log("ERROR",e);alert("failed to load tracks")});
		}
	}, // end init
};

App.init();
