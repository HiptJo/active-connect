import { Server as HttpServer } from "http";
import { Server, ServerOptions } from "ws";
import * as WebSocket from "ws";

import { WebsocketConnection } from "./connection/connection";
import { SimpleWebsocketRoute } from "./routing/route";
import { WebsocketRouter } from "./routing/router";
import { WebsocketOutbounds } from "./routing/outbound";

/**
 * WebSocket Server
 *
 * The WebSocketServer class is used to start and configure the WebSocket service.
 * It provides full-duplex communication channels over a single TCP connection using the WebSocket protocol.
 * This enables real-time, two-way communication between a client (e.g., a web browser) and a server, allowing for interactive web applications.
 */
export class WebsocketServer {
  private server: Server;
  private connections: Array<WebsocketConnection> = [];
  private logging = false;
  private static _fetchIpLocation = false;

  /**
   * Creates a new WebsocketServer instance and starts the server using the provided HTTP server.
   *
   * @param httpServer - The HTTP server object used to start the WebSocket server.
   */
  constructor(private httpServer: HttpServer) {
    this.initializeWebsocketServer();
  }

  /**
   * Initializes and starts the WebSocket server.
   */
  private initializeWebsocketServer() {
    this.loadDecoratorConfiguration();
    this.server = new Server(this.getConfiguration());
    this.server.on("connection", this.onConnect.bind(this));
    this.initializeClientInformationExchange();
  }

  private loadDecoratorConfiguration() {
    WebsocketRouter.loadDecoratorConfig();
    WebsocketOutbounds.loadDecoratorConfig();
  }

  /**
   * Enables logging of all received messages.
   */
  public enableLogging() {
    this.logging = true;
  }

  /**
   * Enables the connection IP location functionality.
   * When enabled, location information is fetched for all connections once they establish the connection.
   */
  public static enableIpLocationFetching() {
    WebsocketServer._fetchIpLocation = true;
  }

  /**
   * Determines whether the connection IP location functionality is enabled.
   *
   * @returns A boolean indicating if the connection IP location functionality is enabled.
   */
  public static get fetchIpLocation(): boolean {
    return WebsocketServer._fetchIpLocation;
  }

  /**
   * Retrieves the recommended WebSocket server options.
   *
   * @returns The server options object.
   */
  private getConfiguration(): ServerOptions {
    return {
      server: this.httpServer,
      perMessageDeflate: {
        zlibDeflateOptions: {
          // See zlib defaults.
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for performance.
        threshold: 1024, // Size (in bytes) below which messages should not be compressed.
      },
    };
  }

  /**
   * Initializes routes used for framework-internal communication.
   */
  private initializeClientInformationExchange() {
    WebsocketRouter.registerRoute(
      new SimpleWebsocketRoute(
        "___browser",
        this.onClientInformationReceived.bind(this)
      )
    );
    // @deprecated method ___ip does no longer provide any functionality
    // it is still registered to avoid error messages
    WebsocketRouter.registerRoute(
      new SimpleWebsocketRoute("___ip", async () => {})
    );
  }

  /**
   * Updates the client information of the connection.
   *
   * @param info - An object containing descriptions concerning the client device.
   * @param conn - The associated WebsocketConnection object.
   */
  public onClientInformationReceived(
    info: { browser: string },
    conn: WebsocketConnection
  ) {
    conn.clientInformation.browser = info.browser;
  }

  /**
   * Retrieves all currently established WebSocket connections.
   *
   * @returns An array of WebsocketConnection objects representing the established connections.
   */
  public getConnections(): Array<WebsocketConnection> {
    return this.connections;
  }

  /**
   * Handles the WebSocket connection event.
   *
   * @param connection - The WebSocket connection object.
   * @param req - The request object associated with the connection.
   */
  private onConnect(connection: WebSocket, req: any) {
    const conn = new WebsocketConnection(connection);
    if (req) {
      conn.setIp(req.headers["x-forwarded-for"] || req.socket.remoteAddress);
      if (req.headers["supports-active-connect-cache"]) conn.enableCache();
    }
    if (this.logging) conn.enableLogging();
    this.connections.push(conn);
    connection.on("close", this.onClose(conn).bind(this));
  }

  /**
   * Handles the WebSocket connection close event.
   *
   * @param connection - The closed WebsocketConnection object.
   * @returns A callback function that removes the closed connection from the list of established connections.
   */
  private onClose(connection: WebsocketConnection) {
    return () => {
      this.connections = this.connections.filter((c) => c.id !== connection.id);
    };
  }

  /**
   * Closes the WebSocket server.
   */
  public close() {
    this.server.close();
  }
}
