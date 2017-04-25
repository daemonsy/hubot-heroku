const mapper = require('./heroku-response-mapper');

var rpad = function(string, width, padding) {
  if (padding == null) { padding = ' '; }
  if (width <= string.length) { return string; } else { return rpad(width, string + padding, padding); }
};

module.exports = function(object, mapperName) {
  let cleanedObject = mapper[mapperName](object);

  let output = [];
  let maxLength = 0;
  let keys = Object.keys(cleanedObject);

  keys.forEach(function(key) {
    if (key.length > maxLength) { return maxLength = key.length; }
  });

  keys.forEach(key => output.push(`${rpad(key, maxLength)} : ${cleanedObject[key]}`));

  return `\`\`\`\n${output.join("\n")}\n\`\`\``;
};
