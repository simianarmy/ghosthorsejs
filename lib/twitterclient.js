/**
 * Twitter interface
 */
var twitter = require('ntwitter'),
    fs = require('fs'),
    util = require('util'),
    qs = require('querystring');

var SEARCH_INTERVAL = 30000;

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

TwitterClient.prototype.createClient = function (configFile, callback) {
    var self = this,
        data,
        err;

    // get settings from config file
    try {
        data = require(configFile);
    } catch (e) {
        return callback('error reading twitter config ' + configFile);
    }
    //console.log('auth data', data);
    try {
        self._client = new twitter({
            consumer_key: data.consumerKey,
            consumer_secret: data.consumerSecret,
            access_token_key: data.accessTokenKey,
            access_token_secret: data.accessTokenSecret
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
            setTimeout(self._search.bind(self, user, {since_id: self._since_id}), SEARCH_INTERVAL);
        }
    });
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
    
    if (data.search_metadata) {
        //console.log(data.search_metadata);
        // update oldest tweet found
        self._max_id = Math.max(self._max_id, data.search_metadata.max_id);
    }
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
};

/**
 * @exports
 */
module.exports = TwitterClient;
