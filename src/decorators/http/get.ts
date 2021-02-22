import { HttpServer } from "../../server/http/server";

export function GET(path: string) {
  return function (target: any, propertyKey: string) {
    HttpServer.registerGet(path, target[propertyKey].bind(target.___data));
  };
}
