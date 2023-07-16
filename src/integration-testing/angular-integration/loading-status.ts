import { WebsocketClient } from "./client/client";

export class LoadingStatus extends WebsocketClient {
  loading: Map<string, boolean> = new Map();
  isLoading(entry?: string): boolean {
    if (entry) {
      // return specific loading
      return this.loading.has(entry);
    } else {
      // return general loading
      return this.loading.size > 0;
    }
  }

  getCurrent(): number {
    let count = 0;
    this.loading.forEach((e: boolean) => {
      if (e) count++;
    });
    if (count == 0) {
      this.loading.clear();
    }
    return count;
  }
  getTotal(): number {
    return this.loading.size;
  }
}
