# description:
#  Entry Point
path = require 'path'

module.exports = (robot, scripts) ->
  robot.loadFile(path.resolve(__dirname, "node_modules", "hubot-auth"), "index.coffee")
  robot.loadFile(path.resolve(__dirname, "src", "scripts"), "heroku-commands.coffee")
