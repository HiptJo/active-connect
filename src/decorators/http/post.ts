import { HttpServer } from "../../server/http/server";

export function POST(path: string) {
  return function (target: any, propertyKey: string) {
    HttpServer.registerPost(path, target[propertyKey].bind(target.___data));
  };
}
