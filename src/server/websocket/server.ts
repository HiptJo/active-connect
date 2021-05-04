import { Server as HttpServer } from "http";
import { Server, ServerOptions } from "ws";
import { WebsocketConnection } from "./connection/connection";
import * as WebSocket from "ws";
import { WebsocketRouter } from "./routing/router";
import { StandaloneRoute } from "../../decorators/websocket/route";
import { StandaloneWebsocketRoute } from "./routing/route";

export class WebsocketServer {
  private server: Server;
  constructor(private httpServer: HttpServer) {
    this.initializeWebsocketServer();
  }
  private initializeWebsocketServer() {
    this.server = new Server(this.getConfiguration());
    this.server.on("connection", this.onConnect.bind(this));
    this.initializeClientInformationExchange();
  }
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

  private initializeClientInformationExchange() {
    WebsocketRouter.registerStandaloneRoute(
      new StandaloneWebsocketRoute(
        "___browser",
        this.onClientInformationReceived.bind(this)
      )
    );
  }
  private onClientInformationReceived(
    info: { browser: string },
    conn: WebsocketConnection
  ) {
    conn.clientInformation.browser = info.browser;
  }

  public getConnections(): Array<WebsocketConnection> {
    return this.connections;
  }

  private connections: Array<WebsocketConnection> = [];
  private onConnect(connection: WebSocket) {
    const conn = new WebsocketConnection(connection);
    this.connections.push(conn);
    connection.on("close", this.onClose(conn).bind(this));
  }
  private onClose(connection: WebsocketConnection) {
    return () => {
      this.connections = this.connections.filter((c) => c.id != connection.id);
    };
  }

  public close() {
    this.server.close();
  }

  public loadFile(obj: any) {
    obj;
  }
}
