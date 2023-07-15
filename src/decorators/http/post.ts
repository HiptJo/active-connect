import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

export function POST(path: string) {
  return function _POST(target: any, propertyKey: string) {
    HttpServer.registerPost(new HttpMethod(path, { target, propertyKey }));
  };
}
