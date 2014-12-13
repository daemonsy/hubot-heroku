# description:
#  Entry Point
path = require 'path'
require('dotenv').load()

module.exports = (robot, scripts) ->
  robot.loadFile(path.resolve(__dirname, "src", "scripts"), "heroku-commands.coffee")
