let methods = client => ({
  send: ({ message, retry = 0, originalResolve }) =>
    new Promise((resolve, reject) => {
      client.write(`${JSON.stringify(message)}\r\n`);

      let timer = setTimeout(() => {
        console.log("not resolved", message.path);
        return reject("Failed to get response");
      }, 1500);
      //change message.path to item.id which we will increment on each send
      client.when(message.path, data => {
        if (originalResolve) originalResolve(data);
        resolve(data);
        clearTimeout(timer);
      });
    })
});

const connect = () =>
  new Promise(resolve => {
    const net = require("net");

    const client = net.connect({ port: 7272 }, () => resolve(methods(client)));

    let callbacks = {};
    client.when = (key, cb) => (callbacks[key] = cb);

    client.on("end", () => {
      console.log("disconnected from server");
    });

    client.on("data", data => {
      let items = data
        .toString()
        .split(/\r\n/g)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => JSON.parse(item));
      //change item.path to item.id which we will increment on each send
      items.forEach(item => callbacks[item.path](item));
    });
  });

const run = async () => {
  console.time("connect");
  let client = await connect();
  console.timeEnd("connect");

  console.time("save data");
  let items = new Array(500000).fill(0);
  try {
    for (let item in items) {
      await client.send({
        message: {
          path: "blah" + item,
          method: "create_or_replace",
          doc: {
            test: true,
            zach: {
              hello: item == 4900 ? "special json :)" : "yes i am some json"
            }
          }
        }
      });
    }
    console.timeEnd("save data");

    console.time("get data");
    let response2 = await client.send({
      message: {
        path: "blah4900",
        method: "get"
      }
    });
    console.timeEnd("get data");
    console.log("index 4900", response2);
  } catch (e) {
    console.log(e);
  }
};

run();
