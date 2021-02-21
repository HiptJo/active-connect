export abstract class ProvidedFile {
  public contentType: string | null;
  private _data_modified = false;
  private _data: string | null;
  public get data(): string | null {
    return this._data;
  }
  public set data(value: string | null) {
    this._data = value;
    this._data_modified = true;
  }
  constructor(public id: number, public label: string) {}

  async saveChanges() {
    if (this._data_modified) {
      await this.saveChangesWithContentChange();
    } else {
      await this.saveChangesWithoutContentChange();
    }
  }

  protected abstract saveChangesWithoutContentChange(): Promise<void>;
  protected abstract saveChangesWithContentChange(): Promise<void>;
}
