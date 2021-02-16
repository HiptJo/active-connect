import * as WebSocket from "ws";

export class WebsocketConnection {
  constructor(protected connection: WebSocket) {
    this.initializeListeners();
    this.sendWelcomeMessages();
  }

  private initializeListeners() {
    this.connection.on("message", this.onMessage.bind(this));
    this.connection.on("error", this.onError.bind(this));
    this.connection.on("close", this.onClose.bind(this));
  }
  private onMessage(message: string) {
    // @todo handle message
  }
  private onError(message: string) {
    // @todo handle error
  }
  private onClose() {
    // @todo remove from all subscriptions
  }

  private sendWelcomeMessages() {
    //@todo send welcome messages
  }
}
