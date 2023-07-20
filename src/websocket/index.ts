/**
 * @module
 * @description
 * The `websocket` module in Active-Connect provides a powerful connection framework for enabling real-time communication between clients and the server in smart web-based projects. It seamlessly integrates with Node.js, Angular, and WebSockets, simplifying the implementation of WebSocket functionality within applications.
 *
 * Active-Connect's `websocket` module offers a range of decorators and utilities that empower developers to handle real-time updates, authentication, filters, and data distribution efficiently. By leveraging these provided decorators and utilities, developers can establish WebSocket connections and manage real-time data flow with ease, significantly enhancing the overall user experience.
 *
 * **Note:** The WebSocket support is based on the HTTP server. Further details can be found in the {@link http} section.
 *
 * For more details about the decorators and functions available in this module, please refer to the "Functions" section of this documentation.
 *
 * @SetupInstructions
 * Step 1: Import the necessary files
 * ```javascript
 * import { HttpServer } from 'active-connect';
 * ```
 *
 * Step 2: Define WebSocket Routes
 * ```javascript
 * import { Route } from 'active-connect';
 *
 * // Define WebSocket routes using decorators
 * @Route('chat')
 * class ChatWebSocket {
 *    @Route('send')
 *    async send(message: Message, conn: WebsocketConnection): Promise<any> {
 *       // handle request and return response
 *    }
 * }
 * ```
 *
 * Step 3: Define Outbounds
 * ```javascript
 * import { Outbound } from 'active-connect';
 *
 * // Define WebSocket outbounds using decorators
 * class DataOutbound {
 *   @Outbound('d.data')
 *   async getData(conn: WebsocketConnection): Promise<Data> {
 *       return Data.getData(conn.token);
 *   }
 * }
 * ```
 *
 * Step 4: Load Files Containing Routes and Outbounds within the Entrypoint File.
 *
 * Step 5: Create HttpServer Object with WebSocket Support and Start the Server
 * ```javascript
 * // Start the HTTP server on the selected port with WebSocket support
 * const server = new HttpServer(80, true); // Replace '80' with the desired port number
 * ```
 */

export * from "./auth/authenticator";
export * from "./decorators/auth";
export * from "./decorators/connection-closed";
export * from "./decorators/outbound";
export * from "./decorators/route";
export * from "./decorators/shared";
export * from "./decorators/subscription";
export * from "./decorators/websocket-outbound-decorator-config";
export * from "./decorators/websocket-route-decorator-config";
export * from "./errors/silent";
export * from "./server/connection/connection";
export * from "./server/message/request";
export * from "./server/routing/outbound";
export * from "./server/routing/route";
export * from "./server/routing/router";
export * from "./server/server";
