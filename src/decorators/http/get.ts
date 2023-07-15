import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

/**
 * @decorator
 * Decorator that registers a GET method on the HTTP server.
 *
 * @param path - The path for the GET method.
 *
 * @example
 * The following code registers a GET method on the server.
 *
 * ```
 * @GET("/example")
 * async getExample(request: HttpRequest): Promise<HttpResponse> {
 *    return {
 *      content: "...",
 *      contentType: "text/plain",
 *      status: 200,
 *      contentEncoding: "binary" // supports "base64"
 *    }
 * }
 * ```
 */
export function GET(path: string) {
  return function _GET(target: any, propertyKey: string) {
    HttpServer.registerGet(new HttpMethod(path, { target, propertyKey }));
  };
}
