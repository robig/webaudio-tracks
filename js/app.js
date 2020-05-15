//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording
var recording=false;
var playing=false;
var playingSync=false;
var recorderName='vocal';
var uploadDirectly=true;

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");
var playButton = document.getElementById("playButton");
var playSyncButton = document.getElementById("playSyncButton");

//add events to those buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);
playSyncButton.addEventListener("click", playSync);

var sample = null;
var buffer = null;
var audioMerger = null;
playButton.addEventListener("click", playTake);

// load config
jQuery.getJSON( "config.json", function( data ) {
	console.log(data);
	if(data.title)
		$('#title').html(data.title);
	if(data.name)
		recorderName=data.name;
	if(data.take) {
		$('#filename').html(data.take);
		module.load(data.take, function(buf) {
			backing = buf;

			playButton.removeAttribute('disabled');
			playButton.innerHTML = 'Play';
			recordButton.disabled = false;
		});
	}
}
);



$(window).keypress(function (e) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    // ' ' is standard, 'Spacebar' was used by IE9 and Firefox < 37
    e.preventDefault()
    console.log('Space pressed');
	if(!playing)  playTake();
	else stopRecording();
  }
})
function startRecording() {
	console.log("recordButton clicked");
	playTake();
 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	recording=true;
	recordButton.disabled = true;
	stopButton.disabled = true;
	pauseButton.disabled = true
	playButton.disabled = true;
            
	vocals = null;
	module.sync('record', backingInstance, null, function(ret) {
		console.log("Sync recording started:", ret);
		document.getElementById("formats").innerHTML="Recording: 1 channel pcm @ "+ret.sampleRate/1000+"kHz"
		recordButton.disabled = true;
		stopButton.disabled = false;
		//pauseButton.disabled = false
		playButton.disabled = true;
	});

}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		if(rec && recording) rec.stop();
		sample.pause();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		if(rec && recording) rec.record()
		sample.play();
		pauseButton.innerHTML="Pause";
	}
}

function stopRecording() {
	console.log("stopButton clicked");
    module.stop(backingInstance);
	playing=false;

	//disable the stop button, enable the record too allow for new recordings
	stopButton.disabled = true;
	recordButton.disabled = false;
	pauseButton.disabled = true;
	playButton.disabled = false;
	playSyncButton.disabled=false;

	//reset button just in case the recording is stopped while paused
	pauseButton.innerHTML="Pause";

	if(!recording) return;
	//tell the recorder to stop the recording
	recording=false;
	module.recordStop(function(buffers) {
		// calculate filled version for looping playback
		vocalsBuffers = buffers;
		vocalsRecording = module.createBuffer(vocalsBuffers, 2);
		vocalsOffset = module.getOffset(vocalsRecording, backingOriginal, offset);
		vocals = module.offsetBuffer(vocalsBuffers, vocalsOffset.before, vocalsOffset.after);

		document.getElementById("formats").innerHTML="Recording stopped. "+vocals.duration;
		module.recorder.exportWAV(createDownloadLink);
	});

	//stop microphone access
	//gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	//rec.exportWAV(createDownloadLink);
	
}

function playTake() {
	playing=true;
	backingInstance = module.play(backing);
	backingOriginal = backingInstance;

	stopButton.disabled=false;
	playButton.disabled=true;
	recordButton.disabled=true;
}

function playSync() {
	playingSync=true;	
	module.sync('play', backingInstance, vocals, function (data) {
		vocalsInstance = data;
	});
}

var debug=null;
function createDownloadLink(blob) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString()+"_"+recorderName+".wav";

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//save to disk link
	link.href = url;
	link.download = filename; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Download";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		upload(blob, filename);
	});
	if(uploadDirectly)
		upload(blob, filename);
	else {
		li.appendChild(document.createTextNode (" "))//add a space in between
		li.appendChild(upload)//add the upload link to li
	}
	

	var del = document.createElement("a");
	del.href="#";
	del.innerHTML="Löschen";
	del.addEventListener("click", function(event){
		$(event.srcElement).closest('li').remove();
	});
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(del);

	var play = document.createElement("a");
	play.href="#";
	play.innerHTML="Play L/R";
	play.addEventListener("click", function(event){
		if(recording || playing) stopRecording();
		merge(); return;
		var li=$(event.srcElement).closest('li');
		var pl=$(li).find('audio')[0];
		//merge(pl); return;
		console.log(pl);
		sample.currentTime=0;
		pl.currentTime=0;
		sample.play();
		pl.volume=0;
		pl.play();
		stopButton.disabled=false;
    	recordButton.disabled = true;
		playButton.disabled=true;
		setTimeout(function() {
			pl.currentTime=sample.currentTime;
			pl.volume=1;
		},250);
	});
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(play);

	//add the li element to the ol
	recordingsList.appendChild(li);
}

function upload(blob, filename) {
	var xhr=new XMLHttpRequest();
	xhr.onload=function(e) {
	  console.log("Server returned: ",e.target.responseText);
	  if(this.statue!== 200) {
		  error_message("Upload Fehler! Server returned: ",e.target.responseText);
	  }
	  else {
		  $(upload).hide();
		ok_message("Upload erfolgreich");
	  }
	};
	var fd=new FormData();
	fd.append("audio_data",blob, filename);
	xhr.open("POST","upload.php",true);
	xhr.send(fd);
}

function changeVolume(el) {
  var volume = element.value;
  var fraction = parseInt(element.value) / parseInt(element.max);
  // Let's use an x*x curve (x-squared) since simple linear (x) does not
  // sound as good.
  module.gainNode.gain.value = fraction * fraction;
}

function ok_message(txt) {
	$('#formats').innerText=txt;
}
function error_message(txt) {
	$('#formats').innerText=txt;
}
