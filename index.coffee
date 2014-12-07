# description:
#  Entry Point
path = require 'path'

module.exports = (robot, scripts) ->
  robot.loadFile(path.resolve(__dirname, "src"), "heroku-commander.coffee")
