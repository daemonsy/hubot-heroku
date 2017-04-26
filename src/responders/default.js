module.exports = function(msg) {
  return {
    say(message) {
      msg.reply(message)
    }
  }
}
