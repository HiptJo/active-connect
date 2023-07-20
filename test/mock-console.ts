import { WebsocketOutbounds } from "../src";

console.error = (...str) => {};
require("../src/jest/jest-tools/fail");
WebsocketOutbounds.initCachingResponseEntrypoint();
