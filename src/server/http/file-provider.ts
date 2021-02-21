import { ProvidedFile } from "../../content/files/provided-file";

export class FileProvider {
  constructor(
    public label: string,
    public callback: (id: string, auth: string) => Promise<ProvidedFile>
  ) {}
}
