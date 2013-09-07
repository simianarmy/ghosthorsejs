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
    audioHost: 'http://neighs.horsejs.com',
    audioPath: '/Users/marcmauger/Sites/neighs.horsejs.com/public/audio'
});
