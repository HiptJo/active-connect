//@todo export from ng integration package

export function Route(
  method: string,
  loadingPattern?: string,
  dontEnsureTransmission?: boolean
) {
  return function _Route(target: any, propertyKey: string): any {
    // method annotation
    const original = target[propertyKey];
    target[propertyKey] = async function execRoute(data: any): Promise<any> {
      const promise = original(data);
      const res = await this.client.send(method, data);
      await promise;
      return res;
    };
    return target;
  };
}
