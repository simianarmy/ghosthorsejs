/**
 * HTTP static file server, websockets 
 */
var http = require('http'),
    sys = require('sys'),
    url = require('url'),
    util = require('util'),
    winston = require('winston'),
    nodeStatic = require('node-static/lib/node-static'),
    TwitterClient = require('./twitterclient'),
    TwitterAccount = require('./twitteraccount'),
    TweetPoster = require('./tweetposter'),
    Text2Audio = require('./text2audio'),
    DataStore = require('./datastore'),
    Uploader = require('./uploader'),
    Sprinkler = require('./twhisprersprinkler');

require('array.prototype.find');

var TWEETS_CHECK_INTERVAL = 6000 * 5;
var MAX_TWEETS_PER_PROCESS = 2; // no limit

function GhostHorse (opts) {
    if (! (this instanceof GhostHorse)) {
        return new GhostHorse(opts);
    }
    this.settings = opts;
    this._tweets = [];
}

GhostHorse.prototype.init = function () {
    // Create logfile
    winston.add(winston.transports.File, { filename: 'ghosthorse.log' });

    this.configs = this.readConfigs();

    this.httpServer = this.createHTTPServer();
    this.httpServer.listen(this.settings.nodePort);

    this.twitter = this.createTwitterClient();
    this.startTwitterReader();

    this.converter = this.createTextConverter();
    this.tweetsConverted = [];
    this.failedTweets = {};

    this.dataStore = this.getDataStore();
    this.uploader = this.createAudioUploader();
    
    sys.log('Server started on PORT ' + this.settings.nodePort);
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

    twitter.createClient(self.configs.Twitter.twhisprer, function (err) {
        if (err) {
            throw new Error('Unable to create twitter client: ' + err);
        }
        sys.log('Twitter client initialized');

        self.createAccountWatchers(twitter);
        self.createTweetPoster(twitter);
        self.createSprinkler(twitter);
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
 * Initializes twhisprer sprinkler object
 * @param {TwitterClient} client
 */
GhostHorse.prototype.createSprinkler = function (client) {
    this._sprinkler = new Sprinkler({
        client: client,
        onComplete: this.addTweet.bind(this)
    });
    this._sprinkler.init();
};

/**
 * Initialize text 2 audio converter
 */
GhostHorse.prototype.createTextConverter = function () {
    var self = this,
        converter = new Text2Audio({
            onComplete: self.saveProcessedTweets.bind(self),
            audioDir: self.settings.audioPath
        });

    return converter;
};

GhostHorse.prototype.createAudioUploader = function () {
    var uploader = new Uploader({
        S3: this.configs.S3, 
        SC: this.configs.Soundcloud,
        settings: this.settings
    });

    return uploader;
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

/**
 * Add raw tweet from monitors to internal list
 * @param {Object} tweet
 */
GhostHorse.prototype.addTweet = function (tweet) {

    this._tweets.push(this.formatTweet(tweet));
};

/**
 * Called periodically to process any new tweets gathered
 * @param {Array} tweets
 */
GhostHorse.prototype.saveProcessedTweets = function (tweets) {
    var self = this;

    tweets.filter(function (t) {
        // TODO: Move storage to redis
        return (typeof t.audioFile !== 'undefined') && !self.tweetsConverted[t.id];
    })
    // rate limit N at a time
    .slice(0, MAX_TWEETS_PER_PROCESS)
        .map(this.saveTweet.bind(this));

    // Work on the failed ones now
    // TODO: PREVENT SIMULTANEOUS TWEET PROCESSING ERRORS
    /*
    Object.keys(this.failedTweets).slice(0, MAX_TWEETS_PER_PROCESS)
        .map(function (tid) {
            return self.failedTweets[tid];
        })
        .map(this.saveTweet.bind(this));
        */
};

/**
 * Main control function for saving a processed tweet to cloud services.
 * Attempts transactional system with graceful failure recovery at every step.
 * @param {Object} tweet
 */
GhostHorse.prototype.saveTweet = function (tweet) {
    var self = this;

    // save tweet and audio file upload
    // both asynchronous and we want to use a transaction so that it's all or
    // nothing
    //TODO: Consider using Queue system like SQS or beanstalk
    // delay each processing to prevent flooding errors from apis
    Q.delay(2000).then(function () {
        // 1. Upload sound file to cloud storage
        self.uploader.upload(tweet)
        // 2. Save tweet text data to cloud storage
            .then(function (values) {
                winston.info("uploader.upload promise values", values);
                //data = values[1];
                data = tweet;
                var accountId = self.getHandleAccountId(data.handle);

                return self.dataStore.saveHorseTweet(accountId, data);
            })
        // 3. Post tweet data 
            .then(function (data) {
                winston.info('saveHorseTweet promise data: ', data);
                // don't spam twitter!
                if (data !== 'already exists') {
                    return self._poster.post(data);
                }
                return data;
            })
        // 4. Save processed state for this tweet.
        // TODO: Use Redis
            .then(function (data) {
                winston.info('saving converted tweet: ' + tweet.id);
                self.tweetsConverted[tweet.id] = tweet;
                delete self.failedTweets[tweet.id]; // in case this was a retry
            })
            .then(null, function (err) {
                winston.info('OH NOES!  Failed saving tweet or audio: ' + err);
                // We have to do this otherwise we're stuck retrying forever
                // TODO: Add retry-max and throw away tweet after N retries
                self.failedTweets[tweet.id] = tweet;
            });
    });
};

GhostHorse.prototype.startTwitterReader = function () {

    if (this._tweets.length > 0) {
        winston.info(this._tweets.length + ' tweets processed');
        this.convertTweetsToAudio(this._tweets);
    } else {
        winston.info('no tweets');
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
    var ft = {
        id: t.id,
        created: t.created_at,
        name: t.user.name,
        handle: t.user.screen_name,
        text: t.text,
        source: t.source
    };
    // Parse optional commands
    if (t.notifyUser) {
        ft.notifyUser = t.notifyUser;
    }
    if (t.voiceName) {
        ft.voiceName = t.voiceName;
    }
    return ft;
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
