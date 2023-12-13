import { HttpServer } from "../../server/http/server";

export function PUT(path: string) {
  return function _PUT(target: any, propertyKey: string) {
    HttpServer.registerPut(path, target[propertyKey].bind(target.___data));
  };
}
