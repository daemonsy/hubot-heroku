hubot-heroku-commander
======================

A hubot library that exposes heroku commands via Heroku's Platform API, with focus of letting non privileged developers carry out tasks around deployments, but not run dangerous commands or get access to the data.

## Background

Under Heroku's permission model, giving someone access to push/promote to production means giving full access to the data as well. This is generally not a good practice and for certain companies, it might be non-compliant.

Our [team](http://engineering.alphasights.com) wanted to let every engineer do deployments without giving production access. We started this by using [atmos/hubot-deploy](https://github.com/atmos/hubot-deploy) and [atmos/heaven](https://github.com/atmos/heaven), but that didn't the ability to run migrations, set config variables etc. heroku-commander was made with this consideration in mind.

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

```
hubot heroku config:set my-hubot HUBOT_ADMIN=dr_evil
# Muhaha, now I'm to use hubot's other commands to take over the world
```

## Installation
1. `npm install hubot-heroku-commander --save`
2. Add `hubot-heroku-commander` to `external-scripts.json` (e.g. `["hubot-heroku-commander", "some-other-plugin"]`)
3. Before deployment, set `HUBOT_HEROKU_API_KEY` to a heroku account's API key. This user must have access to the apps you want to use this script on.
4. The full list of commands can be obtained using `hubot help`. The commands usually follow hubot heroku <action> <app> <extra info>

The API key can be obtained here.

![Heroku API Key Illustration](http://cl.ly/image/2l081V1k1d3g/Screenshot_2014-12-09_21_02_42.png)

## Usage
Use `hubot help` to look for the commands. They are all prefixed by heroku. (e.g. `hubot heroku restart my-app`)
Some commands (hubot help will be a better source of truth):

    hubot heroku releases <app> - Latest 10 releases
    hubot heroku rollback <app> <version> - Rollback to a release
    hubot heroku restart <app> - Restarts the app
    hubot heroku migrate <app> - Runs migrations. Remember to restart the app =)
    hubot heroku config:set <app> <KEY=value> - Set KEY to value. Overrides present key
    hubot heroku config:unset <app> <KEY> - Unsets KEY, does not throw error if key is not present

For example, `hubot heroku config:set API_KEY=12345`

## Troubleshooting
If you get hubot errors, this might help:
- 400  - Bad request. Hit me with an issue
- 401  - Most likely the API key is incorrect or missing
- 402  - According to Heroku, you need to pay them
- 403  - You don't have access to that app. Perhaps it's a typo on the app name?
- 404  - No such API. Hit me with an issue.
- 405+ - Hit me with an issue

Reference the [API documentation](https://devcenter.heroku.com/articles/platform-api-reference) for more information. Search for "Error Responses".

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

## Contributing

PRs and Issues greatly welcomed. Please read [Contributing](https://github.com/daemonsy/hubot-heroku-commander/blob/master/CONTRIBUTING.md) for more information.
