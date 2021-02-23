export class Router {
  public navigate(path: any[]) {}
  public isActive(path: string, strictEqual: boolean): boolean {
    return false;
  }
}
export class ActivatedRoute {
  public snapshot: any = {
    params: {
      path: "path",
    },
  };
}
