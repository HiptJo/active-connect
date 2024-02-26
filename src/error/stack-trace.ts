export class StackTrace {
  static setTrace(e: any, ...labels: string[]) {
    let errorMessage = e?.toString() || "Error (no description provided)";
    if (e && e.message) {
      errorMessage = e.message;
    }
    if (!e || !e?.stack) {
      const silent = e?.SILENT || false;
      const isAuthenticationError = e?.isAuthenticationError || false;
      e = new Error(errorMessage);
      e.SILENT = silent;
      e.isAuthenticationError = isAuthenticationError;
    }
    const stack = e?.stack?.split("\n") || [""];
    e.stack = e.message;
    labels.forEach((l) => (e.stack += `\n    [${l}]`));
    e.stack += stack.slice(1).join("\n");
    return e;
  }
}
