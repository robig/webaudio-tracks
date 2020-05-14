var trackTemplate = $('#track_tpl')[0];

App.oninit=function() {
	var tracks=document.getElementById('tracks');
	App.Mix.tracks.forEach(function(t) {
		var clon = trackTemplate.content.cloneNode(true);
		clon.querySelector(".name").innerText=t.info.name;
		clon.querySelector(".meter").innerText="Loading...";
		clon.querySelector(".arm").addEventListener("click", function() { 
			var me=this; t.arm(function() { if(t.armed) $(me).addClass("armed"); $(me).removeClass("armed"); } ); 
		});
		var vol=clon.querySelector(".volume");
		vol.addEventListener("change", function() {t.changeVolume(this);});
		clon.querySelector(".mute").addEventListener("click", function() { t.mute(); vol.value=t.getVolume()*100;});
		tracks.appendChild(clon);
		t.ui=tracks.children[tracks.children.length - 1];
		$(t.ui).addClass(t.type);
	});
};

App.onload=function() {
	App.Mix.tracks.forEach(function(t) {
		console.log(t.ui);
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
var armButton = document.getElementById("armButton");

playButton.addEventListener("click", playPressed);
stopButton.addEventListener("click", stopPressed);
recordButton.addEventListener("click", recordPressed);
armButton.addEventListener("click", function() {
	App.Mix.arm();
});

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
	App.Mix.record();
	
	stopButton.disabled=false;
	playButton.disabled=true;
	recordButton.disabled=true;
}
