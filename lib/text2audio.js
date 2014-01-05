/**
 * Module for converting text snippets to mp3 file.
 * It will return the data in binary format to the caller.
 */

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    util = require('util'),
    shellstring = require('./shellstring');

var TEXT2AUDIO_EXT = 'aac';
var TEXT2AUDIO_CMD = 'say';
var FINALAUDIO_EXT = 'mp3';
var FFMPEG_COMMAND = 'ffmpeg -i %s -acodec %s -ac 2 -ab 128k %s';

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
        finalName = path.join(self.AudioDir, data.id + '.' + FINALAUDIO_EXT), 
        destName = path.join(self.AudioDir, data.id + '.' + TEXT2AUDIO_EXT);

    // Don't process if file already exists
    if (fs.existsSync(finalName)) {
        return callback(null, destName);
    }
    // text should be wrapped in double quotes.  escape unsafe shell characters
    var commandStr = util.format('%s -o %s "%s"', 
            TEXT2AUDIO_CMD, 
            destName,
            shellstring(data.text)
            );

    console.log('command: ' + commandStr);

    exec(commandStr, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);

        if (error !== null) {
            console.log('stderr: ' + stderr);
            console.log('exec error: ' + error);
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
                    self._convertAudioToMp3(file, function (err, mp3) {
                        if (!err) {
                            list[i].audioFile = path.basename(mp3);
                        }
                        convert(i + 1);
                    });
                } else {
                    convert(i + 1);
                }
            });
        } else {
            self._completeCallback(list);
        }
    }(0));
};

/**
 * Converts aac to mp3
 */
Text2Audio.prototype._convertAudioToMp3 = function (source, callback) {
    var self = this,
        destName = path.join(this.AudioDir, path.basename(source, TEXT2AUDIO_EXT)) + FINALAUDIO_EXT; 
    
    // Don't process if file already exists
    if (fs.existsSync(destName)) {
        //console.log(destName + ' exists...skipping conversion');
        return callback(null, destName);
    }
    var commandStr = util.format(FFMPEG_COMMAND, 
            source, 
            FINALAUDIO_EXT,
            destName);

    console.log(commandStr);
    exec(commandStr, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);

        if (error !== null) {
            console.log('stderr: ' + stderr);
            console.log('exec error: ' + error);
        } else {
            // delete original
            fs.unlinkSync(source);
        }
        callback(error, destName);
    });
};

/**
 * @exports
 */
module.exports = Text2Audio;
