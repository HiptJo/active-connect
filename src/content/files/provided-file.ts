export class ProvidedFile {
  constructor(
    public id: number,
    public label: string,
    public data: string,
    public contentType: string,
    public cacheDuration?: number | undefined
  ) {}
}
