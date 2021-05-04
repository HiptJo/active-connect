import { lookup } from "geoip-lite";
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

  public token: string | null = null;

  public static router: WebsocketRouter = new WebsocketRouter();
  private interval;
  constructor(protected connection: WebSocket | null) {
    this.initializeListeners();
    this.sendWelcomeMessages();
    if (connection) {
      this.interval = setInterval(function pingConnection() {
        connection.ping();
      }, 45000);
    }

    this.clientInformation = this.prepareClientInformation();
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

  private prepareClientInformation(): {
    ip: string;
    location: string | undefined;
    browser: string | undefined;
  } {
    const ip = (this.connection as any)._socket?.remoteAddress || "";
    const ipLookupResult = lookup(ip);
    let location = undefined;
    if (ipLookupResult) {
      location = ipLookupResult.city + " / " + ipLookupResult.country;
    }
    return { ip, location, browser: undefined };
  }

  public readonly clientInformation: {
    ip: string;
    location: string | undefined;
    browser: string | undefined;
  };
}
