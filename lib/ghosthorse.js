/**
 * HTTP static file server, websockets 
 */
var http = require('http'),
    sys = require('sys'),
    path = require('path'),
    fs = require('fs'),
    url = require('url'),
    util = require('util'),
    nodeStatic = require('node-static/lib/node-static'),
    TwitterClient = require('lib/twitterclient'),
    TwitterAccount = require('lib/twitteraccount'),
    TweetPoster = require('lib/tweetposter'),
    Text2Audio = require('lib/text2audio'),
    DataStore = require('lib/datastore'),
    AWS = require('aws-sdk');
require('array.prototype.find');

var TWEETS_CHECK_INTERVAL = 60 * 1000; // 1 minute

function GhostHorse (opts) {
    if (! (this instanceof GhostHorse)) {
        return new GhostHorse(opts);
    }
    this.settings = opts;
    this._tweets = [];
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
    
    // Create an S3 client
    AWS.config.update(self.configs.S3);
    self.s3 = new AWS.S3();

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

/**
 * Initializes twitter api connection via oauth
 */
GhostHorse.prototype.createTwitterClient = function () {
    var self = this;
    var twitter = new TwitterClient();

    twitter.createClient(self.configs.Twitter, function (err) {
        if (err) {
            throw new Error('Unable to create twitter client: ' + err);
        }
        sys.log('Twitter client initialized');

        self.createAccountWatchers(twitter);
        self.createTweetPoster(twitter);
    });
    return twitter;
};

/**
 * Initializes twitter account monitors
 * @param {TwitterClient} client
 */
GhostHorse.prototype.createAccountWatchers = function (client) {
    var self = this;

    // start following twitter account here
    this.configs.Accounts.map(function (user) {
        var account = new TwitterAccount({client: client, user: user.handle});

        account.monitor(function (tweet) {
            self.addTweet(tweet);
        });
    });
};

/**
 * Initializes twitter post maker
 * @param {TwitterClient} client
 */
GhostHorse.prototype.createTweetPoster = function (client) {
    this._poster = new TweetPoster({client: client});
};

/**
 * Initialize text 2 audio converter
 */
GhostHorse.prototype.createTextConverter = function () {
    var self = this,
        converter = new Text2Audio({
            onComplete: self.onTextConverted.bind(self),
        audioDir: self.settings.audioPath
        });

    return converter;
};

/**
 * Fetches reference to our app datastore
 */
GhostHorse.prototype.getDataStore = function () {
    var ds = new DataStore({config: this.configs});

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
    });
    self.saveProcessedTweets(converted);
};

/**
 * Add raw tweet from monitors to internal list
 * @param {Object} tweet
 */
GhostHorse.prototype.addTweet = function (tweet) {
    this._tweets.push(this.formatTweet(tweet));
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

    self.dataStore.saveHorseTweet(this.getHandleAccountId(tweet.handle), tweet, function (err) {
        if (!err) {
            // save audio file to S3
            var params = {
                ACL: 'public-read',
                StorageClass: 'REDUCED_REDUNDANCY',
                Bucket: 'horsejs', 
                Key: tweet.audioFile, 
                Body: fs.readFileSync(path.join(self.settings.audioPath, tweet.audioFile)) 
            };
            console.log('uploading audio to S3...');
            self.s3.putObject(params, function(err, data) {
                if (!err) {
                    // save to internal converted map
                    console.log('saving converted tweet: ' + tweet.id);
                    self.tweetsConverted[tweet.id] = tweet;
                    // success notifier
                    self.onAudioUploadSuccess(tweet);
                } else {
                    console.log('S3 UPLOAD FAIL: ' + err);
                }
            });
        }
    });
};

GhostHorse.prototype.startTwitterReader = function () {

    if (this._tweets.length > 0) {
        console.log(this._tweets.length + ' tweets processed');
        this.convertTweetsToAudio(this._tweets);
    } else {
        console.log('no tweets');
    }
    // Start over after some interval
    setTimeout(this.startTwitterReader.bind(this), TWEETS_CHECK_INTERVAL);
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
 * @param {Object} t
 * @return {Object}
 */
GhostHorse.prototype.formatTweet = function (t) {
    return {
        id: t.id,
        created: t.created_at,
        name: t.user.name,
        handle: t.user.screen_name,
        text: t.text,
        source: t.source
    };
};

/**
 * Creates audio files from all unprocessed tweets
 * @param {Array} tweet objects
 */
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

/**
 * Called when new audio converted and saved
 * @param {Object} tweet
 */
GhostHorse.prototype.onAudioUploadSuccess = function (tweet) {
    this._poster.execute(tweet);
};

/**
 * Returns twitter user account ID by handle
 * @param {String} handle
 * @return {Number}
 */
GhostHorse.prototype.getHandleAccountId = function (handle) {
    var res = this.configs.Accounts.find(function (u) {
        return u.handle === handle;
    });
    return res ? res.accountId : 0;
};

module.exports = GhostHorse;
