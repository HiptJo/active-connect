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
    });
  }
}
