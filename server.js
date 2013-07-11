/**
 * Application main()
 */
var ghostHorse = require('lib/ghosthorse');

/**
 * Global error handler
 */
process.addListener('uncaughtException', function (err, stack) {
    console.log('Exception: ' + err);
    console.log(stack);
});

/**
 * Start app!
 */
new ghostHorse({
    port: 8000,
    nodeHost: 'http://horsejs.local',
    nodePort: 8000,
    audioHost: 'http://horsejs.local:8000'
});
