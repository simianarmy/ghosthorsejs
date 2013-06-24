/**
 * Module for converting text snippets to mp3 file.
 * It will return the data in binary format to the caller.
 */

var exec = require('child_process').exec,
    fs = require('fs'),
    temp = require('temp')
    util = require('util');

var TEXT2AUDIO_CMD = 'say -o out.aac';

/**
 * @constructor
 */
function Text2Audio (opts) {
    if (!(this instanceof Text2Audio)) {
        return new Text2Audio(opts);
    }
}

/**
 * Converts text to audio, returns path to created audio file
 * @param {String} text
 * @param {Function} callback
 */
Text2Audio.prototype.convertText = function (text, callback) {
    // generate unique filename
    var tempName = temp.path({suffix: '.aac'}),
        command = util.format("%s -o %s '%s'", 
          TEXT2AUDIO_CMD, 
          tempName,
          text);

    console.log('text to audio: ' + command);
    exec(command, function (error, stdout, stderr) {
        var data = [];
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }
        callback(error, tempName);
    });
};

/**
 * @exports
 */
module.exports = Text2Audio;
