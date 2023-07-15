/**
 * Represents a provided file.
 * Data of this type is returned by FileProviders.
 * The contained data is then sent as a response to the HTTP request.
 */
export class ProvidedFile {
  /**
   * Creates a new instance of the `ProvidedFile` class.
   * @param id - The ID of the file.
   * @param label - The label of the file.
   * @param data - The file data.
   * @param contentType - The content type of the file.
   */
  constructor(
    public id: number,
    public label: string,
    public data: string,
    public contentType: string
  ) {}
}
