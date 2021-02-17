import * as WebSocket from "ws";
import { WebsocketOutbound } from "../routing/outbound";
import { WebsocketRouter } from "../routing/router";

export class WebsocketConnection {
  private static router: WebsocketRouter = new WebsocketRouter();
  private static outbound: WebsocketOutbound = new WebsocketOutbound();
  constructor(protected connection: WebSocket | null) {
    this.initializeListeners();
    this.sendWelcomeMessages();
  }

  private initializeListeners() {
    if (this.connection) {
      this.connection.on("message", this.onMessage.bind(this));
      this.connection.on("error", this.onError.bind(this));
      this.connection.on("close", this.onClose.bind(this));
    }
  }
  protected onMessage(message: string) {
    WebsocketConnection.router.route(JSON.parse(message));
  }
  private onError(message: string) {
    throw Error(message);
  }
  private onClose() {
    // @todo remove from all subscriptions
  }

  private sendWelcomeMessages() {
    WebsocketConnection.outbound.sendToConnection(this);
  }

  public send(method: string, value: any) {
    if (this.connection)
      this.connection.send(JSON.stringify({ method: method, value: value }));
  }
}
