/**
 * @module
 * @description
 * The `http` module in Active-Connect provides an HTTP server and all the necessary utilities to configure it. With this module, developers can easily create custom HTTP endpoints, handle incoming requests, and send appropriate responses.
 *
 * Developers can use the provided decorators, such as `@GET`, `@POST`, `@PUT`, and others, along with their respective handler methods, to define the functionality for each HTTP verb.
 *
 * Additionally, this module supports optional WebSocket mode, which allows real-time communication when starting the server. Further details about WebSocket can be found within the {@link websocket} section.
 *
 * @SetupInstructions
 * Step 1: Import the required classes and create an HTTP server object using `HttpServer`.
 * ```javascript
 * import { GET, HttpServer, HttpRequest, HttpResponse } from 'active-connect';
 * ```
 *
 * Step 2: Define HTTP methods (e.g., GET, POST) within your service classes using decorators.
 * ```javascript
 * class ExampleHttpService {
 *   @GET("/example")
 *   async getExample(request: HttpRequest): Promise<HttpResponse> {
 *     return {
 *       content: "...",
 *       contentType: "text/plain",
 *       status: 200,
 *       contentEncoding: "binary", // supports "base64"
 *     };
 *   }
 * }
 * ```
 *
 * Step 3: Load files containing HTTP methods within the entry point file of your application.
 *
 * Step 4: Start the HTTP server.
 * ```javascript
 * const server = new HttpServer(80, false); // Set 'true' to enable WebSocket support
 * ```
 */

export { HttpServer } from "./server/server";
export * from "./server/http-request";
export * from "./server/http-response";
export * from "./server/http-method";

export * from "./errors/bad-request";
export * from "./errors/forbidden";
export * from "./errors/not-found";
export * from "./errors/unauthorized";

export * from "./decorators/get";
export * from "./decorators/post";
export * from "./decorators/put";
export * from "./decorators/delete";
