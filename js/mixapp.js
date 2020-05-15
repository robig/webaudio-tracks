var trackTemplate = $('#track_tpl')[0];

App.oninit=function() {
	var tracks=document.getElementById('tracks');
	App.Mix.tracks.forEach(function(t) {
		var clon = trackTemplate.content.cloneNode(true);
		clon.querySelector(".name").innerText=t.info.name;
		clon.querySelector(".meter").innerText="Loading...";
		function track_arm() {
			var me=this;
			t.arm(function() {
				if(t.armed) 
					$(t.ui).addClass("armed");
				else
					$(t.ui).removeClass("armed");
			} ); 
		};
		clon.querySelector(".arm").addEventListener("click", track_arm);
		var vol=clon.querySelector(".volume");
		vol.addEventListener("change", function() {t.changeVolume(this);});
		clon.querySelector(".mute").addEventListener("click", function() { t.mute(); vol.value=t.getVolume()*100;});
		tracks.appendChild(clon);
		t.ui=tracks.children[tracks.children.length - 1];
		$(t.ui).addClass(t.type);

		t.onrecord=recordingdone;

		if(t.type=='recorder' && App.config.autoArm==true)
		{
			track_arm();
		}
	});
};

// update some GUI elements every second
setInterval(function(){
	if(!App.Mix.isPlaying()) return;
	App.Mix.tracks.filter(t=>t.isPlaying).forEach(function(t) {
		t.ui.querySelector('.time').innerText=formatDuration(t.getPosition()) + " ("+ formatDuration(t.getDuration()) +")"; 
	});
}, 1000);
function formatDuration(time){var s=Math.floor(time); return(s-(s%=60))/60+(9<s?':':':0')+s}
function formatDuration2(dur) {
	var mins=Math.ceil(dur/60);
	var secs=Math.ceil(dur)-mins;
	return mins+":"+(secs<10 ? " "+secs : secs);
}

function recordingdone(t) {
	console.log("Recording finished", t.info.name);
	t.ui.querySelector('.time').innerText=t.getDuration()+"s";

	t.recorder.exportWAV(createDownloadLink);
}

App.onload=function() {
	App.Mix.tracks.forEach(function(t) {
		console.log("mixapp.onload", t.name);
		var meter = t.ui.querySelector(".meter");
		meter.innerText="";
		t.createMeter(meter);
	});
	
	playButton.disabled=false;
	playButton.innerHTML = 'Play';
	recordButton.disabled = false;
};


var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");
var playButton = document.getElementById("playButton");
var playSyncButton = document.getElementById("playSyncButton");

playButton.addEventListener("click", playPressed);
stopButton.addEventListener("click", stopPressed);
recordButton.addEventListener("click", recordPressed);

function playPressed() {
	App.Mix.play();
	stopButton.disabled=false;
	playButton.disabled=true;
	recordButton.disabled=true;
}

function stopPressed() {
	App.Mix.stop();

	stopButton.disabled = true;
	playButton.disabled = false;
	recordButton.disabled = false;
	pauseButton.disabled = true;
}

function recordPressed() {

	if(App.Mix.armedTracks().length == 0){
		if(App.config.autoArm)
			App.Mix.arm();
		else {
			showError("No tracks armed for recording");
			return;
		}
	}
	App.Mix.record();
	
	stopButton.disabled=false;
	playButton.disabled=true;
	recordButton.disabled=true;
}

function showError(message) {
	$('#error_message').text(message);
	$('#error_message').show(500);

	setTimeout(	function() { $('#error_message').hide(500); }, 5000);
}

function showOkMessage(message) {
	$('#ok_message').text(message);
	$('#ok_message').show(500);

	setTimeout(	function() { $('#ok_message').hide(500); }, 5000);
}

function upload(blob, filename, callback) {
	var xhr=new XMLHttpRequest();
	xhr.onload=function(e) {
	  console.log("Server returned: ",e.target.responseText);
	  if(this.status!== 200) {
		  showError("Upload Fehler! Server returned: ",e.target.responseText);
	  }
	  else {
		  if(callback) callback(filename);
		  showOkMessage("Upload erfolgreich");
	  }
	};
	var fd=new FormData();
	fd.append("audio_data", blob, filename);
	xhr.open("POST","upload.php",true);
	xhr.send(fd);
}
var debug=null;
function createDownloadLink(blob) {
	var uploadDirectly=true;
	var recorderName="test";

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
	var uploadEl = document.createElement('a');
	uploadEl.href="#";
	uploadEl.innerHTML = "Upload";
	uploadEl.addEventListener("click", function(event){
		upload(blob, filename, function() { $(upload).hide(); } );
	});
	if(uploadDirectly)
		upload(blob, filename);
	else {
		li.appendChild(document.createTextNode (" "))//add a space in between
		li.appendChild(uploadEl)//add the upload link to li
	}
	

	var del = document.createElement("a");
	del.href="#";
	del.innerHTML="Löschen";
	del.addEventListener("click", function(event){
		$(event.srcElement).closest('li').remove();
	});
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(del);

	debug = blob;
	var play = document.createElement("a");
	play.href="#";
	play.innerHTML="Load Take";
	play.addEventListener("click", function(event){
		if(stopButton.disabled==false) stopPressed();
		App.Mix.loadTake(blob, filename);
	});
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(play);

	//add the li element to the ol
	$('#recordingsList').append(li);
}

