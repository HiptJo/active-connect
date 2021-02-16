import * as express from "express";
import * as http from "http";
import { WebsocketServer } from "../websocket/server";

export class HttpServer {
  private app: express.Application;
  private server: http.Server;
  constructor(private port: number, private supportWebsocket: boolean) {
    this.initializeServer();

    if (this.supportWebsocket) {
      this.initializeWebsocket();
    }
  }

  private initializeServer() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.server.listen(this.port, () => {
      const address = this.server.address();
      if (address instanceof Object)
        console.log(`http server started (port: ${address.port})`);
    });
  }

  private initializeWebsocket() {
    new WebsocketServer(this.server);
  }
}
