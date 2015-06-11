require('dotenv').load()

HubotHelper = require("hubot-test-helper")
path = require("path")
chai = require("chai")
nock = require("nock")

process.env.HUBOT_HEROKU_API_KEY = 'fake_key'

{ expect } = chai

describe "Heroku Commands", ->

  helper = new HubotHelper("../index.coffee")
  room = helper.createRoom()
  mockHeroku = nock("https://api.heroku.com")
  duration = 5

  beforeEach ->
    room.messages = []

  afterEach ->
    nock.cleanAll()

  it "exposes help commands", ->
    commands = room.robot.commands

    expect(commands).to.have.length(9)

    expect(commands).to.include("hubot heroku info <app> - Returns useful information about the app")
    expect(commands).to.include("hubot heroku dynos <app> - Lists all dynos and their status")
    expect(commands).to.include("hubot heroku releases <app> - Latest 10 releases")
    expect(commands).to.include("hubot heroku rollback <app> <version> - Rollback to a release")
    expect(commands).to.include("hubot heroku restart <app> <dyno> - Restarts the specified app or dyno/s (e.g. worker or web.2)")
    expect(commands).to.include("hubot heroku migrate <app> - Runs migrations. Remember to restart the app =)")
    expect(commands).to.include("hubot heroku config <app> - Get config keys for the app. Values not given for security")
    expect(commands).to.include("hubot heroku config:set <app> <KEY=value> - Set KEY to value. Case sensitive and overrides present key")
    expect(commands).to.include("hubot heroku config:unset <app> <KEY> - Unsets KEY, does not throw error if key is not present")

  describe "heroku info <app>", ->
    it "gets information about the app's dynos", (done) ->
      mockHeroku
        .get("/apps/shield-global-watch")
        .replyWithFile(200, __dirname + "/fixtures/app-info.json")

      room.user.say "Damon", "hubot heroku info shield-global-watch"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Getting information about shield-global-watch")
        expect(room.messages[2][1]).to.contain("last_release : 2014-12-12T02:16:59Z")
        done()
      , duration)

  describe "heroku dynos <app>", ->
    it "lists all dynos and their status", (done) ->
      mockHeroku
        .get("/apps/shield-global-watch/dynos")
        .replyWithFile(200, __dirname + "/fixtures/dynos.json")

      room.user.say "Damon", "hubot heroku dynos shield-global-watch"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Getting dynos of shield-global-watch")
        expect(room.messages[2][1]).to.include("@Damon Dynos of shield-global-watch\n=== web (1X): `forever server.js`\nweb.1: up 2015/01/01 12:00:00")
        expect(room.messages[2][1]).to.include("\nweb.2: crashed 2015/01/01 12:00:00")
        expect(room.messages[2][1]).to.include("\n\n=== worker (2X): `celery worker`\nworker.1: up 2015/06/01 12:00:00")
        done()
      , duration)

  describe "heroku releases <app>", ->
    it "gets the 10 recent releases", (done) ->
      mockHeroku
        .get("/apps/shield-global-watch/releases")
        .replyWithFile(200, __dirname + "/fixtures/releases.json")

      room.user.say "Damon", "hubot heroku releases shield-global-watch"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Getting releases for shield-global-watch")
        expect(room.messages[2][1]).to.include("@Damon Recent releases of shield-global-watch\nv352 - Promote shield-global-watch v287 fb2b5ff - phil@shield.com")
        done()
      , duration)


  describe "heroku rollback <app> <version>", ->
    beforeEach ->
      mockHeroku
        .get("/apps/shield-global-watch/releases")
        .replyWithFile(200, __dirname + "/fixtures/releases.json")

      mockHeroku
        .post('/apps/shield-global-watch/releases')
        .replyWithFile(200,  __dirname + "/fixtures/rollback.json",)

    it "rolls back the app to the specified version", (done) ->
      room.user.say "Damon", "hubot heroku rollback shield-global-watch v352"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to rollback to v352")
        expect(room.messages[2][1]).to.equal("@Damon Success! v353 -> Rollback to v352")
        done()
      , duration)

    it "tells the user about a bad supplied version", (done) ->
      room.user.say "Damon", "hubot heroku rollback shield-global-watch v999"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to rollback to v999")
        expect(room.messages[2][1]).to.equal("@Damon Version v999 not found for shield-global-watch :(")
        done()
      , duration)

  describe "heroku restart <app> <dyno>", ->
    it "restarts the app", (done) ->
      mockHeroku
        .delete("/apps/shield-global-watch/dynos")
        .reply(200, {})

      room.user.say "Damon", "hubot heroku restart shield-global-watch"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch")
        done()
      , duration)

    it "restarts all dynos of a process", (done) ->
      mockHeroku
        .delete("/apps/shield-global-watch/dynos/web")
        .reply(200, {})

      room.user.say "Damon", "hubot heroku restart shield-global-watch web"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch web")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch web")
        done()
      , duration)

    it "restarts specific dynos", (done) ->
      mockHeroku
        .delete("/apps/shield-global-watch/dynos/web.1")
        .reply(200, {})

      room.user.say "Damon", "hubot heroku restart shield-global-watch web.1"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch web.1")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch web.1")
        done()
      , duration)

  describe "heroku migrate <app>", ->
    beforeEach ->
      mockHeroku
        .post("/apps/shield-global-watch/dynos",
          command: "rake db:migrate"
          attach: false
          size: "1X"
        ).replyWithFile(200, __dirname + "/fixtures/migrate.json")

      mockHeroku
        .post("/apps/shield-global-watch/log-sessions",
          dyno: "run.6454"
          tail: true
        ).replyWithFile(200, __dirname + "/fixtures/log-session.json")

      room.user.say "Damon", "hubot heroku migrate shield-global-watch"

    it "runs migrations", (done) ->
      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to migrate shield-global-watch")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Running migrations for shield-global-watch")
        done()
      , duration)

    it "returns the logplex_url", (done) ->
      setTimeout(->
        expect(room.messages[3][1]).to.equal("@Damon View logs at: https://logplex.heroku.com/sessions/9d4f18cd-d9k8-39a5-ddef-a47dfa443z74?srv=1418011757")
        done()
      , duration)

  describe "heroku config <app>", ->
    it "gets a list of config keys without values", (done) ->
      mockHeroku
        .get("/apps/shield-global-watch/config-vars")
        .replyWithFile(200, __dirname + "/fixtures/config.json")

      room.user.say "Damon", "hubot heroku config shield-global-watch"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Getting config keys for shield-global-watch")
        expect(room.messages[2][1]).to.equal("@Damon CLOAK, COMMANDER, AUTOPILOT, PILOT_NAME")
        done()
      , duration)

  describe "heroku config:set <app> <KEY=value>", ->
    mockRequest = (keyPair) ->
      mockHeroku
        .patch("/apps/shield-global-watch/config-vars",keyPair)
        .replyWithFile(200, __dirname + "/fixtures/config-set.json")

    it "sets config <KEY=value>", (done) ->
      mockRequest({ "CLOAK_ID": "example.com" })

      room.user.say "Damon", "hubot heroku config:set shield-global-watch CLOAK_ID=example.com"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Setting config CLOAK_ID => example.com")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: CLOAK_ID is set to example.com")
        done()
      , duration)

    it "handles UUIDs", (done) ->
      mockRequest("UUID": "d5126f0d-b3be-46af-883f-b330a73964f9")

      room.user.say "Damon", "hubot heroku config:set shield-global-watch UUID=d5126f0d-b3be-46af-883f-b330a73964f9"

      setTimeout(->
        expect(room.messages[2][1]).to.equal("@Damon Heroku: UUID is set to d5126f0d-b3be-46af-883f-b330a73964f9")
        done()
      , duration)

    it "handles URLs", (done) ->
      mockRequest("PUSHER_URL": "http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234")

      room.user.say "Damon", "hubot heroku config:set shield-global-watch PUSHER_URL=http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234"

      setTimeout(->
        expect(room.messages[2][1]).to.equal("@Damon Heroku: PUSHER_URL is set to http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234")
        done()
      , duration)

    it "handles comma delimited strings", (done) ->
      mockRequest("COMMA_DELIMITED_STRING": "MiD,DA,MDe")

      room.user.say "Damon", "hubot heroku config:set shield-global-watch COMMA_DELIMITED_STRING=MiD,DA,MDe"

      setTimeout(->
        expect(room.messages[2][1]).to.equal("@Damon Heroku: COMMA_DELIMITED_STRING is set to MiD,DA,MDe")
        done()
      , duration)

    it "handles text strings", (done) ->
      mockRequest("SENTENCE": "Don\'t stop believin.")

      room.user.say "Damon", "hubot heroku config:set shield-global-watch SENTENCE=\"Don't stop believin.\""

      setTimeout(->
        expect(room.messages[2][1]).to.equal("@Damon Heroku: SENTENCE is set to Don\'t stop believin.")
        done()
      , duration)

    it "handles RSA secret keys", (done) ->
      mockRequest("RSA_SECRET_KEY": "----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n")

      room.user.say "Damon", "hubot heroku config:set shield-global-watch RSA_SECRET_KEY=\"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\""

      setTimeout(->
        expect(room.messages[2][1]).to.equal("@Damon Heroku: RSA_SECRET_KEY is set to \"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\"")
        done()
      , duration)


  describe "heroku config:unset <KEY>", ->
    it "unsets config <KEY>", (done) ->
      mockHeroku
        .patch("/apps/shield-global-watch/config-vars",
          "CLOAK_ID": null
        ).reply(200, {})

      room.user.say "Damon", "hubot heroku config:unset shield-global-watch CLOAK_ID"

      setTimeout(->
        expect(room.messages[1][1]).to.equal("@Damon Unsetting config CLOAK_ID")
        expect(room.messages[2][1]).to.equal("@Damon Heroku: CLOAK_ID has been unset")
        done()
      , duration)
