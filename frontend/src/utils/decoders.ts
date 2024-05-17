import { Buffer } from "buffer";

export function decodeBase64Data(base64Data: string) {
  const byteCharacters = Buffer.from(base64Data, "base64").toString("binary");
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = Uint8Array.from(byteNumbers);
  const blob = new Blob([byteArray]);
  const url = URL.createObjectURL(blob);
  return url;
}
