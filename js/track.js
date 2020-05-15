class Track {
	constructor(data, audioContext, connector, loadcallback) {
		this.isPlaying=false;
		this.audioLoaded=false;
		this.ready=false;
		this.armed=false;
		this.recording=false;
		this.recordMoritoring=true;
		this.recorder=null;
		this.offset=0;
		this.startedAt=0;
		this.muteVol=1;

		this.info=data;
		this.config=data.config || {};

		this.context=audioContext;
		this.gainNode = this.context.createGain();
		this.destination=connector;
		
		/*this.source = this.context.createBufferSource();
		//this.source.buffer = this.buffer;
		// Connect source to a gain node
		this.source.connect(this.gainNode);
		// Connect gain node to destination
		if(this.destination) this.gainNode.connect(this.destination);*/

		// Start playback in a loop
		//this.source.loop = this.info.loop ? true : false;

		if(this.info.src) {
			this.load(this.info.src, loadcallback);
			this.type="audio";
		}
		else
		{
			this.ready=true;
			this.type="recorder";
		}
	}

	load(url, callback) {
		console.log('Track.load', url);
		var me = this;
		if (this.request) {
			this.request.abort();
		} else {
			this.request = new XMLHttpRequest();
		}
		this.request.open('GET', url, true);
		this.request.responseType = 'arraybuffer';
		this.request.onload = function () {
			console.log('Track.load.complete');
			me.context.decodeAudioData(me.request.response, function (buffer) {
				me.buffer = buffer;
				//me.source.buffer=buffer;
				me.audioLoaded=true;
				me.ready=true;
				if(callback) callback(me);
			});
		};
		this.request.send();
	}

	isReady() {
		return this.ready;
	}

	setLoop(l) {
		this.soucrce.loop=l;
	}

	setVolume(vol) {
		this.gainNode.gain.value=vol;
	}

	getVolume() {
		return this.gainNode.gain.value;
	}

	play(startTime) {
		if(this.armed || !this.audioLoaded) return;

		this.source = this.context.createBufferSource();
		this.source.buffer = this.buffer;

		// Connect source to a gain node
		this.source.connect(this.gainNode);
		// Connect gain node to destination
		if(this.destination) this.gainNode.connect(this.destination);
		
		// Start playback in a loop
		this.source.loop = this.info.loop ? true : false;

		if(startTime===null) startTime=this.context.currentTime;
		this.startedAt=startTime;
		//this.source[this.source.start ? 'start' : 'noteOn'](0);
		this.source.start(startTime);
		this.isPlaying = true;
	}

	changeVolume(element) {
	  var volume = element.value;
	  var fraction = parseInt(element.value) / parseInt(element.max);
	  // Let's use an x*x curve (x-squared) since simple linear (x) does not
	  // sound as good.
	    console.log("track.volume", fraction*fraction);
	    this.gainNode.gain.value = fraction * fraction;
	}

	stop() {
		if(this.recording) this.recordStop();
		else if(this.audioLoaded && this.source) {
			this.source[this.source.stop ? 'stop' : 'noteOff'](0);
			this.isPlaying = false;
		}
	}

	toggle() {
	  if(this.isPlaying || this.recording) this.stop(); else this.play();
	}

	mute() {
		var vol=this.getVolume();
		if(vol>0) {
			this.muteVol=vol; //remember current volume
			this.gainNode.gain.value=0;
		}else{
			this.gainNode.gain.value=this.muteVol;
		}
	}

	createMeter(myMeterElement) {
		//var myMeterElement = document.getElementById('my-peak-meter');
		var x = webAudioPeakMeter();
		this.meterNode = x.createMeterNode(this.gainNode, this.context);
		x.createMeter(myMeterElement, this.meterNode, {});
	}

	createRecMeter(myMeterElement) {
		//var myMeterElement = document.getElementById('my-peak-meter');
		var x = webAudioPeakMeter();
		this.meterNode = x.createMeterNode(this.input, this.context);
		x.createMeter(myMeterElement, this.meterNode, {});
	}


	arm(callback) {
		if(this.armed) {
			this.armed=false;
			if(callback) callback(this);
			return;
		}
		this.armRecorder(callback);
	}

	armRecorder(callback) {
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		var me=this;
		if (navigator.getUserMedia) {
			navigator.getUserMedia({audio: true}, function (stream) {
				me.input = me.context.createMediaStreamSource(stream);
				me.input.connect(me.gainNode);
				// Connect gain node to destination
				if(me.recordMoritoring && me.destination) me.gainNode.connect(me.destination);
				else me.gainNode.disconnect();
				me.recorder = new Recorder(me.input);
				me.armed=true;
				console.log('track.armed');
				if(callback) callback(me);
			}, function (e) {
				window.alert('Please enable your microphone to begin recording');
			});
		} else {
			window.alert('Your browser does not support recording, try Google Chrome');
		}
	}
	
	/**
	 * @method record
	 */
	record(startTime) {
		if(!this.armed) return;
		console.log('track.record', this.context.currentTime);
		this.targetStartTime=startTime || this.context.currentTime;
		this.recorder.clear();
		this.recording=true;
		//quatsch this.recorder.startTime = this.context.currentTime;
		this.recorder.record();
		this.startedAt = this.recorder.startTime || this.context.currentTime;
		return {sampleRate: this.context.sampleRate, startTime: this.recorder.startTime};
	}
	/**
	 * @method recordStop
	 */
	recordStop(callback) {
		var me = this;
		console.log('track.recordStop', this.context.currentTime);
		this.recorder.stop();
		this.recorder.getBuffer(function (buffers) {
			me.buffer=me._createBuffer(buffers, 2);
			console.log("track.recording stopped", me.context.currentTime);
			me.recording=false;
			me.audioLoaded=true;
			me.recOffset = me._calcOffset(me.buffer, me.targetStartTime, me.config.recordOffset || 0);
			if(callback) callback(me);
			if(me.onrecord)me.onrecord(me);
		});
	}

	getDuration() {
		if(!this.buffer) return 0;
		return this.buffer.duration;
	}

	getPosition() {
		return this.context.currentTime - this.startedAt;
	}

	/**
	 * @method createBuffer
	 */
	_createBuffer (buffers, channelTotal) {
		var channel = 0,
			buffer = this.context.createBuffer(channelTotal, buffers[0].length, this.context.sampleRate);
		for (channel = 0; channel < channelTotal; channel += 1) {
			buffer.getChannelData(channel).set(buffers[channel]);
		}
		return buffer;
	}
	/**
	 * @method getOffset
	 */
	_calcOffset (recording, targetStartTime, offset) {
		if(!offset) offset=0;
		console.log("track.recorder.startTime:", this.recorder.getStartTime());
		console.log("track.recordOffset:", offset);
		console.log("track.targetStartTime:", targetStartTime);
		var diff = (this.recorder.getStartTime() + (offset / 1000)) - targetStartTime;
		console.log('track.getOffset', diff);
		/*return {
			before: Math.round((diff % backingInstance.buffer.duration) * this.context.sampleRate),
			after: Math.round((backingInstance.buffer.duration - ((diff + recording.duration) % backingInstance.buffer.duration)) * this.context.sampleRate)
		};*/
	}
	/**
	 * @method offsetBuffer
	 */
	offsetBuffer (vocalsBuffers, before, after) {
		console.log('player.offsetBuffer', vocalsBuffers, before, after);
		var i = 0,
			channel = 0,
			channelTotal = 2,
			num = 0,
			audioBuffer = this.context.createBuffer(channelTotal, before + vocalsBuffers[0].length + after, this.context.sampleRate),
			buffer = null;
		for (channel = 0; channel < channelTotal; channel += 1) {
			buffer = audioBuffer.getChannelData(channel);
			for (i = 0; i < before; i += 1) {
				buffer[num] = 0;
				num += 1;
			}
			for (i = 0; i < vocalsBuffers[channel].length; i += 1) {
				buffer[num] = vocalsBuffers[channel][i];
				num += 1;
			}
			for (i = 0; i < after; i += 1) {
				buffer[num] = 0;
				num += 1;
			}
		}
		return audioBuffer;
	}

	sync (action, target, param, callback) {
		var me = this,
			offset = (this.context.currentTime - target.startTime) % target.buffer.duration,
			time = target.buffer.duration - offset;
		console.log('player.sync', this.context.currentTime + time, action);
		if (this.syncTimer) {
			window.clearTimeout(this.syncTimer);
		}
		this.syncTimer = window.setTimeout(function () {
			var returned = me[action](param);
			if (callback) {
				callback(returned);
			}
		}, time * 1000);
	}

	// to become a callback
	onrecord() {}
}
