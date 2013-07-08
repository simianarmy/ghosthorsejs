function GhostHorseClient () {
    if (! (this instanceof GhostHorseClient)) {
        return new GhostHorseClient(arguments);
    }
    var self = this;

    this._processed = {};
    this._audioContext;

    this.init = function (settings) {
        self.setupBayeuxHandlers(settings);

        try {
            // Fix up for prefixing
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            self._audioContext = new AudioContext();
        }
        catch (e) {
            alert('Web Audio API is not supported in this browser');
        }
    };

    this.setupBayeuxHandlers = function (settings) {     
        // Node server is on the same host:port
        var host = settings.host + ':' + settings.port;

        self.client = new Faye.Client(host + '/faye', {
            timeout: 120
        });

        // Subscribe to new data events
        self.client.subscribe('/horsemouth', self._processHorseMessage.bind(self));

        // self.client.subscribe('/horsemauger', function () {});
    }
    this._createEventHandlers();

    soundManager.setup({
        url: '/swf',
        flashVersion: 9, // optional: shiny features (default = 8)
        // optional: ignore Flash where possible, use 100% HTML5 mode
        // preferFlash: false,
        onready: function() {
            console.log(')<>( audio ready!');
            // Ready to use; soundManager.createSound() etc. can now be called.
        }
    });
    jQuery.getJSON('/config.json', function(data) {
        self.init(data);
    });
}

/**
 * Handles incoming horsemouth data
 */
GhostHorseClient.prototype._processHorseMessage = function (message) {
    var data, i,
        self = this,
        toProcess = [];

    // get list of unprocessed tweets
    if (message && message.tweets) {
        toProcess = message.tweets.filter(function (t) {
            return !self._processed[t.id] && t.audioFile;
        });
        if (toProcess.length > 0) {
            this._processTweets(toProcess);
        }
    }
};

GhostHorseClient.prototype._processTweets = function (data) {
    var self = this;

    // Use this for html5 audio coolness.  until then we can just use Audio
    //(new BufferLoader(this._audioContext, urls, this._onAudioLoaded.bind(this))).load();
    data.forEach(function (t) {
        console.log('playing audio ' + t.audioFile);
        // only show first word haha!
        $('#audio').append('<li><a class="horse" data-id="' + t.id + '" href="javascript:void(0);"><img src="/images/horse-js.png" width="250" height="250" /></a></li>');
        self._processed[t.id] = t;
    });
};

GhostHorseClient.prototype._createEventHandlers = function () {
    var self = this;

    jQuery('ul#audio').on('click', 'a.horse', function (el) {
        var tid = $(el.currentTarget).data('id'),
            t = self._processed[tid];

        console.log('tweet ', t);
        var mySound = soundManager.createSound({
            id: tid,
            url: t.audioFile
        });
        mySound.play();
    });
};

GhostHorseClient.prototype._onAudioLoaded = function (bufferList) {
    // We have multiple audio buffers...play one at a time?
    var source = context.createBufferSource();
    source.buffer = bufferList[0]; 
    source.connect(this._audioContext.destination);
    source.start(0);
};

var ghClient;

jQuery(function () {
   ghClient = new GhostHorseClient();
});
