declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string[] | string; includeDefaultStyleMap?: boolean }
  ): Promise<{ value: string; messages: { type: string; message: string }[] }>;
}
