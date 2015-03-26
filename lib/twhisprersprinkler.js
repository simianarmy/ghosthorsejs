/**
 * Monitors @twhisprer feed for tweet links to visit and add to the audio queue
 */

var TwitterTimeline = require('lib/twittertimeline');
      redis = require('redis'),
      request = require('request'),
      Q = require('q');


/**
 * @constructor
 */
function TwhisprerSprinkler (opts) {
    // twitter client
    this._client = opts.client;
    this._onTweet = opts.onComplete;
    this._cache = redis.createClient();
}

TwhisprerSprinkler.TWITTER_HANDLE = 'Twhisprer';

/**
 * Regular epression to find sprinkler-type messages
 */
TwhisprerSprinkler.TWEET_LINK_RE = /^@twhisprer (https:\/\/t\.co\/\w+)$/i;

/**
 * Initialize account monitoring
 */
TwhisprerSprinkler.prototype.init = function () {
    // Begin client monitoring loop
    var timeline = new TwitterTimeline({
        client: this._client 
    });
    timeline.monitor(this.onUpdate.bind(this));
};

/**
 * Called when tweet found in account
 * @param {Object} tweet
 */
TwhisprerSprinkler.prototype.onUpdate = function (tweets) {
    tweets.forEach(function (tweet) {
        console.log('Twhisprer tweet found: ' + tweet.text);
        // Does tweet match the sprinkler format? (link to tweet only)
        if (this._isValidSprinkler(tweet)) {
            this._processIfNotSaved(tweet);
        }
    }.bind(this));
};

/**
 * Test if tweet is a sprinkler type
 * @param {Object} tweet
 * @return {Boolean}
 */
TwhisprerSprinkler.prototype._isValidSprinkler = function (tweet) {
    return TwhisprerSprinkler.TWEET_LINK_RE.test(tweet.text) &&
        (tweet.user.screen_name !== TwhisprerSprinkler.TWITTER_HANDLE);
};

/**
 * Test if tweet has already been processed
 * @param {Object} tweet
 */
TwhisprerSprinkler.prototype._processIfNotSaved = function (tweet) {

    this._cache.get(tweet.id_str, function (err, reply) {
        // if not in cache
        if (!err && (reply === null)) {
            this._processSprinklerTweet(tweet);
        }
    }.bind(this));
};

/**
 * Processes sprinkler
 * @param {Object} tweet
 */
TwhisprerSprinkler.prototype._processSprinklerTweet = function (tweet) {
    console.log('Found new sprinkler tweet! ' + tweet.text);
    // extract tweet link
    var match = TwhisprerSprinkler.TWEET_LINK_RE.exec(tweet.text); 
    var link = match[1];

    if (link) {
        this._expandUrl(link).then(this._scanTweetUrl.bind(this, tweet));
    }
    this._cache.set(tweet.id_str, tweet.id_str);
};

/**
 * Parses tweet url and fetches its data
 * @param {Object} sourceTweet
 * @param {String} url
 * https://twitter.com/aparnapkin/status/580923751598022656
 */
TwhisprerSprinkler.prototype._scanTweetUrl = function (sourceTweet, url) {
    if (!url || (url === '')) {
        console.error('Unable to scan empty url!');
        return;
    }
    console.log('scanning tweet link: ' + url);

    var parts = url.split('/'),
        id = parts[parts.length-1];
    
    if (id) {
        Q.ninvoke(this._client, 'getStatus', id)
            .then(function (tweet) {
                console.log('getStatus => ', tweet.text);
                tweet.notifyUser = sourceTweet.user.screen_name; // save referring user handle

                if (this._onTweet) {
                    this._onTweet(tweet); // call registered handler
                }
            }.bind(this));
    }
};

/**
 * Expands url via promise
 * TODO: Move to utility module?
 * @param {String} shortUrl
 * @return {Promise}
 */
TwhisprerSprinkler.prototype._expandUrl = function (shortUrl) {
    console.log('expanding url ' + shortUrl);

    return Q.nfcall(request, null, {
        method: 'HEAD',
        url: shortUrl,
        followAllRedirects: true
        // If a callback receives more than one (non-error) argument
        // then the promised value is an array. We want element 0.
    }).get('0').get('request').get('href');
};

module.exports = TwhisprerSprinkler;
