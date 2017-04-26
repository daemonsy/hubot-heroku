const slackResponder = require(process.cwd() + "/src/responders/slack");
let { expect } = chai;

describe("Slack Responder", () => {
  console.log(slackResponder)
  describe("say", () => {
    it("sets the thread_ts to message.id for a first threaded reply", () => {
      let msg = {
        message: {
          id: "uuid",
          thread_ts: undefined
        },
        send(message) {
          return message;
        }
      }

      slackResponder(msg).say("Migrating all the apps!");

      expect(msg.message.thread_ts).to.equal("uuid");
    });
  });
});
