export class WebsocketClient {
  pool: { WssConnected: boolean } | null;

  constructor() {
    WebsocketClient.conn = this;
  }

  private messageId: number = 0;

  private _token = "";
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
  public defineSocketCallback(
    callback: (method: string, data: any, messageId: number) => any
  ) {
    this.callback = callback;
  }
  protected sendToSocket(method: string, data: any) {
    const messageId = ++this.messageId;
    this.callback(method, data, messageId);
    return messageId;
  }

  auth(token: string) {
    this.sendToSocket("auth.token", token);
  }

  public async send(method: string, data: any): Promise<any> {
    const messageId = this.sendToSocket(method, data);
    return await this.expectMethod(`m.${method}`, messageId);
  }
  // remove map to allow duplicate calls
  private expectedMethods: Map<string | number, Function> = new Map();
  private expectMethod(method: string, messageId?: number) {
    return new Promise((resolve) => {
      this.expectedMethods.set(messageId || method, resolve);
    });
  }

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
    } else {
      callback = this.expectedMethods.get(method);
      if (callback) {
        this.expectedMethods.delete(method);
        callback(data);
      } else {
        const out = WebsocketClient.outbounds.get(method);
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

  private static outbounds: Map<string, (data: any) => void> = new Map();
  public static expectOutbound(method: string, callback: (data: any) => void) {
    WebsocketClient.outbounds.set(method, callback);
  }

  static conn: WebsocketClient;
  static send(method: string, data: any): Promise<any> {
    return WebsocketClient.conn?.send(method, data);
  }
  private static handles: Map<string, { target: any; property: string }> =
    new Map();
  static registerHandle(method: string, target: any, property: string) {
    WebsocketClient.handles.set(method, { target, property });
  }

  isConnected = true;
}
