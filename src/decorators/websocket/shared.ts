/**
 * @deprecated
 */
export function Shared<T>(defaultValue?: T) {
  if (defaultValue) {
    throw Error(
      "Active-Connect/@Shared: defaultValue is no longer supported, please assign the value to the variable itself."
    );
  }
  return function _Shared(target: any, propertyKey: string) {};
}
