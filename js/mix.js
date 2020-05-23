var App = {
	Mix: {
		tracks: [],

		play() {
			App.Mix.playing=true;
			// queues a timed playback start
			var offset = (App.config.playbackOffset || 150) / 1000;
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
			App.Mix.tracks.filter(t=>!t.armed).forEach(t=>t.play(startTime));
			
			setTimeout(function() {
				App.Mix.tracks.filter(t=>t.armed).forEach(t=>t.record(startTime));
			}, offset*1000);
		},

		armedTracks() {
			return App.Mix.tracks.filter(t=>t.armed);
		},

		recorderTracks() {
			return App.Mix.tracks.filter(t=>t.type=='recorder');
		},

		playing: false,

		isPlaying() {
			return App.Mix.playing;
		},

		loadTake(blob, filename) {
			var t=recorderTracks()[0];

		},

		createMeter(elem) {
			var x = webAudioPeakMeter();
			var meterNode = x.createMeterNode(App.Mix.merger, App.context);
			x.createMeter(elem, meterNode, {});
		}

	},

	getConfig: function(key) {
		if(!App.config || !App.config[key]) return null;
		return App.config[key];
	},

	beforeConfig: function() {},

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

			try {
				window.AudioContext = window.AudioContext || window.webkitAudioContext  || window.mozAudioContext || window.msAudioContext;
				navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
				window.URL = window.URL || window.webkitURL || window.mozURL  || window.msURL;
				me.context = new window.AudioContext();
				me.context.createGain = me.context.createGain || me.context.createGainNode;
				me.context.onstatechange=function() {console.log("AudioContext.stateChange",me.context.state);}
			} catch (e) {
				window.alert('Your browser does not support WebAudio, try Google Chrome');
			}

			// load config
			jQuery.getJSON( "tracks.json?now="+Date.now(), function( data ) {
				console.log("track Config loaded: ", data);
				// initialize config
				App.config = data.config || {};

				if(data.title)
					$('#title').html(data.title);
				if(data.name)
					this.recorderName=data.name;
				if(data.tracks) {
					var enabledTracks= data.tracks.filter(t=>t.enabled!==false);
					var destination = me.context.destination;
					App.Mix.merger = me.context.createChannelMerger(enabledTracks.length);
					enabledTracks.forEach(e => App.Mix.tracks.push(new Track(e, me.context, App.Mix.merger, App._eventLoad)));
					App.Mix.merger.connect(destination);
				}
				App.oninit();
			}).fail(function(e){console.log("ERROR",e);alert("failed to load tracks")});
	}, // end init
};

//App.init();
