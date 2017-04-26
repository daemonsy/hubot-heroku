const responder = require(process.cwd() + "/src/responder");
let { expect } = chai;

describe("Responder", () => {
  it("chooses a custom responder available for the adapter", () => {
    let msg = {
      robot: {
        adapterName: "slack"
      }
    }

    expect(responder(msg).name).to.equal("slack");
  });


  it("uses the default responder otherwise", () => {
    let msg = {
      robot: {
        adapterName: "pied piper chat"
      }
    }

    expect(responder(msg).name).to.equal("default");
  });
});
