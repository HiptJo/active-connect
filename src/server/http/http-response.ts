export interface HttpResponse {
  content: any;
  contentType: string | null | undefined;
  status: number;
  contentEncoding: "binary" | "base64" | null | undefined;
}
