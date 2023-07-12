/**
 * Mocks the Angular router, can be used to cover code that contains Angular routing code as well.
 */
export class Router {
  public navigate(path: any[]) {}
  public isActive(path: string, strictEqual: boolean): boolean {
    return false;
  }
}

/**
 * Mocks the Angular ActivatedRoute, can be used to cover code that contains Angular routing code as well.
 */
export class ActivatedRoute {
  public snapshot: any = {
    params: {
      path: "path",
    },
  };
}
