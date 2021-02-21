import * as ws from "ws";
export class WebsocketClient {
  private connection: ws;
  constructor(port: number) {
    this.connection = new ws(`ws://127.0.0.1:${port || 9000}`);
  }
  private messageHistory: Map<string, any> = new Map();
  public async awaitConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      this.connection.on("open", () => {
        resolve(true);
      });
      this.connection.on("message", (message: string) => {
        const data = JSON.parse(message);
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
      if (this.messageHistory.has(method)) {
        const historyElement = this.messageHistory.get(method);
        this.messageHistory.delete(method);
        resolve(historyElement);
      } else {
        this.expectedMessages.set(method, resolve);
      }
    });
  }

  send(method: string, data: any) {
    this.connection.send(JSON.stringify({ method: method, value: data }));
  }

  close() {
    this.connection.close();
  }
}
