/**
 * HTTP static file server, websockets 
 */
var http = require('http'),
    sys = require('sys'),
    path = require('path'),
    url = require('url'),
    util = require('util'),
    nodeStatic = require('node-static/lib/node-static'),
    twitterClient = require('./TwitterClient'),
    text2Audio = require('./Text2Audio'),
    dataStore = require('./datastore');

var HORSEJS_HANDLE = 'horse_js';
var TWEETS_CHECK_INTERVAL = 60 * 1000; // 1 minute

function GhostHorse (opts) {
    if (! (this instanceof GhostHorse)) {
        return new GhostHorse(opts);
    }
    this.settings = opts;
    this.init(); 
    this._recentTweets = [];
}

GhostHorse.prototype.init = function () {
    var self = this;

    self.configs = self.readConfigs();

    self.httpServer = self.createHTTPServer();
    self.httpServer.listen(self.settings.nodePort);

    self.twitter = self.createTwitterClient();
    self.startTwitterReader();

    self.converter = self.createTextConverter();
    self.tweetsConverted = [];

    self.dataStore = self.getDataStore();

    sys.log('Server started on PORT ' + self.settings.nodePort);
};

// Read in configuration values from private config file
GhostHorse.prototype.readConfigs = function () {
    var conf;

    // get settings from config file
    try {
        conf = require('./AppConfig');
    } catch (e) {
        throw new Error('Unable to parse configuration file.  Make sure one exists in the lib/ directory named config.js');
    }
    if (typeof conf === 'undefined') {
        throw new Error('Failed to parse config object!');
    }
    //sys.log('read config values ' + util.inspect(conf));
    return conf;
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

        sys.log('got request from ' + location.pathname, params);

        // config JSON response
        if (location.pathname === '/config.json' && request.method === 'GET') {
            response.writeHead(200, {
                'Content-Type': 'application/x-javascript'
            });
            var jsonString = 'parseConfig(' + JSON.stringify({
                host: self.settings.nodeHost,
                port: self.settings.nodePort
            }) + ')';
                response.write(jsonString);
                response.end();
        } else {
            //
            // Serve static files!
            //
            file.serve(request, response);
        }
    });
    request.resume(); // necessary for new node streams.  Otherwise end will never fire
});
return httpServer; 
};

GhostHorse.prototype.createTwitterClient = function () {
    var self = this;
    var twitter = new twitterClient();

    twitter.createClient(self.configs.Twitter, function (err) {
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
        audioDir: self.settings.audioPath
        });

    return converter;
};

/**
 * Fetches reference to our app datastore
 */
GhostHorse.prototype.getDataStore = function () {
    var ds = new dataStore({config: this.configs});

    if (!ds) {
        throw new Error('Unable to create data store!');
    }
    return ds;
};

GhostHorse.prototype.onTextConverted = function (tweets) {
    var self = this;

    // format audio path for clients
    var converted = tweets.filter(function (t) {
        return typeof t.audioFile !== 'undefined';
    })
    .map(function (t) {
        // TODO: Use cloud storage for audio, point url to that
        t.audioFile = self.settings.audioHost + path.join('/audio', path.basename(t.audioFile));
        return t;
    });
    self.saveProcessedTweets(converted);
};

GhostHorse.prototype.saveProcessedTweets = function (tweets) {
    var self = this;

    tweets.forEach(function (t) {
        self.saveTweet(t);
    });
};

// Saves tweet to the cloud!
GhostHorse.prototype.saveTweet = function (tweet) {
    var self = this;

    self.dataStore.saveHorseTweet(tweet, function (err) {
        if (!err) {
            // save to internal converted map
            console.log('saving converted tweet: ' + tweet.id);
            self.tweetsConverted[tweet.id] = tweet;
        }
    });
};

GhostHorse.prototype.startTwitterReader = function () {
    var self = this;

    // Begin tweet read cycle
    self.getTweets({user: HORSEJS_HANDLE}, function (response) {
        if (response.length > 0) {
            console.log(response.length + ' tweets (latest): ', response[response.length-1]);
            self.convertTweetsToAudio(response);
        } else {
            console.log('no tweets');
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
 * Fetches tweet by id, asynchronously
 * @param {String} id tweet id
 * @param {Function} cb
 */
GhostHorse.prototype.getTweetById = function (id, cb) {
    var self = this;

    self.dataStore.getHorseTweet(id, function (err, tweet) {
        if (err) {
            cb({error: err});
        } else {
            cb(tweet);
        }
    });
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
