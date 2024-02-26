import * as WebSocket from "ws";
import { JsonParser } from "../../../json/json-parser";

import { WebsocketRequest } from "../message/request";
import { WebsocketOutbounds } from "../routing/outbound";
import { WebsocketRouter } from "../routing/router";
import { WebsocketServer } from "../server";
import { DecorableFunction } from "../../../decorator-config/function";

import * as _ from "lodash";
import { IdObject } from "../../../integration-testing/angular-integration/objects/outbound-object";

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
   * Describes the clients auth state
   */
  public description: string = "PUBLIC";

  /**
   * Refers to a websocket router instance.
   */
  public static router: WebsocketRouter = new WebsocketRouter();
  private pingInterval;

  /**
   * Creates a new instance of WebsocketConnection.
   * @param connection - The WebSocket connection object representing the connection to the client.
   * @param supportsCache - Determines whether the client supports caching for outbound data.
   * @param [authToken] - An optional parameter used to store authentication credentials, such as session tokens, for the client.
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
      this.pingInterval = setInterval(function pingConnection() {
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

  private closed: boolean = false;
  /**
   * True if the connection has been closed
   */
  get isClosed() {
    return this.closed;
  }

  protected onClose() {
    this.closed = true;
    clearInterval(this.pingInterval);
    WebsocketOutbounds.unsubscribeConnection(this);
    WebsocketConnection.closeHandlers.forEach((c) => c.Func(this));
    this.outboundCache = new Map();
  }

  private async sendWelcomeMessages() {
    await WebsocketOutbounds.sendToConnection(this);
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param method - The method of the message.
   * @param value - The value of the message.
   * @param messageId - The ID of the message.
   * @param specificHash - The specific hash value - used by outbounds with caching enabled.
   */
  public send(
    method: string,
    value: any,
    messageId?: number | null,
    specificHash?: number,
    inserted?: any[],
    updated?: any[],
    deleted?: any[],
    length?: number
  ) {
    let message = JsonParser.stringify({
      method: method,
      value: value,
      messageId: messageId || -1,
      specificHash,
      inserted,
      updated,
      deleted,
      length,
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

  private outboundCache: Map<string, any[] | Map<number, any>> = new Map();
  /**
   * Sets the cached outbound data for the associated outbound method.
   *
   * @param method - The method of the associated Outbound.
   * @param data - The contents that should be cached for the method.
   */
  public addOutboundData(method: string, data: any[]) {
    this.outboundCache.set(method, data);
  }
  /**
   * Updates the cached outbound data for the associated outbound method.
   *
   * @param method - The method of the associated Outbound.
   * @param inserted - The contents that have been added since the last time.
   * @param updated - The contents that have been modified since the last time.
   * @param deleted - The contents that have been removed since the last time.
   */
  public updateOutboundCache(
    method: string,
    inserted: any[],
    updated: any[],
    deleted: any[]
  ) {
    let map: Map<number, any> = this.outboundCache.get(method) as Map<
      number,
      any
    >;
    if (!map) {
      map = new Map();
      this.outboundCache.set(method, map);
    }
    inserted?.forEach((data: IdObject) => {
      map.set(data.id, data);
    });
    updated?.forEach((data: IdObject) => {
      map.set(data.id, data);
    });
    deleted?.forEach((data: IdObject) => {
      map.delete(data.id);
    });
  }
  public resetOutboundCache(method: string) {
    this.outboundCache.delete(method);
  }

  /**
   * Calculates the modified rows of data, that have been changed since the last time data was cached.
   *
   * @param method - The method of the associated Outbound.
   * @param data - The data returned from the outbound function.
   * @param isPartial - True when a part of the data is only present
   * @returns the data changes (inserted, updated, deleted)
   */
  public getOutboundDiffAndUpdateCache(
    method: string,
    data: { id: number }[],
    isPartial?: boolean
  ): { data: any[] | string; inserted: any[]; updated: any[]; deleted: any[] } {
    let cache: any[] | null = null;
    if (isPartial) {
      const cacheMap = this.outboundCache.get(method);
      if (cacheMap) cache = Array.from(cacheMap.values());
    } else {
      cache = this.outboundCache.get(method) as any[];
    }

    if (cache) {
      const updated = _.differenceWith(
        data,
        cache as any[],
        JsonParser.deepCompare
      );
      const inserted = _.differenceWith(
        updated,
        cache as any[],
        (a: { id: number }, b: { id: number }) => a.id == b.id
      );
      _.pullAll(updated, inserted);

      const deleted = _.differenceWith(
        cache as any[],
        data,
        (a: { id: number }, b: { id: number }) => a.id == b.id
      );

      if (isPartial) {
        this.updateOutboundCache(method, inserted, updated, deleted);
      } else {
        this.addOutboundData(method, data);
      }
      return {
        inserted,
        updated,
        deleted,
        data: "data_diff",
      };
    } else {
      if (isPartial) {
        this.updateOutboundCache(method, data, [], []);
      } else {
        this.addOutboundData(method, data);
      }
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

  private outboundRequestConfig: Map<
    string,
    {
      id: number | undefined;
      count: number | undefined;
      groupId: number | undefined;
    }
  > = new Map();
  /**
   * Outbound request config is used to store the length of entries, that have been previously requested by this client for partially sent outbounds.
   * @param method - The method of the outbound
   * @returns the outbound request config
   */
  public getOutboundRequestConfig(method: string):
    | {
        id: number | undefined;
        groupId: number | undefined;
        count: number | undefined;
      }
    | undefined {
    return (
      this.outboundRequestConfig.get(method) || {
        count: Number.MAX_SAFE_INTEGER,
        id: undefined,
        groupId: undefined,
      }
    );
  }
  /**
   * Outbound request config is used to store the length of entries, that have been previously requested by this client for partially sent outbounds.
   * @param method - The method of the outbound
   * @param count - The length of entries that have been requested.
   */
  public setOutboundRequestConfig(
    method: string,
    count: number | undefined,
    groupId: number | undefined,
    id: number | undefined
  ) {
    if (!this.outboundRequestConfig.get(method)) {
      this.outboundRequestConfig.set(method, {
        count,
        id,
        groupId,
      });
    } else {
      const data = this.outboundRequestConfig.get(method);
      if (count) {
        data.count = count;
      }
      if (groupId) {
        data.groupId = groupId;
      }
      if (id) {
        data.id = id;
      }
    }
  }
}
