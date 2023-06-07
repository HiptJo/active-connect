const failMethod = (error: any = "fail was called in a test.") => {
  throw new Error(error);
};

global.fail = failMethod;

export const fail = failMethod;
