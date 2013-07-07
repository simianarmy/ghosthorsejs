/**
 * HTTP static file server, websockets 
 */

var http = require('http'),
    sys = require('sys'),
    path = require('path'),
    nodeStatic = require('node-static'),
    faye = require('faye/node/faye-node'),
    url = require('url'),
    twitterClient = require('./TwitterClient'),
    text2Audio = require('./Text2Audio');

var HORSEJS_HANDLE = 'horse_js';
var TWEETS_CHECK_INTERVAL = 30000;

function GhostHorse (opts) {
    if (! (this instanceof GhostHorse)) {
        return new GhostHorse(opts);
    }
    this.settings = {
        port: opts.port,
        audioHost: opts.audioHost
    };
    this.init(); 
}

GhostHorse.prototype.init = function () {
    var self = this;

    self.bayeux = self.createBayeuxServer();
    self.httpServer = self.createHTTPServer();

    self.bayeux.attach(self.httpServer);
    self.httpServer.listen(self.settings.port);

    self.twitter = self.createTwitterClient();
    self.startTwitterReader();

    self.converter = self.createTextConverter();
    self.tweetsConverted = [];

    sys.log('Server started on PORT ' + self.settings.port);
};

GhostHorse.prototype.createHTTPServer = function () {
    var self = this;

    var httpServer = http.createServer(function (request, response) {
        var file = new(nodeStatic.Server)('./public', {
            cache: false
        });

        request.addListener('end', function () {
            var location = url.parse(request.url, true),
                params = (location.query || request.headers);

            // route messages to appropriate handlers 
            if (location.pathname == '/horsemouth') {
                response.write('OK');
                response.end();
            } else if (location.pathname == '/horseass') {
            }
            //
            // Serve files!
            //
            file.serve(request, response);
        });
    });
    return httpServer; 
};

GhostHorse.prototype.createBayeuxServer = function () {
    var self = this;

    var bayeux = new faye.NodeAdapter({
        mount: '/faye',
        timeout: 45
    });
    bayeux.bind('subscribe', function (clientId, channel) {
        sys.log('client ' + clientId + ' subscribed to ' + channel);
    });
    return bayeux;
};

GhostHorse.prototype.createTwitterClient = function () {
    var self = this;
    var twitter = new twitterClient();

    twitter.createClient('./TwitterConfig', function (err) {
        if (err) {
            throw new Error('Unable to create twitter client: ' + err);
        }
        sys.log('Twitter client initialized');

        // start following the horse!
        twitter.trackUser(HORSEJS_HANDLE);
    });
    return twitter;
};

GhostHorse.prototype.createTextConverter = function () {
    var self = this,
        converter = new text2Audio({
            onComplete: self.onTextConverted.bind(self),
            audioDir: path.join(process.cwd(), 'public', 'audio')
        });

    return converter;
};

GhostHorse.prototype.onTextConverted = function (tweets) {
    var self = this;

    // format audio path for clients
    var converted = tweets.filter(function (t) {
        return typeof t.audioFile !== 'undefined';
    });
    this.publishTweets(tweets.map(function (t) {
        t.audioFile = self.settings.audioHost + path.join('/audio', path.basename(t.audioFile));
        return t;
    }));
};

GhostHorse.prototype.startTwitterReader = function () {
    var self = this;

    // Begin tweet read / publish cycle
    self.getTweets({user: HORSEJS_HANDLE}, function (response) {
        console.log('getTweets: ', response);

        if (response.length > 0) {
            self.convertTweetsToAudio(response);
        }
        // Start over after some interval
        setTimeout(self.startTwitterReader.bind(self), TWEETS_CHECK_INTERVAL);
    });
};

GhostHorse.prototype.getTweets = function (opts, callback) {
    var self = this,
        tweets = self.twitter ? self.twitter.getTweets() : [];

    callback(this.formatTweets(tweets));
};

/**
 * Formats raw tweets into more condense blob
 * @param {Array} raw
 * @return {Array}
 */
GhostHorse.prototype.formatTweets = function (raw) {
    return raw.map(function (t) {
        return {
            id: t.id,
           created: t.created_at,
           name: t.user.name,
           handle: t.user.screen_name,
           text: t.text,
           source: t.source
        };
    });
};

/**
 * Publishes tweets with audio to the clients
 * @param {Array} data
 */
GhostHorse.prototype.publishTweets = function (data) {
    var self = this;

    console.log('*** publishing tweets');
    this.bayeux.getClient().publish('/horsemouth', {
        tweets: data
    });
};

GhostHorse.prototype.convertTweetsToAudio = function (tweets) {
    var self = this;

    // First filter out already processed tweets then send formatted list to
    // converted
    this.converter.convertBulk(tweets.filter(function (t) {
        return !self.tweetsConverted[t.id];
    }).map(function (t) {
        t.filePrefix = t.id;
        return t;
    }));
};


module.exports = GhostHorse;
