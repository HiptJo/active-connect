import { HttpServer } from "../../server/http/server";

export function GET(path: string) {
  return function _GET(target: any, propertyKey: string) {
    HttpServer.registerGet(path, target[propertyKey].bind(target.___data));
  };
}
