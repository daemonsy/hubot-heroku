# Description:
#   Selectively exposes some Heroku commands to hubot
#
# Dependencies:
#   "heroku-client": "^1.9.0"
#
# Configuration:
#   HUBOT_HEROKU_API_KEY
#
# Commands:
#   hubot releases <app> - 10 most recent releases of the app
#   hubot rollback <app> <version> - Rollback to a release
#   hubot restart <app>
#   hubot migrate <app>
# Notes:
#   Very alpha
#
# Author:
#   daemonsy
Heroku = require('heroku-client')
heroku = new Heroku(token: process.env.HUBOT_HEROKU_API_KEY)
_      = require('lodash')


module.exports = (robot) ->
  # Releases
  robot.respond /heroku releases (.*)$/i, (msg) ->
    appName= msg.match[1]
    msg.reply "Getting releases for #{appName}."

    heroku.apps(appName).releases().list (error, releases) ->
      output = []
      if releases
        output.push "Recent releases of #{appName}"

        for release in releases.sort((a, b) -> b.version - a.version)[0..9]
          output.push "v#{release.version} - #{release.description} - #{release.user.email} -  #{release.created_at}"

        msg.send output.join("\n")


  robot.respond /heroku rollback (.*) (.*)$/i, (msg) ->
    appName = msg.match[1]
    version = msg.match[2]

    if version.match(/v\d+$/)
      msg.reply "Telling Heroku to rollback to #{version}"
      app = heroku.apps(appName)
      app.releases().list (error, releases) ->
        release = _.find releases, (release) ->
          "v#{release.version}" ==  version
        return msg.reply "Version #{version} not found for #{appName} :(" unless release

        app.releases().rollback release: release.id, (error, release) ->
          msg.reply "Success! v#{release.version} -> Rollback to #{version}"

  # Restarting Apps
  robot.respond /heroku restart (.*)/i, (msg) ->
    appName = msg.match[1]
    msg.reply "Telling Heroku to restart #{appName}"

    heroku.apps(appName).dynos().restartAll (error, app) ->
      if error
        msg.reply "There's an error restarting #{appName}. #{error.statusCode} - #{error.body.message}"
      else
        msg.reply "Heroku: Restarting #{appName}..."

  # Migration
  robot.respond /heroku migrate (.*)/i, (msg) ->
    appName = msg.match[1]

    msg.reply "Telling Heroku to migrate #{appName}"

    heroku.apps(appName).dynos().create
      command: "rake db:migrate"
      size: "1X"
      attach: true
    , (error, app) ->
      if error
        msg.reply "There's an error migrating #{appName}. #{error.statusCode} - #{error.body.message}"
      else
        msg.reply "Heroku: Running migrations for #{appName}."
        msg.reply "Unfortunately I am not smart enough to tell you more...:no_mouth:"
