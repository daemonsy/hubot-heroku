module.exports = function(msg) {
  return {
    name: "default",
    say(message) {
      msg.reply(message)
    }
  }
}
