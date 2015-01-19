/**
 * Twitter interface
 */
var twitter = require('ntwitter'),
    fs = require('fs'),
    sys = require('sys'),
    util = require('util'),
    qs = require('querystring'),
    url = require('url');

var SEARCH_INTERVAL = 5 * 60 * 1000; // minutes
var TWEETS_PER_SEARCH = 20;

/**
 * @constructor
 */
function TwitterClient (opts) {
    if (!(this instanceof TwitterClient)) {
        return new TwitterClient(opts);
    }
    this._client = null;
    this._tweets = [];
    this._saved = {};
    this._since_id = {}; 
    this._max_id = {};
    this._default_opts = {
        count: TWEETS_PER_SEARCH
    };
}

TwitterClient.prototype.createClient = function (config, callback) {
    var self = this,
        err;

    //console.log('auth data', data);
    try {
        self._client = new twitter({
            consumer_key: config.consumerKey,
            consumer_secret: config.consumerSecret,
            access_token_key: config.accessTokenKey,
            access_token_secret: config.accessTokenSecret
        });
        self._client.verifyCredentials(function (err, data) {
            callback(err);
        });
        //console.log('client: ', self._client);
    } catch (e) {
        err = e.getMessage();    
        callback(err);
    }
};

/**
 * Begins polling for tweets
 */
TwitterClient.prototype.trackUser = function (user) {
    var self = this,
        since = this._since_id[user] || 0;
    console.log('tracking twitter user ' + user);

    self._search(user, self._default_opts);
};

/**
 * Returns list of json blobs returned by twitter api
 */
TwitterClient.prototype.getTweets = function () {
    return this._tweets;
};

// Sign in with Twitter support methods

TwitterClient.prototype.login = function (req, res) {
    var path = url.parse(req.url, true);

    console.log('authenticating', path);
    this._client.login(path.pathname, "/twitter_callback")(req, res, function (code) {
        console.log('login: got error code: ' + code);
    });
};

TwitterClient.prototype.loginCallback = function (req, res, cb) {
    var twit = this._client;

    console.log('got callback, calling gatekeeper');
    twit.gatekeeper()(req, res, function () {
        req_cookie = twit.cookie(req);
        twit.options.access_token_key = req_cookie.access_token_key;
        twit.options.access_token_secret = req_cookie.access_token_secret; 
        console.log('got cookie', req_cookie);

        twit.verifyCredentials(function (err, data) {
            console.log("Verifying Credentials...");
            if (err) {
                console.log("Verification failed : " + err);
                cb(err);
            } else {
                console.log('Verified!', data);
                cb(null, data);
            }
        });
    });
 };

TwitterClient.prototype._search = function (user, opts) {
    var self = this;

    console.log('searching twitter for ' + user, opts);

    try {
        self._client.search(user, opts, function (err, data) {
            if (err) {
                console.log('twitter search error: ' + err);
            } else {
                //console.log('parsing search results: ', data);
                self._parseSearchResults(user, data);
            }
            // If there are more results, parse max_id and fetch again
            if ((typeof data !== 'undefined') && data.search_metadata.next_results) {
                // extract max id
                //opts.max_id = qs.parse(data.search_metadata.next_results.substring(1)).max_id;
                if (self._max_id[user]) {
                    opts.max_id = self._max_id[user];
                }
                console.log('fetching next set of results with max_id: ' + opts.max_id);
                // search again
                self._search(user, opts);
            } else {
                // set starting point for next search
                // start new search
                console.log('no more results, fetching next tweets in ' + SEARCH_INTERVAL);
                // we only want since_id in the search params for the next
                // search
                delete opts.max_id;
                if (self._since_id[user]) {
                    opts.since_id = self._since_id[user];
                    console.log('latest since_id value: ' + opts.since_id);
                }
                setTimeout(self._search.bind(self, user, opts), SEARCH_INTERVAL);
            }
        });
    } catch (e) {
        sys.log('Exception in twitter search: ', e);
        sys.log('fetching next tweets in ' + SEARCH_INTERVAL);
        opts.since_id = self._since_ids[user];
        setTimeout(self._search.bind(self, user, opts), SEARCH_INTERVAL);
    }
    //TODO: Streams implementation - doesn't return tweets - figure out what options
    // to pass
    /*
    this._client.stream('user', {track: user}, function (stream) {
        console.log('got stream', stream);
        stream.on('data', function (data) {
            console.log(data);
        });
        stream.on('end', function (response) {
            // Handle a disconnection
        });
        stream.on('destroy', function (response) {
            // Handle a 'silent' disconnection from TwitterClient, no end/error event fired
        });
        stream.on('error', function (message) {
            console.log('stream error', message);
        });
    });
    */
};

TwitterClient.prototype._parseSearchResults = function (user, data) {
    if (!data) {
        return;
    }
    var self = this;

    //console.log('trackUser: ', data);
    data = data || {};
    
    if (util.isArray(data.statuses)) {
        data.statuses.forEach(function (tdata) {
            if (tdata.user.screen_name === user) {
                //console.log(tdata.text);
                self._addTweet(tdata);
            }
        });
    }
    //console.log(data.statuses.length + ' results');
};

TwitterClient.prototype._addTweet = function (tweet) {
    if (this._saved[tweet.id]) {
        return; // skip
    }
    var user = tweet.user.screen_name;
    this._tweets.push(tweet);
    this._saved[tweet.id] = tweet.id;
    // Keep track tweet with lowest id
    if (!this._max_id[user]) {
        this._max_id[user] = tweet.id;
    } else {
        this._max_id[user] = Math.min(this._max_id[user], tweet.id);
    }
    // Keep track tweet with highest id
    if (!this._since_id[user]) {
        this._since_id[user] = tweet.id;
    } else {
        this._since_id[user] = Math.max(this._since_id[user], tweet.id);
    }
};

/**
 * @exports
 */
module.exports = TwitterClient;
