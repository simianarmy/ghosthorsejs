// dangerous characters to the shell,
// see http://mywiki.wooledge.org/BashGuide/SpecialCharacters
var escapechars = [
  ';',
  '&',
  '#',
  '>',
  '<',
  '{',
  '}',
  '$',
  '(',
  ')',
  '[',
  ']',
  //'\'',
  '"',
  '|',
  '*',
  '!',
  '^',
  '-',
  '+',
  '~',
  '`'
]
module.exports = shellstring;

// return a shell compatible format
function shellstring(str) {
    var ret = '', i, j, len, s;

    for (i = 0, len = str.length; i < len; i++) {
        // quote troublesome characters
        for (j = 0; j < escapechars.length; j++) {
            s = str[i];
            if (s.indexOf(escapechars[j]) > -1) {
                s = '\\' + s;
                break;
            }
        }
        ret += s;
    };

    return ret;
};
