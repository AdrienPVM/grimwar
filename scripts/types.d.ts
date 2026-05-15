// Shim minimal pour les modules de scripts (content pipeline plan 04) qui n'ont
// pas de déclarations officielles. Les vrais types seront ajoutés au moment où
// le script sera réellement câblé.
declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: unknown;
  }
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export = pdfParse;
}
