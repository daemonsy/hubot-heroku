# description:
#  Entry Point
path = require 'path'

module.exports = (robot, scripts) ->
  robot.loadFile(require.resolve('hubot-auth').slice(0,-13), "index.coffee")
  robot.loadFile(path.resolve(__dirname, "src", "scripts"), "heroku-commands.js")
