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
            // Ready to use; soundManager.createSound() etc. can now be called.
            soundManager.createSound({url: '/audio/649282_SOUNDDOGS__an.mp3'}).play();
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
    var self = this,
        urls = data.map(function (t) {
            return t.audioFile;
        });

    // Use this for html5 audio coolness.
    //(new BufferLoader(this._audioContext, urls, this._onAudioLoaded.bind(this))).load();
   
    // Traditional html5 audio used here
    data.forEach(function (t) {
        var node = $('#litemplate').clone();
        $('a.horse', node).data('id', t.id);
        $('p.quote', node).text(t.text.split(' ')[0]);
        // only show first word? 
        $('#audio').prepend(node);
        self._processed[t.id] = t;
    });
};

GhostHorseClient.prototype._createEventHandlers = function () {
    var self = this;

    jQuery('ul#audio').on('click', 'a.horse', function (el) {
        var el = $(el.currentTarget),
            tid = el.data('id'),
            t = self._processed[tid];

        console.log('tweet ', t);
        soundManager.createSound({
            id: tid,
            url: t.audioFile,
            onfinish: function () {
                // display full text
                $('p.quote', el.parent()).text(t.text).show();
            }
        }).play();
    });
};

GhostHorseClient.prototype._onAudioLoaded = function (bufferList) {
    var self = this;

    // We have multiple audio buffers... 
    bufferList.forEach(function (buffer) {
        var source = self._audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(self._audioContext.destination);
        source.start(0);
    });
};

var ghClient;

jQuery(function () {
   ghClient = new GhostHorseClient();
});
