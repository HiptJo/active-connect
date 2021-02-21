export function Shared<T>(defaultValue?: T) {
  return function (target: any, propertyKey: string) {
    if (!target.___data) target.___data = {};
    target.___data[propertyKey] = defaultValue || target[propertyKey];
  };
}
