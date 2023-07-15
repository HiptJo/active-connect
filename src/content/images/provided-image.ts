import { ProvidedFile } from "../files/provided-file";

/**
 * Represents a provided image file.
 * Data of this type is returned by FileProviders.
 * The contained image data is then sent as a response to the HTTP request.
 */
export class ProvidedImage extends ProvidedFile {
  /**
   * Creates a new `ProvidedImage` instance from a Data URL.
   * @param dataUrl - The Data URL representing the image.
   * @param id - The ID of the image.
   * @param label - The label of the image.
   * @returns - The created `ProvidedImage` instance.
   * @throws - If the provided Data URL is invalid.
   */
  public static getFromDataURL(
    dataUrl: string,
    id: number,
    label: string
  ): ProvidedImage {
    var matches: any = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw Error("Could not get ProvidedImage from DataURL");
    }

    return new ProvidedImage(id, label, matches[2], matches[1]);
  }
}
