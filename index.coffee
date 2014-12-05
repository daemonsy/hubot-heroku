Path = require 'path'

module.exports = (robot, scripts) ->
  robot.loadFile(Path.resolve(__dirname, "src"), "heroku.coffee")
