/**
 * Twitter interface
 */
var twitter = require('ntwitter'),
    url = require('url'),
    winston = require('winston');

/**
 * @class TwitterClient
 * @constructor
 */
function TwitterClient (opts) {
    if (!(this instanceof TwitterClient)) {
        return new TwitterClient(opts);
    }
    this._client = null;
}

/**
 * init the client
 * @param {Object} config auth keys
 * @param {Function} callback
 */
TwitterClient.prototype.createClient = function (config, callback) {
    var self = this,
        err;

    //winston.info('auth data', data);
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
        //winston.info('client: ', self._client);
    } catch (e) {
        err = e.getMessage();    
        callback(err);
    }
};

/**
 * Sign in with Twitter support methods
 * @param {Request} req
 * @param {Response} res
 */
TwitterClient.prototype.login = function (req, res) {
    var path = url.parse(req.url, true);

    winston.info('authenticating', path);
    this._client.login(path.pathname, "/twitter_callback")(req, res, function (code) {
        winston.info('login: got error code: ' + code);
    });
};

/**
 * Callback for twitter auth
 * @param {Request} req
 * @param {Response} res
 * @param {Function} cb
 */
TwitterClient.prototype.loginCallback = function (req, res, cb) {
    var twit = this._client;

    winston.info('got callback, calling gatekeeper');
    twit.gatekeeper()(req, res, function () {
        req_cookie = twit.cookie(req);
        twit.options.access_token_key = req_cookie.access_token_key;
        twit.options.access_token_secret = req_cookie.access_token_secret; 
        winston.info('got cookie', req_cookie);

        twit.verifyCredentials(function (err, data) {
            winston.info("Verifying Credentials...");
            if (err) {
                winston.info("Verification failed : " + err);
                cb(err);
            } else {
                winston.info('Verified!', data);
                cb(null, data);
            }
        });
    });
};

/**
 * interface to twitter search api
 * @param {String} user Twitter user who's timeline will be searched
 * @param {Object} opts search options
 * @param {Function} cb
 */
TwitterClient.prototype.search = function (user, opts, cb) {
    console.log('fetching tweets on ' + user + '\'s timeline with opts', opts);
    opts.screen_name = user;
    opts.include_rts = false;

    this._client.get('/statuses/user_timeline.json', opts, cb);
};

/**
 * TODO: Not tested
 */
TwitterClient.prototype.streamSearch = function (user, opts, cb) {
    console.log('searching tweets on ' + user + '\'s timeline...');
    this._client.stream('user', {track: user}, function(stream) {
        stream.on('data', function(data) {
            console.log('data stream received', data);
            if (data.text) {
                cb(data);
            }
        });

        stream.on('end', function(response) {
            winston.info(user + ' stream ended!');
        });

        stream.on('destroy', function(response) {
            winston.info(user + ' stream destroyed!');
        });
    });
};

/**
 * interface to twitter user's home timeline
 * @param {Object} opts search options
 * @param {Function} cb
 */
TwitterClient.prototype.homeTimeline = function (opts, cb) {
    this._client.getHomeTimeline(opts, cb);
};

/**
 * interface to twitter status
 * @param {String} tweet id
 * @param {Function} cb
 */
TwitterClient.prototype.getStatus = function (id, cb) {
    this._client.getStatus(id, cb);
};

/**
 * interface to twitter status update api
 * @param {String} text
 * @param {Function} cb
 */
TwitterClient.prototype.tweet = function (text, cb) {
    this._client.updateStatus(text, cb);
};

/**
 * @exports
 */
module.exports = TwitterClient;
