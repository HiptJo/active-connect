export function Shared<T>(defaultValue?: T) {
  return function (target: any, propertyKey: string) {
    if (!target.___data) target.___data = {};
    target.___data[propertyKey] = defaultValue;

    const descriptor = {
      get() {
        return target.___data[propertyKey];
      },
      set(val: T) {
        target.___data[propertyKey] = val;
      },
      enumerable: true,
      configurable: true,
    };
    Object.defineProperty(target, propertyKey, descriptor);
  };
}
