import * as WebSocket from "ws";
import { WebsocketRequest } from "../message/request";
import { WebsocketOutbound } from "../routing/outbound";
import { WebsocketRouter } from "../routing/router";

export class WebsocketConnection {
  private static AUTO_INCREMENT = 0;
  public _id: number = ++WebsocketConnection.AUTO_INCREMENT;
  get id(): number {
    return this._id;
  }

  public static router: WebsocketRouter = new WebsocketRouter();
  private interval;
  constructor(protected connection: WebSocket | null) {
    this.initializeListeners();
    this.sendWelcomeMessages();
    this.interval = setInterval(() => {
      connection.ping();
    }, 45000);
    process.on("beforeExit", () => {
      clearInterval(this.interval);
    });
  }

  private initializeListeners() {
    if (this.connection) {
      this.connection.on("message", this.onMessage.bind(this));
      this.connection.on("error", this.onError.bind(this));
      this.connection.on("close", this.onClose.bind(this));
    }
  }
  protected onMessage(message: string) {
    const data = JSON.parse(message);
    WebsocketConnection.router.route(
      new WebsocketRequest(data.method, data.value, this)
    );
  }
  private onError(message: string) {
    throw Error(message);
  }
  private onClose() {
    clearInterval(this.interval);
    WebsocketOutbound.clearConnectionSubscriptions(this);
  }

  private sendWelcomeMessages() {
    WebsocketOutbound.sendToConnection(this);
  }

  public send(method: string, value: any) {
    if (this.connection)
      this.connection.send(JSON.stringify({ method: method, value: value }));
  }
}
