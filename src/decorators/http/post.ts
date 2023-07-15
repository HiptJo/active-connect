import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

/**
 * @decorator
 * Decorator that registers a POST method on the HTTP server.
 *
 * @param path - The path for the POST method.
 *
 * @example
 * The following code registers a POST method on the server.
 *
 * ```
 * @POST("/example")
 * async postExample(request: HttpRequest): Promise<HttpResponse> {
 *    return {
 *      content: "...",
 *      contentType: "text/plain",
 *      status: 200,
 *      contentEncoding: "binary" // supports "base64"
 *    }
 * }
 * ```
 */
export function POST(path: string) {
  return function _POST(target: any, propertyKey: string) {
    HttpServer.registerPost(new HttpMethod(path, { target, propertyKey }));
  };
}
