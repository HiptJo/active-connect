import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

export function PUT(path: string) {
  return function _PUT(target: any, propertyKey: string) {
    HttpServer.registerPut(new HttpMethod(path, { target, propertyKey }));
  };
}
