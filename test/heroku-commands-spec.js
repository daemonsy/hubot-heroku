require('dotenv').load();

HubotHelper = require("hubot-test-helper")
path = require("path")
chai = require("chai")
nock = require("nock")

process.env.HUBOT_HEROKU_API_KEY = 'fake_key';
process.env.HUBOT_AUTH_ADMIN = 1;
let { expect } = chai;

var waitForReplies = (number, room, callback) =>
  setTimeout(function() {
    if (room && (room.messages.length >= number)) {
      return callback(room);
    } else {
      return waitForReplies(number, room, callback);
    }
  })
;

describe("Heroku Commands", function() {
  let helper = new HubotHelper("../index.coffee");
  let room = null;
  let mockHeroku = nock("https://api.heroku.com");

  beforeEach(() => room = helper.createRoom());

  afterEach(function() {
    room.destroy();
    return nock.cleanAll();
  });

  it("exposes help commands", function() {
    let commands = room.robot.commands.filter(command => command.slice(0,12) === "hubot heroku");

    expect(commands).to.have.length(12);

    expect(commands).to.include("hubot heroku info <app> - Returns useful information about the app");
    expect(commands).to.include("hubot heroku list apps <app name filter> - Lists all apps or filtered by the name");
    expect(commands).to.include("hubot heroku dynos <app> - Lists all dynos and their status");
    expect(commands).to.include("hubot heroku releases <app> - Latest 10 releases");
    expect(commands).to.include("hubot heroku rollback <app> <version> - Rollback to a release");
    expect(commands).to.include("hubot heroku restart <app> <dyno> - Restarts the specified app or dyno/s (e.g. worker or web.2)");
    expect(commands).to.include("hubot heroku migrate <app> - Runs migrations. Remember to restart the app =)");
    expect(commands).to.include("hubot heroku config <app> - Get config keys for the app. Values not given for security");
    expect(commands).to.include("hubot heroku config:set <app> <KEY=value> - Set KEY to value. Case sensitive and overrides present key");
    expect(commands).to.include("hubot heroku config:unset <app> <KEY> - Unsets KEY, does not throw error if key is not present");
    expect(commands).to.include("hubot heroku run rake <app> <task> - Runs a specific rake task");
    return expect(commands).to.include("hubot heroku ps:scale <app> <type>=<size>(:<quantity>) - Scales dyno quantity up or down");
  });

  describe("heroku list apps <app name>", function() {
    beforeEach(() =>
      mockHeroku
        .get("/apps")
        .replyWithFile(200, __dirname + "/fixtures/app-list.json")
    );

    describe("when given an argument <app name>", () =>
      it("returns a list of the apps filtered by <app name>", function(done) {
        room.user.say("Damon", "hubot heroku list apps staging");

        return waitForReplies(3, room, function() {
          expect(room.messages[1][1]).to.equal("@Damon Listing apps matching: staging");
          expect(room.messages[2][1]).to.not.contain(/shield-global-watch\b/);
          expect(room.messages[2][1]).to.contain("shield-global-watch-staging");

          return done();
        });
      })
    );

    return describe("when the command is called without arguments" , () =>
      it("returns a list of all apps", function(done) {
        room.user.say("Damon", "hubot heroku list apps");

        return waitForReplies(3, room, function() {
          expect(room.messages[1][1]).to.equal("@Damon Listing all apps available...");
          expect(room.messages[2][1]).to.match(/shield-global-watch\b/);
          expect(room.messages[2][1]).to.contain("shield-global-watch-staging");

          return done();
        });
      })
    );
  });


  describe("heroku info <app>", () =>
    it("gets information about the app's dynos", function(done) {
      mockHeroku
        .get("/apps/shield-global-watch")
        .replyWithFile(200, __dirname + "/fixtures/app-info.json");

      room.user.say("Damon", "hubot heroku info shield-global-watch");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Getting information about shield-global-watch");
        expect(room.messages[2][1]).to.contain("last_release : 2014-12-12T02:16:59Z");
        return done();
      });
    })
  );


  describe("heroku dynos <app>", () =>
    it("lists all dynos and their status", function(done) {
      mockHeroku
        .get("/apps/shield-global-watch/dynos")
        .replyWithFile(200, __dirname + "/fixtures/dynos.json");

      room.user.say("Damon", "hubot heroku dynos shield-global-watch");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Getting dynos of shield-global-watch");
        expect(room.messages[2][1]).to.include("@Damon Dynos of shield-global-watch\n=== web (1X): `forever server.js`\nweb.1: up 2015/01/01 12:00:00");
        expect(room.messages[2][1]).to.include("\nweb.2: crashed 2015/01/01 12:00:00");
        expect(room.messages[2][1]).to.include("\n\n=== worker (2X): `celery worker`\nworker.1: up 2015/06/01 12:00:00");

        return done();
      });
    })
  );

  describe("heroku releases <app>", () =>
    it("gets the 10 recent releases", function(done) {
      mockHeroku
        .get("/apps/shield-global-watch/releases")
        .replyWithFile(200, __dirname + "/fixtures/releases.json");

      room.user.say("Damon", "hubot heroku releases shield-global-watch");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Getting releases for shield-global-watch");
        expect(room.messages[2][1]).to.include("@Damon Recent releases of shield-global-watch\nv352 - Promote shield-global-watch v287 fb2b5ff - phil@shield.com");

        return done();
      });
    })
  );


  describe("heroku rollback <app> <version>", function() {
    beforeEach(function() {
      mockHeroku
        .get("/apps/shield-global-watch/releases")
        .replyWithFile(200, __dirname + "/fixtures/releases.json");

      return mockHeroku
        .post('/apps/shield-global-watch/releases')
        .replyWithFile(200,  __dirname + "/fixtures/rollback.json");
    });

    it("rolls back the app to the specified version", function(done) {
      room.user.say("Damon", "hubot heroku rollback shield-global-watch v352");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to rollback to v352");
        expect(room.messages[2][1]).to.equal("@Damon Success! v353 -> Rollback to v352");

        return done();
      });
    });

    return it("tells the user about a bad supplied version", function(done) {
      room.user.say("Damon", "hubot heroku rollback shield-global-watch v999");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to rollback to v999");
        expect(room.messages[2][1]).to.equal("@Damon Version v999 not found for shield-global-watch :(");

        return done();
      });
    });
  });

  describe("heroku restart <app> <dyno>", function() {
    it("restarts the app", function(done) {
      mockHeroku
        .delete("/apps/shield-global-watch/dynos")
        .reply(200, {});

      room.user.say("Damon", "hubot heroku restart shield-global-watch");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch");

        return done();
      });
    });

    it("restarts all dynos of a process", function(done) {
      mockHeroku
        .delete("/apps/shield-global-watch/dynos/web")
        .reply(200, {});

      room.user.say("Damon", "hubot heroku restart shield-global-watch web");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch web");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch web");

        return done();
      });
    });

    return it("restarts specific dynos", function(done) {
      mockHeroku
        .delete("/apps/shield-global-watch/dynos/web.1")
        .reply(200, {});

      room.user.say("Damon", "hubot heroku restart shield-global-watch web.1");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to restart shield-global-watch web.1");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Restarting shield-global-watch web.1");

        return done();
      });
    });
  });

  describe("heroku migrate <app>", function() {
    beforeEach(function() {
      mockHeroku
        .post("/apps/shield-global-watch/dynos", {
          command: "rake db:migrate",
          attach: false
        }
        ).replyWithFile(200, __dirname + "/fixtures/migrate.json");

      mockHeroku
        .post("/apps/shield-global-watch/log-sessions", {
          dyno: "run.6454",
          tail: true
        }
        ).replyWithFile(200, __dirname + "/fixtures/log-session.json");

      return room.user.say("Damon", "hubot heroku migrate shield-global-watch");
    });

    it("runs migrations", done =>
      waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to migrate shield-global-watch");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Running migrations for shield-global-watch");

        return done();
      })
    );

    return it("returns the logplex_url", done =>
      waitForReplies(4, room, function() {
        expect(room.messages[3][1]).to.equal("@Damon View logs at: https://logplex.heroku.com/sessions/9d4f18cd-d9k8-39a5-ddef-a47dfa443z74?srv=1418011757");

        return done();
      })
    );
  });

  describe("heroku config <app>", () =>
    it("gets a list of config keys without values", function(done) {
      mockHeroku
        .get("/apps/shield-global-watch/config-vars")
        .replyWithFile(200, __dirname + "/fixtures/config.json");

      room.user.say("Damon", "hubot heroku config shield-global-watch");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Getting config keys for shield-global-watch");
        expect(room.messages[2][1]).to.equal("@Damon CLOAK, COMMANDER, AUTOPILOT, PILOT_NAME");

        return done();
      });
    })
  );

  describe("heroku config:set <app> <KEY=value>", function() {
    let mockRequest = keyPair =>
      mockHeroku
        .patch("/apps/shield-global-watch/config-vars",keyPair)
        .replyWithFile(200, __dirname + "/fixtures/config-set.json")
    ;

    it("sets config <KEY=value>", function(done) {
      mockRequest({ "CLOAK_ID": "example.com" });

      room.user.say("Damon", "hubot heroku config:set shield-global-watch CLOAK_ID=example.com");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Setting config CLOAK_ID => example.com");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: CLOAK_ID is set to example.com");

        return done();
      });
    });

    it("handles UUIDs", function(done) {
      mockRequest({"UUID": "d5126f0d-b3be-46af-883f-b330a73964f9"});

      room.user.say("Damon", "hubot heroku config:set shield-global-watch UUID=d5126f0d-b3be-46af-883f-b330a73964f9");

      return waitForReplies(3, room, function() {
        expect(room.messages[2][1]).to.equal("@Damon Heroku: UUID is set to d5126f0d-b3be-46af-883f-b330a73964f9");

        return done();
      });
    });

    it("handles URLs", function(done) {
      mockRequest({"PUSHER_URL": "http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234"});

      room.user.say("Damon", "hubot heroku config:set shield-global-watch PUSHER_URL=http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234");

      return waitForReplies(3, room, function() {
        expect(room.messages[2][1]).to.equal("@Damon Heroku: PUSHER_URL is set to http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234");

        return done();
      });
    });

    it("handles comma delimited strings", function(done) {
      mockRequest({"COMMA_DELIMITED_STRING": "MiD,DA,MDe"});

      room.user.say("Damon", "hubot heroku config:set shield-global-watch COMMA_DELIMITED_STRING=MiD,DA,MDe");

      return waitForReplies(3, room, function() {
        expect(room.messages[2][1]).to.equal("@Damon Heroku: COMMA_DELIMITED_STRING is set to MiD,DA,MDe");

        return done();
      });
    });

    it("handles text strings", function(done) {
      mockRequest({"SENTENCE": "Don\'t stop believin."});

      room.user.say("Damon", "hubot heroku config:set shield-global-watch SENTENCE=\"Don't stop believin.\"");

      return waitForReplies(3, room, function() {
        expect(room.messages[2][1]).to.equal("@Damon Heroku: SENTENCE is set to Don\'t stop believin.");

        return done();
      });
    });

    return it("handles RSA secret keys", function(done) {
      mockRequest({"RSA_SECRET_KEY": "----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n"});

      room.user.say("Damon", "hubot heroku config:set shield-global-watch RSA_SECRET_KEY=\"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\"");

      return waitForReplies(3, room, function() {
        expect(room.messages[2][1]).to.equal("@Damon Heroku: RSA_SECRET_KEY is set to \"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\"");

        return done();
      });
    });
  });

  describe("heroku config:unset <KEY>", () =>
    it("unsets config <KEY>", function(done) {
      mockHeroku
        .patch("/apps/shield-global-watch/config-vars",
          {"CLOAK_ID": null}
        ).reply(200, {});

      room.user.say("Damon", "hubot heroku config:unset shield-global-watch CLOAK_ID");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Unsetting config CLOAK_ID");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: CLOAK_ID has been unset");

        return done();
      });
    })
  );

  describe("heroku run rake <app>", function() {
    beforeEach(function() {
      mockHeroku
        .post("/apps/shield-global-watch/dynos", {
          command: "rake some:task",
          attach: false
        }
        ).replyWithFile(200, __dirname + "/fixtures/run-rake.json");

      mockHeroku
        .post("/apps/shield-global-watch/log-sessions", {
          dyno: "run.6454",
          tail: true
        }
        ).replyWithFile(200, __dirname + "/fixtures/log-session.json");

      return room.user.say("Damon", "hubot heroku run rake shield-global-watch some:task");
    });

    it("runs migrations", done =>
      waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to.equal("@Damon Telling Heroku to run `rake some:task` on shield-global-watch");
        expect(room.messages[2][1]).to.equal("@Damon Heroku: Running `rake some:task` for shield-global-watch");

        return done();
      })
    );

    return it("returns the logplex_url", done =>
      waitForReplies(4, room, function() {
        expect(room.messages[3][1]).to.equal("@Damon View logs at: https://logplex.heroku.com/sessions/9d4f18cd-d9k8-39a5-ddef-a47dfa443z74?srv=1418011757");

        return done();
      })
    );
  });

  return describe("heroku ps:scale", function() {
    let mockRequest = formation =>
      mockHeroku
        .patch("/apps/shield-global-watch/formation/web", formation)
        .replyWithFile(200, __dirname + "/fixtures/ps-scale.json")
    ;

    it("scales dynos", function() {
      mockRequest({quantity: "2"});

      room.user.say("Damon", "hubot heroku ps:scale shield-global-watch web=2");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to(equal("@Damon Telling Heroku to scale web dynos of shield-global-watch"));
        expect(room.messages[2][1]).to(equal("@Damon Heroku: now running web at 2:standard-2X"));

        return done();
      });
    });

    return it("scales and resizes dynos", function() {
      mockRequest({quantity: "2", size: "standard-2x"});

      room.user.say("Damon", "hubot heroku ps:scale shield-global-watch web=2:standard-2X");

      return waitForReplies(3, room, function() {
        expect(room.messages[1][1]).to(equal("@Damon Telling Heroku to scale web dynos of shield-global-watch"));
        expect(room.messages[2][1]).to(equal("@Damon Heroku: now running web at 2:standard-2X"));

        return done();
      });
    });
  });
});
