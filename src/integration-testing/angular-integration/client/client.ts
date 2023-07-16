/**
 * The WebsocketClient has direct access to the server.
 * It is used to simulate the client. This is usually executed on the client.
 */
export class WebsocketClient {
  /**
   * Reference to the current pool.
   * A pool can be used to store and access data using Outbounds.
   */
  pool: { WssConnected: boolean } | null;

  private messageId: number = 0;

  constructor(prototype?: { ___expectOutboundsCall: Function | undefined }) {
    if (prototype && prototype.___expectOutboundsCall) {
      (prototype.___expectOutboundsCall as any as Function[]).forEach((c) =>
        c(this)
      );
    }
  }

  private _token = "";
  /**
   * This is used to store the session token.
   * It is automatically transmitted to the api once the client opens the connection.
   * It can be used to authenticate the client.
   */
  public get Token(): string {
    return this._token;
  }
  public set Token(val: string) {
    this._token = val;
  }

  private callback: (
    method: string,
    data: any,
    messageId: number
  ) => any | null;

  /**
   * Initializes the socket callback.
   *
   * @param callback - This callback will be called, once any message is sent from the ws api
   */
  public defineSocketCallback(
    callback: (method: string, data: any, messageId: number) => any
  ) {
    this.callback = callback;
  }

  /**
   * This handles received data.
   * This is the first point of the transaction, that usually takes place on the clients device.
   *
   * @param method - Method of the message
   * @param data - Transmitted data
   * @returns the messageId (can be used to refer message responses)
   */
  protected sendToSocket(method: string, data: any) {
    const messageId = ++this.messageId;
    this.callback(method, data, messageId);
    return messageId;
  }

  /**
   * Send the session token to the server
   *
   * @param token - client session token
   */
  auth(token: string) {
    this.sendToSocket("auth.token", token);
  }

  /**
   * Transmit messages to the server.
   *
   * @param method - Method of the message
   * @param data - Data to be transmitted
   * @returns the result sent from the server
   */
  public async send(method: string, data: any): Promise<any> {
    const messageId = this.sendToSocket(method, data);
    return await this.expectMethod(`m.${method}`, messageId);
  }

  private expectedMethods: Map<string | number, Function> = new Map();

  /**
   * Can be used to wait for specific message responses
   *
   * @param method - Method of the expected message
   * @param [messageId] - ID of the expected message
   */
  private expectMethod(method: string, messageId?: number) {
    return new Promise((resolve) => {
      this.expectedMethods.set(messageId || method, resolve);
    });
  }

  /**
   * This handles all received messages.
   * Depending on expected message config and other route configuration, different methods are called.
   *
   * @param param0 - message data
   */
  public messageReceived({
    method,
    data,
    messageId,
  }: {
    method: string;
    data: any;
    messageId: number | undefined;
  }) {
    let callback = this.expectedMethods.get(messageId);
    if (callback) {
      this.expectedMethods.delete(messageId);
      callback(data);
      this.invokeSuccessHandlers(method);
    } else {
      callback = this.expectedMethods.get(method);
      if (callback) {
        this.expectedMethods.delete(method);
        callback(data);
      } else {
        const out = this.outbounds.get(method);
        if (out) {
          out(data);
        } else {
          const handle = WebsocketClient.handles.get(method);
          if (handle) {
            handle.target[handle.property](data);
          } else if (method == "m.error") throw data;
        }
      }
    }
  }

  private outbounds: Map<string, (data: any) => void> = new Map();
  /**
   * This allows to listen for outbound data to be received.
   *
   * @param method - method label of the outbound
   * @param callback - this is called once the data has been received
   */
  public expectOutbound(method: string, callback: (data: any) => void) {
    this.outbounds.set(method, callback);
  }

  /**
   * @deprecated
   */
  private static handles: Map<string, { target: any; property: string }> =
    new Map();
  /**
   * @deprecated
   */
  static registerHandle(method: string, target: any, property: string) {
    WebsocketClient.handles.set(method, { target, property });
  }

  /**
   * states wether the client is connected
   * @returns true as the client is always connected during test runs
   */
  public isConnected() {
    return true;
  }

  /**
   * @deprecated
   */
  private static onSuccessHandlers: { callback: Function; regexp: RegExp }[] =
    [];
  /**
   * @deprecated
   */
  public static onSuccess(callback: Function, regexp: RegExp) {
    this.onSuccessHandlers.push({ callback, regexp });
  }

  /**
   * This method is called whenever a request transaction (route) has been
   * sent to the server and a response has been received
   *
   * SuccessHandlers can be used to show notifications on the client device.
   *
   * @param method - method of the successfully executed method
   */
  private invokeSuccessHandlers(method: string) {
    // this uses the @deprecated implementation of success-handlers
    WebsocketClient.onSuccessHandlers
      .filter((e) => e.regexp.test(method))
      .forEach((e) => {
        var res = e.callback();
        if (res && res.then) {
          res.then();
        }
      });
  }
}
