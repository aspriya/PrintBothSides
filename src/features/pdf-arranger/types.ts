export type ImagePlacement = {
  id: "front" | "back";
  label: string;
  fileName: string;
  src: string;
  pdfData: string;
  aspectRatio: number;
  x: number;
  y: number;
  width: number;
  rotation: number;
};
