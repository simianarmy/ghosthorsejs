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
    nodeHost: 'http://horsejs.com',
    nodePort: 8000,
    audioHost: 'http://horsejs.com'
});
