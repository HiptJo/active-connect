import * as WebSocket from "ws";
import { JsonParser } from "../../../json/json-parser";

import { WebsocketRequest } from "../message/request";
import { WebsocketOutbounds } from "../routing/outbound";
import { WebsocketRouter } from "../routing/router";
import { WebsocketServer } from "../server";
import { DecorableFunction } from "../../../decorator-config/function";

import * as _ from "lodash";

/**
 * Represents a WebSocket connection.
 */
export class WebsocketConnection {
  private static closeHandlers: DecorableFunction[] = [];

  /**
   * Adds a close handler to be called when the connection is closed.
   * @param callback - The callback function to be called on connection close.
   */
  public static addCloseHandler(callback: DecorableFunction) {
    WebsocketConnection.closeHandlers.push(callback);
  }

  private static AUTO_INCREMENT = 0;
  /**
   * Unique client id per server instance.
   * This incremental value is resetted once the process is restarted.
   */
  public _id: number = ++WebsocketConnection.AUTO_INCREMENT;

  /**
   * Gets the ID of the WebSocket connection.
   */
  get id(): number {
    return this._id;
  }

  /**
   * Can be used to store session credentials.
   */
  public token: string | null = null;

  /**
   * Refers to a websocket router instance.
   */
  public static router: WebsocketRouter = new WebsocketRouter();
  private interval;

  /**
   * Creates a new instance of WebsocketConnection.
   * @param connection - The WebSocket connection object.
   */
  constructor(
    protected connection: WebSocket | null,
    supportsCache?: boolean,
    authToken?: string
  ) {
    if (supportsCache) this.enableCache();
    this.token = authToken;
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

  /**
   * Enables message logging for the WebSocket connection.
   */
  public enableLogging() {
    this.logging = true;
  }

  private cachingEnabled = false;
  /**
   * States that the client supports caching of outbound data.
   */
  public enableCache() {
    this.cachingEnabled = true;
  }

  /**
   * True if outbound caching is supported by the client.
   */
  public get supportsCaching() {
    return this.cachingEnabled;
  }

  private initializeListeners() {
    if (this.connection) {
      this.connection.on("message", this.onMessage.bind(this));
      this.connection.on("error", this.onError.bind(this));
      this.connection.on("close", this.onClose.bind(this));
    }
  }

  /**
   * Handles incoming WebSocket messages.
   * @param message - The message received from the WebSocket connection.
   */
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
    const data = JsonParser.parse(message);
    if (!data.messageId)
      throw Error("No Message-ID has been received by the server.");
    WebsocketConnection.router.route(
      new WebsocketRequest(data.method, data.value, this, data.messageId || 0)
    );
  }

  private onError(message: string) {
    throw Error(message);
  }

  protected onClose() {
    clearInterval(this.interval);
    WebsocketOutbounds.unsubscribeConnection(this);
    WebsocketConnection.closeHandlers.forEach((c) => c.Func(this));
  }

  private async sendWelcomeMessages() {
    await WebsocketOutbounds.sendToConnection(this);
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param method - The method of the message.
   * @param value - The value of the message.
   * @param messageId - The ID of the message.
   * @param globalHash - The global hash value - used by outbounds with caching enabled.
   * @param specificHash - The specific hash value - used by outbounds with caching enabled.
   */
  public send(
    method: string,
    value: any,
    messageId?: number | null,
    globalHash?: number,
    specificHash?: number,
    inserted?: any[],
    updated?: any[],
    deleted?: any[]
  ) {
    let message = JsonParser.stringify({
      method: method,
      value: value,
      messageId: messageId || -1,
      globalHash,
      specificHash,
      inserted,
      updated,
      deleted,
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

  private outboundCache: Map<string, any[]> = new Map();
  public addOutboundData(method: string, data: any[]) {
    this.outboundCache.set(
      method,
      JsonParser.parse(JsonParser.stringify(data))
    );
  }
  public getOutboundDiffAndUpdateCache(
    method: string,
    data: { id: number }[]
  ): { data: any[] | string; inserted: any[]; updated: any[]; deleted: any[] } {
    const cache = this.outboundCache.get(method);
    if (cache) {
      const updated = _.differenceWith(
        data,
        cache,
        (a: any, b: any) => JSON.stringify(a) == JSON.stringify(b)
      );
      const inserted = _.differenceWith(
        updated,
        cache,
        (a: { id: number }, b: { id: number }) => a.id == b.id
      );
      _.pullAll(updated, inserted);

      const deleted = _.differenceWith(
        cache,
        data,
        (a: { id: number }, b: { id: number }) => a.id == b.id
      );

      this.addOutboundData(method, data);
      return {
        inserted,
        updated,
        deleted,
        data: "data_diff",
      };
    } else {
      this.addOutboundData(method, data);
      return {
        data,
        inserted: null,
        updated: null,
        deleted: null,
      };
    }
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

  /**
   * Information about the client connected to the WebSocket.
   */
  public readonly clientInformation: {
    ip: string;
    location: string | undefined;
    browser: string | undefined;
  };

  /**
   * Sets the IP address of the client.
   * @param ip - The IP address to set.
   */
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
    if (process.env.jest) {
      return () => "location";
    }
    if (!WebsocketConnection.lookup) {
      WebsocketConnection.lookup = require("geoip-lite").lookup;
    }
    return WebsocketConnection.lookup;
  }
}
