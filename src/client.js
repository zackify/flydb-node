let callbacks = {};
let id = 0;

let methods = client => ({
  send: ({ messages, kind }) =>
    new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        console.log("not resolved");
        return reject("Failed to get response");
      }, 10000);

      id++;
      client.write(`${JSON.stringify({ kind, messages, id })}\n`);
      //change message.path to item.id which we will increment on each send
      client.when(id, response => {
        resolve(response);
        clearTimeout(timer);
      });
    })
});

const connect = () =>
  new Promise(resolve => {
    const net = require("net");

    const client = net.connect({ port: 7272 }, () => resolve(methods(client)));

    client.when = (key, cb) => (callbacks[key] = cb);

    client.on("end", () => {
      console.log("disconnected from server");
    });

    var buffer = "";
    client.on("data", function(data) {
      buffer += data.toString(); // assuming utf8 data...
      if (data.toString().includes("\n")) {
        let item = JSON.parse(buffer);
        callbacks[item.id](item);
        delete callbacks[item.id];
        buffer = "";
      }
    });
  });

const run = async () => {
  console.time("connect");
  let client = await connect();
  console.timeEnd("connect");

  console.time("save data");
  let items = new Array(1000000).fill(0);
  try {
    await client.send({
      kind: "success_only",
      messages: items.map((_, index) => ({
        path: "blah" + index,
        method: "create_or_replace",
        doc: {
          test: true,
          content:
            "Note that I removed the redundant type specifiers (the turbofish ::<> on collect). You only need to specify the type of the variable or on collect, not both. In fact, all three examples could start with let the_vocabulary: Vec<_> to let the compiler infer the type inside the collection based on the iterator. This is the idiomatic style but I've kept the explicit types for demonstration purposes.",
          zach: {
            hello: index == 4900 ? "special json :)" : "yes i am some json"
          }
        }
      }))
    });

    console.timeEnd("save data");

    console.time("get data");
    let response2 = await client.send({
      messages: [
        {
          path: "blah0",
          method: "get"
        }
      ]
    });
    console.timeEnd("get data");
    console.log("index 4900", response2.messages[0]);
  } catch (e) {
    console.log(e);
  }
};

run();
