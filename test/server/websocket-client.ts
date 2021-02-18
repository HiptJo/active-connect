import * as ws from "ws";
export class WebsocketClient {
  private connection: ws;
  constructor(port: number) {
    this.connection = new ws(`ws://127.0.0.1:${port || 9000}`);
  }
  public async awaitConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      this.connection.on("open", () => {
        resolve(true);
      });
      this.connection.on("message", (message: string) => {
        const data = JSON.parse(message);
        const callback = this.expectedMessages.get(data.method);
        if (callback) {
          callback(data.value);
        }
      });
    });
  }
  private expectedMessages: Map<string, Function> = new Map();
  awaitMessage<T>(method: string): Promise<T> {
    return new Promise((resolve) => {
      this.expectedMessages.set(method, resolve);
    });
  }
  send(method: string, data: any) {
    this.connection.send(JSON.stringify({ method: method, value: data }));
  }
}
