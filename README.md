# webaudio-tracks

Music collaboration software in your browser using webaudio including multi-track synced audio playback and recording.


## Usage

Clone repository to your web space and open track.html in the browser.

## Configuration

Edit the `tracks.json` to provide information about tracks and audio files to load.

Example:
```
{
	"title": "2 Synced tracks at 90bpm",
	"tracks": [
		{ "src": "click_90bpm.mp3","name": "Click Test 90bpm", "loop": true, "enabled": true },
		{ "src": "tamborine_90bpm.mp3","name": "Test 90bpm", "loop": true, "enabled": true },
		{ "name": "Record here", "monitoring": false, "config": {"offset": -81} }
	],
	"config": { 
		"playbackOffset": 355,
		"recordOffset": 355,
		"adjustPlaybackOffset": true,
		"autoArm": false,
		"showMasterTrack": true,
		"enablePan": true,
		"enableTrackNaming": true
	}
}
```

*Explanation:*
* `title` defines the session title
* in `tracks` you have to setup each track:
    * `name` the name of the track
    * `src` defines the track audio source, will also used to decide if this track is able to record
*** all tracks without `src` will become recorder-tracks.
    * `loop` enables track looping
    * `enable` disabled tracks (`"enable": false`) will be ignored and hidden
    * for recorder tracks you can also define:
        * `monitoring` enables input monitoring. (!) Caution! you can easily create feedback on laptops when not using headphones!
        * `config.offset` currently this is the way to setup a fixed playback offset
* the fowwowing `config` options can be used:
    * `playbackOffset` to enable synced playback you have to set an offset >=0 (in ms)
    * `recordOffset` can be tweeked to fix issues with buffering
    * `autoArm` can be enabled to automatially arm a all recorder - tracks on project load
    * `showMasterTrack` should the master-track be shown?
    * `enablePan` show pan slider? Note: panning is not supported in iOS
    * `enableTrackNaming` when enabled a double-click on a recorder-track name can be used to change the name

## Customization

Edit the `track.html` (or create an own file) to change basic layout. All styles are in `style.css`.


Have fun making music!

