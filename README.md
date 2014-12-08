hubot-heroku-commander
======================

A hubot library that exposes heroku commands via Heroku's Platform API, with focus of letting non privileged developers carry out tasks around deployments, but not run dangerous commands or get access to the data.

## Background

Under Heroku's permission model, giving someone access to push/promote to production means giving full access to the data as well. This is generally not a good practice and for certain companies, it might be non-compliant.

Our [team](http://engineering.alphasights.com) wanted to let every engineer do deployments without giving production access. We started this by using atmos/hubot-deploy and atmos/heaven, but that didn't give us the ability to run migrations, set config variables etc. heroku-commander was made with this consideration in mind.

## Considerations
- It's an opionated helper to get things done on Heroku, not an API client
- Only use Heroku's Platform API, no direct running of commands in Bash
- Test coverage for commands, especially if we're implementing
- Certain commands (such as migrate) only work for Rails now =(
- Actual deployment is not the focus of this robot

By the way, I'm also actively looking for co-contributors!

## What about actual deployments?
Deployment usually involves some form of CI process. Hence it is best suited for a robust solution like Github deployments, where you can set required CI contexts etc.

This robot is focused on letting you run auxiliary commands around the heroku system, so developers don't have to be given production access to independently manage deployments.

## Security
You can set config variables using this. Hence the Heroku API key used should not have access to your hubot instance on Heroku. For example:

> hubot heroku config:set my-hubot HUBOT_ADMIN=dr_evil

## Tests
- Mocha
- Chai for BDD expect syntax

Run tests by running `npm test`

## Debugging

### Get Node Inspector working
```bash
npm install -g node-inspector
node-inspector --no-preload --web-port 8123
```

### Get hubot to run with debugging on
```bash
coffee --nodejs --debug node_modules/.bin/hubot
```

Visit `http://127.0.0.1:8123/debug?port=5858` and use `debugger` statements to pause execution.
