import { HttpMethod } from "../../server";
import { HttpServer } from "../../server/http/server";

/**
 * @decorator
 * Decorator that registers a DELETE method on the HTTP server.
 *
 * @param path - The path for the DELETE method.
 *
 * @example
 * The following code initializes a DELETE path on the server.
 * ```
 * @DELETE("/example")
 * async deleteExample(request: HttpRequest): Promise<HttpResponse> {
 *    return {
 *      content: "...",
 *      contentType: "text/plain",
 *      status: 200,
 *      contentEncoding: "binary" // supports "base64"
 *    }
 * }
 * ```
 */
export function DELETE(path: string) {
  return function _DELETE(target: any, propertyKey: string) {
    HttpServer.registerDelete(new HttpMethod(path, { target, propertyKey }));
  };
}
