const slackResponder = require("./responders/slack");
const defaultResponder = require("./responders/default");

const RESPONDERS = {
  slack: slackResponder,
  default: defaultResponder
}

module.exports = function(msg) {
  let responder = RESPONDERS[msg.adapterName] || RESPONDERS.default;

  return responder(msg);
}
