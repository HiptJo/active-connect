export class WebsocketClient {
  pool: { WssConnected: boolean } | null;

  constructor() {
    WebsocketClient.conn = this;
  }

  private _token = "";
  public get Token(): string {
    return this._token;
  }
  public set Token(val: string) {
    this._token = val;
  }

  protected sendToSocket(method: string, data: any) {
    JSON.stringify({ method, data });
  }

  auth(token: string) {
    this.sendToSocket("auth.token", token);
  }

  public send(method: string, data: any): Promise<any> {
    this.sendToSocket(method, data);
    return this.expectMethod(`r.${method}`);
  }
  // remove map to allow duplicate calls
  private expectedMethods: Map<string, Function> = new Map();
  private expectMethod(method: string) {
    return new Promise((resolve) => {
      this.expectedMethods.set(method, resolve);
    });
  }

  private messageReceived({ method, data }: { method: string; data: any }) {
    const callback = this.expectedMethods.get(method);
    if (callback) {
      this.expectedMethods.delete(method);
      callback(data);
    } else {
      const out = this.outbounds.get(method);
      if (out) {
        out(data);
      } else {
        const handle = this.handles.get(method);
        if (handle) {
          handle.target[handle.property](data);
        }
      }
    }
  }

  private outbounds: Map<string, (data: any) => void> = new Map();
  protected expectOutbound(method: string, callback: (data: any) => void) {
    this.outbounds.set(method, callback);
  }

  static conn: WebsocketClient;
  static send(method: string, data: any): Promise<any> {
    return WebsocketClient.conn?.send(method, data);
  }
  static expectOutbound(method: string, callback: (data: any) => void) {
    return WebsocketClient.conn?.expectOutbound(method, callback);
  }
  private handles: Map<string, { target: any; property: string }> = new Map();
  static registerHandle(method: string, target: any, property: string) {
    this.conn.handles.set(method, { target, property });
  }
}
