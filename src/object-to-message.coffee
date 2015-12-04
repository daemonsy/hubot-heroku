mapper = require('./heroku-response-mapper')

rpad = (string, width, padding = ' ') ->
  if (width <= string.length) then string else rpad(width, string + padding, padding)

module.exports = (object, mapperName) ->
  cleanedObject = mapper[mapperName](object)

  output = []
  maxLength = 0
  keys = Object.keys(cleanedObject)
  keys.forEach (key) ->
    maxLength = key.length if key.length > maxLength

  keys.forEach (key) ->
    output.push "#{rpad(key, maxLength)} : #{cleanedObject[key]}"

  output.join("\n")
