/**
 * Module for converting text snippets to mp3 file.
 * It will return the data in binary format to the caller.
 */

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    temp = require('temp')
    util = require('util'),
    shellstring = require('./shellstring');

var AUDIO_EXT = '.aac';
var TEXT2AUDIO_CMD = 'say'

/**
 * @constructor
 */
function Text2Audio (opts) {
    if (!(this instanceof Text2Audio)) {
        return new Text2Audio(opts);
    }
    this._completeCallback = opts.onComplete;
    this.AudioDir = opts.audioDir;
}

/**
 * Converts text to audio, returns path to created audio file
 * @param {Object} data
 *   text {String}
 *   filePrefix {String} optional filename
 * @param {Function} callback
 */
Text2Audio.prototype.convertText = function (data, callback) {
    var self = this,
        tempName = temp.path({suffix: AUDIO_EXT}),
        destName = data.filePrefix ? 
            path.join(self.AudioDir, data.filePrefix + AUDIO_EXT) : 
            path.join(self.AudioDir, path.basename(tempName) + AUDIO_EXT);

    // text should be wrapped in double quotes.  escape unsafe shell characters
    var commandStr = util.format('%s -o %s "%s"', 
          TEXT2AUDIO_CMD, 
          tempName,
          shellstring(data.text)
          );

    console.log('checking file ' + destName);

    // Don't process if file already exists
    if (fs.existsSync(destName)) {
        console.log('destName exists...skipping conversion');
        return callback(null, destName);
    }
    console.log('command: ' + commandStr);
    exec(commandStr, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);

        if (error !== null) {
            console.log('stderr: ' + stderr);
            console.log('exec error: ' + error);
        } else {
            console.log('moving ' + tempName + ' to ' + destName);
            fs.renameSync(tempName, destName);
        }
        callback(error, destName);
    });
};

Text2Audio.prototype.convertBulk = function (list) {
    var self = this;

    console.log('converting bulk to audio');
    // Indirectly recursive function - iterates through list saving the 
    // audio filename to each element once processed
    // When finished, calls final callback with modified list 
    (function convert(i) {
        if (i < list.length) {
            self.convertText(list[i], function (err, file) {
                if (!err) {
                    list[i].audioFile = file;
                }
                convert(i + 1);
            });
        } else {
            self._completeCallback(list);
        }
    }(0));

};

/**
 * @exports
 */
module.exports = Text2Audio;
