module.exports = function(msg) {
  return {
    name: "slack",
    say(message) {
      if (!msg.message.thread_ts) {
        msg.message.thread_ts = msg.message.id;
      }

      msg.send(message)
    }
  }
}
