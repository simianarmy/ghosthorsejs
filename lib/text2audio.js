/**
 * Module for converting text snippets to mp3 file.
 * It will return the data in binary format to the caller.
 */

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    util = require('util'),
    shellstring = require('./shellstring'),
    Q = require('q');

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
Text2Audio.prototype.convertText = function (data) {
    var self = this,
        deferred = Q.defer(),
        finalName = path.join(self.AudioDir, data.id + '.' + FINALAUDIO_EXT), 
        destName = path.join(self.AudioDir, data.id + '.' + TEXT2AUDIO_EXT);

    // Don't process if file already exists
    if (fs.existsSync(finalName)) {
        //return callback(null, destName);
        deferred.resolve(destName);
    } 
    else {
        // text should be wrapped in double quotes.  escape unsafe shell characters
        var commandStr = util.format('%s -o %s "%s"', 
                TEXT2AUDIO_CMD, 
                destName,
                shellstring(data.text)
                );

        if (data.voiceName) {
            commandStr += ' -v ' + data.voiceName;
        }

        console.log('command: ' + commandStr);

        exec(commandStr, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);

            if (error !== null) {
                console.log('stderr: ' + stderr);
                console.log('exec error: ' + error);
                deferred.reject(error);
            } else {
                deferred.resolve(destName);
            }
        });
    }
    return deferred.promise;
};

/**
 * Converts aac to mp3
 */
Text2Audio.prototype._convertAudioToMp3 = function (source) {
    var self = this,
        deferred = Q.defer(),
        destName = path.join(this.AudioDir, path.basename(source, TEXT2AUDIO_EXT)) + FINALAUDIO_EXT; 
    
    // Don't process if file already exists
    if (fs.existsSync(destName)) {
        deferred.resolve(destName);
    }
    else {
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
                deferred.reject(error);
            } else {
                // delete original
                fs.unlinkSync(source);
                deferred.resolve(destName);
            }
        });
    }
    return deferred.promise;
};

/**
 * converts collection of tweets text to audio
 * @param {Array} tweets
 */
Text2Audio.prototype.convertBulk = function (list) {
    var self = this;

    var ops = list.map(function (l) {
        return self.convertText(l).then(function (f) {
            self._convertAudioToMp3(f).then(function (mp3) {
                l.audioFile = path.basename(mp3);
            });
        });
    });

    Q.all(ops).then(function (success, err) {
        if (err) {
            console.log('** SOME PROMISES FAILED **');
        }
        self._completeCallback(list);
    });
};

/**
 * @exports
 */
module.exports = Text2Audio;
