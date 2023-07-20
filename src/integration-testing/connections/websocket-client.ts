import * as ws from "ws";
import { JsonParser } from "../../json/json-parser";

export class WebsocketClient {
  private connection: ws;
  private static nextId: number = 1;
  public readonly id: number = WebsocketClient.nextId++;
  constructor(port: number, supportCaching?: boolean) {
    const opts: any = {
      headers: {},
    };
    if (process.env.ip_override) {
      opts.headers["x-forwarded-for"] = process.env.ip_override;
    }
    if (supportCaching) {
      opts.headers["supports-active-connect-cache"] = "true";
    }

    this.connection = new ws(`ws://127.0.0.1:${port || 9000}`, opts);
    this.connection.on("ping", () => {
      if (this.pingCallbacks.length > 0) {
        this.pingCallbacks.shift()();
      }
    });
  }
  private messageHistory: Map<string, any> = new Map();
  public async awaitConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      this.connection.on("open", () => {
        resolve(true);
      });
      this.connection.on("message", (message: string) => {
        const data = JsonParser.parse(message);
        if (this.expectedMessages.has(data.method)) {
          const callback = this.expectedMessages.get(data.method);
          this.expectedMessages.delete(data.method);
          callback(data.value);
        } else this.messageHistory.set(data.method, data.value);
      });
    });
  }

  private expectedMessages: Map<string, Function> = new Map();
  awaitMessage<T>(method: string): Promise<T> {
    return new Promise((resolve) => {
      this.expectedMessages.set(method, resolve);
    });
  }

  private pingCallbacks: Function[] = [];
  public async awaitPing() {
    return new Promise((resolve) => {
      this.pingCallbacks.push(resolve);
    });
  }

  private messageId: number = 0;

  send(method: string, data: any) {
    this.connection.send(
      JsonParser.stringify({
        method: method,
        value: data,
        messageId: ++this.messageId,
      })
    );
  }

  close() {
    this.connection.close();
  }
}
