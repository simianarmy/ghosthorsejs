// EDIT THIS FOR DEVELOPMENT...SORRY!
//
var CONFIG_URL = 'http://horsejs.com:8000/config.json?callback=?';

function GhostHorseClient () {
    if (! (this instanceof GhostHorseClient)) {
        return new GhostHorseClient(arguments);
    }
    var self = this;

    this._processed = {};
    this._audioContext;
    this._tweetCount = 0;

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
        preferFlash: false,
        onready: function() {
            // Ready to use; soundManager.createSound() etc. can now be called.
            soundManager.createSound({url: '/audio/649282_SOUNDDOGS__an.mp3'}).play();
        }
    });
    jQuery.ajax({url: CONFIG_URL, 
        dataType: 'jsonp',
        jsonpCallback: 'parseConfig',
        contentType: "application/json",
        success: self.init,
        error: function (data) {
            console.error(data);
        }
    });
}

function parseConfig (data) {
    console.log('jsonp data', data);
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
        var degrees = (self._tweetCount++ * 20) % 360;
        $('a.horse', node).data('id', t.id);
        $('p.quote', node).text(t.text.split(' ')[0]);
        node.css('-webkit-filter', 'hue-rotate(' + degrees + 'deg)');
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
            t = self._processed[tid],
            sid = String(tid),
            sound;

        if (typeof t !== 'undefined') {
            console.log('tweet ', t);
            sound = soundManager.createSound({
                id: sid,
                url: t.audioFile,
                onload: function () {
                    self._displaySpokenText(el, t.text, this.duration || this.durationEstimate);
                },
                onplay: function () {
                    $('img', el.parent()).addClass('speaking');
                },
                onfinish: function () {
                    $('img', el.parent()).removeClass('speaking');
                }
            });
            // This doesn't work!
            /*
            soundManager.onPosition(sid, 1000, function (eventPosition) {
                console.log(this.id+' reached '+eventPosition);
            });
            */
            sound.play();
        }
    });
};

GhostHorseClient.prototype._displaySpokenText = function (el, tweet, duration) {
    var textEl = $('p.quote', el.parent()),
        words = tweet.split(' '),
        numWords = Math.max(words.length, 1),
        frequency = duration / (numWords + 1),
        count = 1;
    
    setTimeout(function foo () {
        textEl.text(words.slice(0, count).join(' '));
        if (count++ < numWords) {
            setTimeout(foo, frequency);
        }
    }, frequency);
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

jQuery(function () {
   new GhostHorseClient();
});
