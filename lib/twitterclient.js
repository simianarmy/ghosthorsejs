/**
 * Twitter interface
 */
var twitter = require('ntwitter'),
    url = require('url');

/**
 * @constructor
 */
function TwitterClient (opts) {
    if (!(this instanceof TwitterClient)) {
        return new TwitterClient(opts);
    }
    this._client = null;
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

TwitterClient.prototype.search = function (user, opts, cb) {
    this._client.search(user, opts, cb);
};

/**
 * @exports
 */
module.exports = TwitterClient;
