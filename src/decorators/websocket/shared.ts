/**
 * @deprecated
 */
export function Shared<T>(defaultValue?: T) {
  return function _Shared(target: any, propertyKey: string) {};
}
