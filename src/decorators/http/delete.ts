import { HttpServer } from "../../server/http/server";

export function DELETE(path: string) {
  return function _DELETE(target: any, propertyKey: string) {
    HttpServer.registerDelete(path, target[propertyKey].bind(target.___data));
  };
}
