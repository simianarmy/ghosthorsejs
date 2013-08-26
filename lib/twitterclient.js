/**
 * Twitter interface
 */
var twitter = require('ntwitter'),
    fs = require('fs'),
    sys = require('sys'),
    util = require('util'),
    qs = require('querystring');

var SEARCH_INTERVAL = 5 * 60 * 1000; // minutes

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
    this._since_id = 0; 
    this._max_id = 0;
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
    var self = this;
    console.log('tracking twitter user ' + user);

    // Create initial search options
    self._search(user, {since_id: this._since_id});
};

/**
 * Returns list of json blobs returned by twitter api
 */
TwitterClient.prototype.getTweets = function () {
    return this._tweets;
};

TwitterClient.prototype._search = function (user, opts) {
    var self = this;

    console.log('searching twitter for ' + user, opts);

    try {
        self._client.search(user, opts, function (err, data) {
            if (err) {
                console.log('twitter search error: ' + err);
            } else {
                self._parseSearchResults(user, data);
            }
            // If there are more results, parse max_id and fetch again
            if (data.search_metadata.next_results) {
                // extract max id
                opts.max_id = qs.parse(data.search_metadata.next_results.substring(1)).max_id;
                // search again
                self._search(user, opts);
            } else {
                // set starting point for next search
                self._since_id = self._max_id;
                // start new search
                sys.log('fetching next tweets in ' + SEARCH_INTERVAL);
                setTimeout(self._search.bind(self, user, {since_id: self._since_id}), SEARCH_INTERVAL);
            }
        });
    } catch (e) {
        console.log('Exception in twitter search: ', e);
        sys.log('fetching next tweets in ' + SEARCH_INTERVAL);
        setTimeout(self._search.bind(self, user, {since_id: self._since_id}), SEARCH_INTERVAL);
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
    this._tweets.push(tweet);
    this._saved[tweet.id] = tweet.id;
    // Keep track of most recent tweet id for searches
    this._max_id = Math.max(this._max_id, tweet.id);
};

/**
 * @exports
 */
module.exports = TwitterClient;
