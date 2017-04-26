module.exports = function(msg) {
  return {
    say(message) {
      if (!msg.message.thread_ts) {
        msg.message.thread_ts = msg.message.id;
      }

      msg.send(message)
    }
  }
}
