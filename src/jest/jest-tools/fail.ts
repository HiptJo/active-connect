/**
 * Raises an Error, can be used to stop a test case and mark as failed.
 * @param [error] - Error message
 */
export function failMethod(error: any = "fail was called in a test."): never {
  throw new Error(error);
}

// defines this method as fail method
global.fail = failMethod;
