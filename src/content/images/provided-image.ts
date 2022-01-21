import { ProvidedFile } from "../files/provided-file";

export class ProvidedImage extends ProvidedFile {
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
