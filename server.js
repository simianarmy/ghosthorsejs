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
    nodeHost: 'localhost',
    nodePort: 8001,
    audioPath: '/Users/marcmauger/Sites/neighs.horsejs.com/public/audio'
});
