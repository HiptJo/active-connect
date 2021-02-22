export class HttpMethod {
  constructor(
    public method: string,
    public callback: (req: Express.Request, res: Express.Response) => void
  ) {}
}
