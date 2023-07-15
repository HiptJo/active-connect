import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

export function DELETE(path: string) {
  return function _DELETE(target: any, propertyKey: string) {
    HttpServer.registerDelete(new HttpMethod(path, { target, propertyKey }));
  };
}
