console.error = (...str) => {};

function fail(msg?: string) {
  throw Error("Test not successful (fail)" + (msg ? ": " + msg : ""));
}
global.fail = fail;
