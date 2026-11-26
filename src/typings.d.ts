declare module 'mammoth/mammoth.browser' {
  export interface MammothImage {
    contentType: string;
    readAsBase64String(): Promise<string>;
  }

  export const images: {
    imgElement(
      fn: (image: MammothImage) => Promise<{ src: string; alt?: string }> | { src: string; alt?: string }
    ): unknown;
  };

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string[] | string; includeDefaultStyleMap?: boolean; convertImage?: unknown }
  ): Promise<{ value: string; messages: { type: string; message: string }[] }>;
}
