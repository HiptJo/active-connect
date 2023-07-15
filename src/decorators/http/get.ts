import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

export function GET(path: string) {
  return function _GET(target: any, propertyKey: string) {
    HttpServer.registerGet(new HttpMethod(path, { target, propertyKey }));
  };
}
