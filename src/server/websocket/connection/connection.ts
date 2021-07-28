import * as WebSocket from "ws";

import { WebsocketRequest } from "../message/request";
import { WebsocketOutbound } from "../routing/outbound";
import { WebsocketRouter } from "../routing/router";
import { WebsocketServer } from "../server";

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

  private logging = false;
  public enableLogging() {
    this.logging = true;
  }

  private initializeListeners() {
    if (this.connection) {
      this.connection.on("message", this.onMessage.bind(this));
      this.connection.on("error", this.onError.bind(this));
      this.connection.on("close", this.onClose.bind(this));
    }
  }
  protected onMessage(message: string) {
    if (this.logging) {
      console.log(
        "Received message: " +
          message +
          " for Client with Session-Token=" +
          this.token?.slice(0, 10) +
          "..."
      );
    }
    const data = JSON.parse(message);
    if (!data.messageId)
      throw Error("No Message-ID has been received by the server.");
    WebsocketConnection.router.route(
      new WebsocketRequest(data.method, data.value, this, data.messageId || 0)
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

  public send(method: string, value: any, messageId?: number | null) {
    let message = JSON.stringify({
      method: method,
      value: value,
      messageId: messageId || -1,
    });
    if (this.logging && method.startsWith("m.")) {
      let messageLog = message;
      // only log replies
      if (messageLog.length > 200) messageLog = messageLog.slice(0, 200);
      console.log(
        "Sending message: " +
          messageLog +
          " for Client with Session-Token=" +
          this.token?.slice(0, 10) +
          "..."
      );
    }
    if (this.connection) this.connection.send(message);
  }

  private prepareClientInformation(): {
    ip: string;
    location: string | undefined;
    browser: string | undefined;
  } {
    const ip = (this.connection as any)?._socket?.remoteAddress || "";
    let location = undefined;
    if (WebsocketServer.fetchIpLocation) {
      const ipLookupResult = WebsocketConnection.getLookup()(ip);
      if (ipLookupResult) {
        location = ipLookupResult.city + " / " + ipLookupResult.country;
      }
    }
    return { ip, location, browser: undefined };
  }

  public readonly clientInformation: {
    ip: string;
    location: string | undefined;
    browser: string | undefined;
  };

  public setIp(ip: string) {
    this.clientInformation.ip = ip;
    if (WebsocketServer.fetchIpLocation) {
      const ipLookupResult = WebsocketConnection.getLookup()(ip);
      if (ipLookupResult) {
        this.clientInformation.location =
          ipLookupResult.city + " / " + ipLookupResult.country;
      }
    }
  }

  private static lookup: any | null;
  protected static getLookup() {
    if (!WebsocketConnection.lookup) {
      WebsocketConnection.lookup = require("geoip-lite").lookup;
    }
    return WebsocketConnection.lookup;
  }
}
