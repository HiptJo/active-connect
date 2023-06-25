import { Server as HttpServer } from "http";
import { Server, ServerOptions } from "ws";
import * as WebSocket from "ws";

import { WebsocketConnection } from "./connection/connection";
import { SimpleWebsocketRoute } from "./routing/route";
import { WebsocketRouter } from "./routing/router";

/**
 * This object is used to start and configure the websocket service.
 *
 * WebSocket stands for "Web Socket." It is a communication protocol that provides full-duplex
 * communication channels over a single TCP (Transmission Control Protocol) connection.
 * The WebSocket protocol allows for real-time, two-way communication between a client
 * (such as a web browser) and a server, enabling interactive web applications.
 */
export class WebsocketServer {
  private server: Server;

  /**
   * Creates a new Websocket Server and starts the server upon the http server.
   * The server runs using the same port as the http server.
   * @param httpServer - http server object used to start the server.
   */
  constructor(private httpServer: HttpServer) {
    this.initializeWebsocketServer();
  }

  /**
   * Starts the websocket server and initialises all required functionalities.
   */
  private initializeWebsocketServer() {
    this.server = new Server(this.getConfiguration());
    this.server.on("connection", this.onConnect.bind(this));
    this.initializeClientInformationExchange();
  }

  private logging = false;
  /**
   * Enables logging of all received messages.
   */
  public enableLogging() {
    this.logging = true;
  }

  private static _fetchIpLocation = false;
  /**
   * @returns whether the connection ip location functionality is enabled
   */
  public static get fetchIpLocation(): boolean {
    return WebsocketServer._fetchIpLocation;
  }

  /**
   * Enables the connection ip location functionality.
   * When enabled, location information is fetched for all connections once they established the connection.
   */
  public static enableIpLocationFetching() {
    WebsocketServer._fetchIpLocation = true;
  }

  /**
   * Can be use to access the recommended websocket server options
   * @returns server options
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
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024, // Size (in bytes) below which messages should not be compressed.
      },
    };
  }

  /**
   * Initializes routes used for framework-internal communication
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
   * Updates the clientInformation of the connection
   * @param info - Contains descriptions concerning the client device
   * @param conn - Refers the associated connection object
   */
  public onClientInformationReceived(
    info: { browser: string },
    conn: WebsocketConnection
  ) {
    conn.clientInformation.browser = info.browser;
  }

  /**
   * @returns All currently established websocket connections
   */
  public getConnections(): Array<WebsocketConnection> {
    return this.connections;
  }

  /**
   * Stores all established connections.
   * Can be accessed using getConnections()
   */
  private connections: Array<WebsocketConnection> = [];
  private onConnect(connection: WebSocket, req: any) {
    const conn = new WebsocketConnection(connection);
    if (req) {
      conn.setIp(req.headers["x-forwarded-for"] || req.socket.remoteAddress);
    }
    if (this.logging) conn.enableLogging();
    this.connections.push(conn);
    connection.on("close", this.onClose(conn).bind(this));
  }
  private onClose(connection: WebsocketConnection) {
    return () => {
      this.connections = this.connections.filter((c) => c.id != connection.id);
    };
  }

  /**
   * Closes the websocket server
   */
  public close() {
    this.server.close();
  }
}
