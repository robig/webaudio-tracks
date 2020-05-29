var trackTemplate = $('#track_tpl')[0];

App.oninit=function() {
	var tracks=document.getElementById('tracks');
	App.Mix.tracks.forEach(function(t) {
		var clon = trackTemplate.content.cloneNode(true);
		clon.querySelector(".name").innerText=t.info.name;
		clon.querySelector(".meter").innerText="Loading...";
		
		function track_arm() {
			var me=this;
			t.toggleArm(function() {
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
		
		var mon = clon.querySelector(".monitor");
		if(t.recordMonitoring) $(mon).addClass('active');
		mon.addEventListener("click", function() { 
			var val=t.toggleRecordMonitoring();
			if(val) $(mon).addClass('active');
			else $(mon).removeClass('active');
		});

		tracks.appendChild(clon);
		t.ui=tracks.children[tracks.children.length - 1];
		$(t.ui).addClass(t.type);

		t.onrecord=recordingdone;

		if(t.type=='recorder' && App.config.autoArm==true)
		{
			track_arm();
		}
	});

	var master = document.getElementById('master');
	var t = App.Mix.master;
	var clon = trackTemplate.content.cloneNode(true);
	clon.querySelector(".name").innerText=t.info.name;
	var vol=clon.querySelector(".volume");
	vol.addEventListener("change", function() {t.changeVolume(this);});
	clon.querySelector(".mute").addEventListener("click", function() { t.mute(); vol.value=t.getVolume()*100;});
	master.appendChild(clon);
	t.ui=master.children[0];
	$(t.ui).addClass(t.type);
	var meter = t.ui.querySelector(".meter");
	meter.innerText="";
	t.createMeter(meter);


	// can edit track name
	$('.track.recorder .name').dblclick(function(e) {
		e.stopPropagation();
		var currentEle = $(this);
		var value = $(this).html();
		currentEle.attr("editting", "true");

		$(currentEle).html('<input class="thVal" type="text" value="' + value + '" />');
		$(".thVal").focus();
		$(".thVal").keyup(function (event) {
			if (event.keyCode == 13) {
				var newvalue=$(".thVal").val().trim();
				console.log("new track name:", newvalue);
				$(currentEle).html(newvalue);
			}
		});

		$(document).click(function () { // you can use $('html')
			if($(currentEle).attr("editing")=="true")
				$(currentEle).html($(".thVal").val().trim());
		});
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
		console.log("mixapp.onload", t.info.name);
		var meter = t.ui.querySelector(".meter");
		meter.innerText="";
		t.createMeter(meter);
	});
	
	playButton.disabled=false;
	playButton.innerHTML = 'Play';
	recordButton.disabled = false;

	var recOff = document.getElementById("rec_offset")
	var recOffVal = document.getElementById("rec_offset_value")
	new Binding({
		object: App.config,
		property: "recordOffset"
	})
	.addBinding(recOff, "value", "change")
	.addBinding(recOffVal, "innerHTML");

	new Binding({
		object: App.config,
		property: "playbackOffset"
	})
	.addBinding(document.getElementById("play_offset"), "value", "change")
	.addBinding(document.getElementById("play_offset_value"), "innerHTML");
};

// because of chrome we need a click first
$('#Start').click(function(){
	$('#Welcome').hide(100);
	$('#App').show(200);
	App.init();
});

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
	var filename = new Date().toISOString()+"_"+recorderName;

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
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

// Register global keyboard shortcuts:
$(window).keypress(function (e) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    // ' ' is standard, 'Spacebar' was used by IE9 and Firefox < 37
    e.preventDefault()
    console.log('Space pressed');
	if(!App.Mix.isPlaying()) {
		playPressed();
	} else stopPressed();
  }
})


$("#roundslider1").roundSlider({
	radius: 80,
    circleShape: "half-top",
    sliderType: "min-range",
    showTooltip: true,
    value: 0,
	min: -50,
	max: 50,
	update: function(ev) {
		var val=ev.value/100;
		console.log("Pan", val);
		App.Mix.tracks[0].setPan(val);
	}
});
