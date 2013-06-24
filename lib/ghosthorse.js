/**
 * HTTP static file server, websockets 
 */

var http = require('http'),
    sys = require('sys'),
    nodeStatic = require('node-static'),
    faye = require('faye/node/faye-node'),
    url = require('url');

function GhostHorse (opts) {
    if (! (this instanceof GhostHorse)) {
        return new GhostHorse(opts);
    }
    this.settings = {
        port: opts.port,
    };
    this.init(); 
}

GhostHorse.prototype.init = function () {
    var self = this;

    self.bayeux = self.createBayeuxServer();
    self.httpServer = self.createHTTPServer();

    self.bayeux.attach(self.httpServer);
    self.httpServer.listen(self.settings.port);

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
                self.getHorse(params, function (response) {
                    self.bayeux.getClient().publish('/horsemouth', {
                        files: response.files
                    });
                });
                response.write('OK');
                response.end();
            } else if (location.pathname == '/horsemauger') {
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

GhostHorse.prototype.getHorse = function (opts, callback) {
    var self = this;

    // Look for new tweets
    // Returns list of tweet sound filenames
    callback({
        files: ['tweet234234.aac', 'tweet234234.aac']
    });
};

module.exports = GhostHorse;
