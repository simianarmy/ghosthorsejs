function GhostHorseClient () {
    if (! (this instanceof GhostHorseClient)) {
        return new GhostHorseClient(arguments);
    }
    var self = this;

    this.init = function () {
        self.setupBayeuxHandlers();
    };

    this.setupBayeuxHandlers = function () {
        // Node server is on the same host:port
        self.client = new Faye.Client('/faye', {
                timeout: 120
                });

        // Subscribe to new data events
        self.client.subscribe('/horsemouth', function (message) {
            console.log('MESSAGE', message);
            // TODO: Play specified audio files!
        });
        // self.client.subscribe('/horsemauger', function () {});
    };
    this.init();
}

var ghClient = new GhostHorseClient();
