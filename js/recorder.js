(function(window){

  var WORKER_PATH = 'js/recorderWorker.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 8192; //4096
    var numChannels = config.numChannels || 2;
    this.context = source.context;
	console.log("Recorder init. bufferLen=", bufferLen);  
    this.node = (this.context.createScriptProcessor ||
                 this.context.createJavaScriptNode).call(this.context,
                 bufferLen, numChannels, numChannels);
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: numChannels
      }
    });
    var recording = false,
      currCallback,
	  startTime=0;

    this.node.onaudioprocess = function(e){
		//console.log("onaudioprocess", this.context.currentTime, e);
      if (!recording) return;
	  if(!startTime) {
		  var currentTime=this.context.currentTime;
		  var bufferOffset=e.playbackTime-currentTime;
		  startTime=currentTime-bufferOffset;
		  console.log("onaudioprocess currentTime=", currentTime, "playbackTime=", e.playbackTime, "startTime=", startTime);
	  }
      var buffer = [];
      for (var channel = 0; channel < numChannels; channel++){
          buffer.push(e.inputBuffer.getChannelData(channel));
      }
      worker.postMessage({
        command: 'record',
        buffer: buffer
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.getBufferLen = function() {
		return bufferLen;
	}

	this.getStartTime = function() {
		return startTime;
	}

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
	  this.startTime=null;	
      worker.postMessage({ command: 'clear' });
    }
    
    this.setLength = function(max) {
      worker.postMessage({ command: 'setLength', max: max })
    }

    this.getBuffer = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffer' })
    }

    this.exportWAV = function(cb, type, before, after){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        before: before,
        after: after
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);    //this should not be necessary
  };

  Recorder.forceDownload = function(blob, filename){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
  }

  window.Recorder = Recorder;

})(window);
