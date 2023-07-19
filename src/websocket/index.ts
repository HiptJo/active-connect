/**
 * @module
 * @description
 * The `websocket` module in Active-Connect provides a powerful connection framework for real-time communication between clients and the server in smart web-based projects.
 * This module is designed to seamlessly integrate with Node.js, Angular, and WebSockets, simplifying the implementation of WebSocket functionality within applications.
 *
 * Active-Connect's `websocket` module offers a range of decorators and utilities that enable developers to handle real-time updates, authentication, filters, and data distribution efficiently.
 * By leveraging the provided decorators and utilities, developers can establish WebSocket connections and manage real-time data flow with ease, enhancing the overall user experience.
 *
 * @SetupInstructions
 * Step 1: Import Necessary Files
 * ```javascript
 * import {Route,Outbound,HttpServer} from 'active-connect';
 * ```
 *
 * Step 2: Define WebSocket Routes
 * ```javascript
 * // WebSocketRoutes.js
 * import { Route } from 'active-connect';
 *
 * // Define WebSocket routes using decorators
 * @Route('chat')
 * class ChatWebSocket {
 *    @Route('send')
 *    async send(message: Message, conn: WebsocketConnection) {
 *       // handle request
 *    }
 * }
 * ```
 *
 * Step 3: Define Outbounds
 * ```javascript
 * // Outbounds.js
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
 * Step 4: Load Files containing Routes and Outbounds within the entrypoint file.
 *
 * Step 5: Create HttpServer Object with WebSocket Support
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
