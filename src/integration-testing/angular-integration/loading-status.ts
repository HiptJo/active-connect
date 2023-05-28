export class LoadingStatus {
  private __proto__: any;
  static loading: Map<string, boolean>;
  isLoading(entry?: string): boolean {
    if (entry) {
      // return specific loading
      return this.__proto__.loading.has(entry);
    } else {
      // return general loading
      return this.__proto__.loading.size > 0;
    }
  }

  getCurrent(): number {
    let count = 0;
    this.__proto__.loading.forEach((e: boolean) => {
      if (e) count++;
    });
    if (count == 0) {
      this.__proto__.loading.clear();
    }
    return count;
  }
  getTotal(): number {
    return this.__proto__.loading.size;
  }
}
