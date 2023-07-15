import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

/**
 * Decorator that registers a PUT method on the HTTP server.
 *
 * @param path - The path for the PUT method.
 *
 * @example
 * The following code registers a PUT method on the server.
 *
 * ```
 * @PUT("/example")
 * async putExample(request: HttpRequest): Promise<HttpResponse> {
 *    return {
 *      content: "...",
 *      contentType: "text/plain",
 *      status: 200,
 *      contentEncoding: "binary" // supports "base64"
 *    }
 * }
 * ```
 */
export function PUT(path: string) {
  return function _PUT(target: any, propertyKey: string) {
    HttpServer.registerPut(new HttpMethod(path, { target, propertyKey }));
  };
}
