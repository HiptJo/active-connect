import * as express from "express";
import * as http from "http";
import { WebsocketServer } from "../websocket/server";

export class HttpServer {
  private app: express.Application;
  private server: http.Server;
  private websocket: WebsocketServer;
  constructor(private port: number, private supportWebsocket: boolean) {
    this.initializeServer();

    if (this.supportWebsocket) {
      this.initializeWebsocket();
    }
  }

  private isServerStarted: boolean = false;
  private initializeServer() {
    this.app = express();
    this.server = this.app.listen(this.port, () => {
      this.isServerStarted = true;
      this.serverStarted();
    });
  }

  private initializeWebsocket() {
    this.websocket = new WebsocketServer(this.server);
  }

  private serverStartedResolves: Array<Function> = [];
  private serverStarted() {
    this.serverStartedResolves.forEach((r) => r(true));
  }
  public async awaitStart(): Promise<boolean> {
    if (this.isServerStarted) return true;
    return new Promise((resolve) => {
      this.serverStartedResolves.push(resolve);
    });
  }

  public stop() {
    this.server.close();
    if (this.supportWebsocket) this.websocket.close();
  }
}
