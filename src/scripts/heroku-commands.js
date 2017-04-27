// Description:
//   Exposes Heroku commands to hubot
//
// Dependencies:
//   "heroku-client": "^1.9.0"
//   "hubot-auth": "^1.2.0"
//
// Configuration:
//   HUBOT_HEROKU_API_KEY
//
// Commands:
//   hubot heroku list apps <app name filter> - Lists all apps or filtered by the name
//   hubot heroku info <app> - Returns useful information about the app
//   hubot heroku dynos <app> - Lists all dynos and their status
//   hubot heroku releases <app> - Latest 10 releases
//   hubot heroku rollback <app> <version> - Rollback to a release
//   hubot heroku restart <app> <dyno> - Restarts the specified app or dyno/s (e.g. worker or web.2)
//   hubot heroku migrate <app> - Runs migrations. Remember to restart the app =)
//   hubot heroku config <app> - Get config keys for the app. Values not given for security
//   hubot heroku config:set <app> <KEY=value> - Set KEY to value. Case sensitive and overrides present key
//   hubot heroku config:unset <app> <KEY> - Unsets KEY, does not throw error if key is not present
//   hubot heroku run <command> <app> <task> - Runs a one off task. Only rake and thor is allowed currently
//   hubot heroku ps:scale <app> <type>=<size>(:<quantity>) - Scales dyno quantity up or down
//
// Author:
//   daemonsy

const Heroku = require('heroku-client');
const objectToMessage = require("../object-to-message");
const responder = require("../responder");
const commandsWhitelist = require("../values/commands-whitelist");

let heroku = new Heroku({ token: process.env.HUBOT_HEROKU_API_KEY });
const _ = require('lodash');
const moment = require('moment');
let useAuth = (process.env.HUBOT_HEROKU_USE_AUTH || '').trim().toLowerCase() === 'true';

module.exports = function(robot) {
  let auth = function(msg, appName) {
    let hasRole, role;
    if (appName) {
      role = `heroku-${appName}`;
      hasRole = robot.auth.hasRole(msg.envelope.user, role);
    }

    let isAdmin = robot.auth.hasRole(msg.envelope.user, 'admin');

    if (useAuth && !(hasRole || isAdmin)) {
      responder(msg).say(`Access denied. You must have this role to use this command: ${role}`);
      return false;
    }
    return true;
  };

  let respondToUser = function(robotMessage, error, successMessage) {
    if (error) {
      console.log("There is error!", error);
      return robotMessage.reply(`Shucks. An error occurred. ${error.statusCode} - ${error.body.message}`);
    } else {
      return robotMessage.reply(successMessage);
    }
  };

  // App List
  robot.respond(/(heroku list apps)\s?(.*)/i, function(msg) {
    let searchName;
    if (!auth(msg)) { return; }

    if (msg.match[2].length > 0) { searchName = msg.match[2]; }

    if (searchName) {
      responder(msg).say(`Listing apps matching: ${searchName}`);
    } else {
      responder(msg).say("Listing all apps available...");
    }

    return heroku.get(`/apps`).then((list) => {
      list = list.filter(item => item.name.match(new RegExp(searchName, "i")));

      let result = list.length > 0 ? list.map(app => objectToMessage(app, "appShortInfo")).join("\n\n") : "No apps found";

      return responder(msg).say(result);
    });
  });

  // App Info
  robot.respond(/heroku info (.*)/i, function(msg) {
    if (!auth(msg, appName)) { return; }

    var appName = msg.match[1];
    responder(msg).say(`Getting information about ${appName}`);

    return heroku.get(`/apps/${appName}`).then(function(info) {
      let successMessage = `\n${objectToMessage(info, "info")}`;
      return responder(msg).say(successMessage);
    });
  });

  // Dynos
  robot.respond(/heroku dynos (.*)/i, function(msg) {
    let appName = msg.match[1];

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Getting dynos of ${appName}`);

    return heroku.get(`/apps/${appName}/dynos`).then((dynos) => {
      let output = [];
      if (dynos) {
        output.push(`Dynos of ${appName}`);
        let lastFormation = "";

        for (let dyno of Array.from(dynos)) {
          let currentFormation = `${dyno.type}.${dyno.size}`;

          if (currentFormation !== lastFormation) {
            if (lastFormation) { output.push(""); }
            output.push(`=== ${dyno.type} (${dyno.size}): \`${dyno.command}\``);
            lastFormation = currentFormation;
          }

          let updatedAt = moment(dyno.updated_at);
          let updatedTime = updatedAt.utc().format('YYYY/MM/DD HH:mm:ss');
          let timeAgo = updatedAt.fromNow();
          output.push(`${dyno.name}: ${dyno.state} ${updatedTime} (~ ${timeAgo})`);
        }
      }

      responder(msg).say(output.join("\n"));
    });
  });

  // Releases
  robot.respond(/heroku releases (--app .+|.+$)/i, function(msg) {
    let appName = msg.match[1].replace("--app", "").trim();

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Getting recent releases for ${appName}`);
    heroku.get(`/apps/${appName}/releases`, { partial: true, headers: { "Range": "version ..; order=desc,max=10" } }).then(releases => {
      let output = [];
      if (releases) {
        output.push(`Recent releases of ${appName}`);

        for (let release of Array.from(releases.sort((a, b) => b.version - a.version).slice(0, 10))) {
          output.push(`v${release.version} - ${release.description} - ${release.user.email} -  ${release.created_at}`);
        }
      }

      responder(msg).say(output.join("\n"));
    });
  });

  // Rollback
  robot.respond(/heroku rollback (.*) (.*)$/i, function(msg) {
    let appName = msg.match[1];
    let version = msg.match[2];

    if (!auth(msg, appName)) { return; }

    if (version.match(/v\d+$/)) {
      responder(msg).say(`Rolling back to ${version}`);

      heroku.get(`/apps/${appName}/releases`).then(releases => {
        let release = _.find(releases, release => `v${release.version}` ===  version);

        if (!release) { throw `Version ${version} not found for ${appName} :(`; }

        return heroku.post(`/apps/${appName}/releases`, { body: { release: release.id } });
      }).then(release => responder(msg).say(`Success! v${release.version} -> Rollback to ${version}`))
        .catch(error => responder(msg).say(error));
    }
  });

  // Restart
  robot.respond(/heroku restart ([\w-]+)\s?(\w+(?:\.\d+)?)?/i, function(msg) {
    let appName = msg.match[1];
    let dynoName = msg.match[2];
    let dynoNameText = dynoName ? ` ${dynoName}` : '';

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Telling Heroku to restart ${appName}${dynoNameText}`);

    if (!dynoName) {
      heroku.delete(`/apps/${appName}/dynos`).then(app => responder(msg).say(`Heroku: Restarting ${appName}${dynoNameText}`));
    } else {
      heroku.delete(`/apps/${appName}/dynos/${dynoName}`).then(app => responder(msg).say(`Heroku: Restarting ${appName}${dynoNameText}`));
    }
  });

  // Migration
  robot.respond(/heroku migrate (.*)/i, function(msg) {
    let appName = msg.match[1];

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Telling Heroku to migrate ${appName}`);

    heroku.post(`/apps/${appName}/dynos`, {
      body: {
        command: "rake db:migrate",
        attach: false
      }
    }).then(dyno => {
      responder(msg).say(`Heroku: Running migrations for ${appName}`);

      return heroku.post(`/apps/${appName}/log-sessions`, {
        body: {
          dyno: dyno.name,
          tail: true
        }
      })
    }).then(session => responder(msg).say(`View logs at: ${session.logplex_url}`));
  });

  // Config Vars
  robot.respond(/heroku config (.*)$/i, function(msg) {
    let appName = msg.match[1];

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Getting config keys for ${appName}`);

    heroku.get(`/apps/${appName}/config-vars`).then((configVars) => {
      let listOfKeys = configVars && Object.keys(configVars).join(", ");
      responder(msg).say(listOfKeys);
    });
  });

  robot.respond(/heroku config:set (.*) (\w+)=('([\s\S]+)'|"([\s\S]+)"|([\s\S]+\b))/im, function(msg) {
    let keyPair = {};

    let appName = msg.match[1];
    let key     = msg.match[2];
    let value   = msg.match[4] || msg.match[5] || msg.match[6]; // :sad_panda:

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Setting config ${key} => ${value}`);

    keyPair[key] = value;

    heroku.patch(`/apps/${appName}/config-vars`, { body: keyPair })
      .then(configVars => responder(msg).say(`Heroku: ${key} is set to ${configVars[key]}`));
  })

  robot.respond(/heroku config:unset (.*) (\w+)$/i, function(msg) {
    let keyPair = {};
    let appName = msg.match[1];
    let key     = msg.match[2];

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Unsetting config ${key}`);

    keyPair[key] = null;

    heroku.patch(`/apps/${appName}/config-vars`, {body: keyPair}).then(response => responder(msg).say(`Heroku: ${key} has been unset`));
  });


  // Run <command> <task> <app>
  robot.respond(/heroku run (\w+) (.+) (?:--app .+|(.+)$)/i, function(msg) {
    let command = msg.match[1].toLowerCase();
    let task = msg.match[2].replace("--app", "").trim();
    let appName = msg.match[3];

    if (!commandsWhitelist.includes(command)) { return responder(msg).say("only rake and thor is supported"); }
    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Telling Heroku to run \`${command} ${task}\` on ${appName}`);

    heroku.post(`/apps/${appName}/dynos`, {
      body: {
        command: `${command} ${task}`,
        attach: false
      }
    }).then(dyno => {
      responder(msg).say(`Heroku: Running \`${command} ${task}\` for ${appName}`);

      return heroku.post(`/apps/${appName}/log-sessions`, {
        body: {
          dyno: dyno.name,
          tail: true
        }
      })
    }).then(session => responder(msg).say(`View logs at: ${session.logplex_url}`));
  });

  // Formations
  robot.respond(/heroku ps:scale (.+) ([^=]+)=([^:]+)(:.*)?$/i, function(msg) {
    let parameters = {};
    let appName = msg.match[1];
    let type = msg.match[2];
    parameters.quantity = msg.match[3];

    if (msg.match[4]) { parameters.size = msg.match[4].substring(1); }

    if (!auth(msg, appName)) { return; }

    responder(msg).say(`Telling Heroku to scale ${type} dynos of ${appName}`);

    heroku.patch(`/apps/${appName}/formation/${type}`, { body: parameters }).then(formation => {
      responder(msg).say(`Heroku: now running ${formation.type} at ${formation.quantity}:${formation.size}`);
    });
  });
};
