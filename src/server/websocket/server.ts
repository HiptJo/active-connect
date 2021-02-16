import { Server as HttpServer } from "http";
import { Server, ServerOptions } from "ws";
import { WebsocketConnection } from "./connection/connection";
import * as WebSocket from "ws";

export class WebsocketServer {
  private server: Server;
  constructor(private httpServer: HttpServer) {
    this.initializeWebsocketServer();
  }
  private initializeWebsocketServer() {
    this.server = new Server(this.getConfiguration());
    this.server.on("connection", this.onConnect.bind(this));
  }
  private getConfiguration(): ServerOptions {
    return { server: this.httpServer };
  }

  private connections: Array<WebsocketConnection> = [];
  private onConnect(connection: WebSocket) {
    this.connections.push(new WebsocketConnection(connection));
  }

  public close() {
    this.server.close();
  }
}
