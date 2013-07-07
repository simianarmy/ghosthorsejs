function GhostHorseClient () {
    if (! (this instanceof GhostHorseClient)) {
        return new GhostHorseClient(arguments);
    }
    var self = this;

    this._processed = {};
    this._audioContext;

    this.init = function () {
        self.setupBayeuxHandlers();

        try {
            // Fix up for prefixing
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            self._audioContext = new AudioContext();
        }
        catch (e) {
            alert('Web Audio API is not supported in this browser');
        }
    };

    this.setupBayeuxHandlers = function () {
        // Node server is on the same host:port
        self.client = new Faye.Client('/faye', {
            timeout: 120
        });

        // Subscribe to new data events
        self.client.subscribe('/horsemouth', self._processHorseMessage.bind(self));

        // self.client.subscribe('/horsemauger', function () {});
    };
    this.init();
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
        $('#audio').append('<li><a href="' + t.audioFile + '" target="_new">' + t.text.split(' ')[0] + '</a></li>');
        self._processed[t.id] = true;
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

$(document).ready(function() {
   ghClient = new GhostHorseClient();
});
