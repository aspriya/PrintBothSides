"use client";

/* eslint-disable @next/next/no-img-element -- Local blob URLs cannot use Next.js image optimization. */

import { jsPDF } from "jspdf";
import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import type { ImagePlacement } from "./types";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const initialPlacement = {
  x: 15,
  y: 15,
  width: 180,
  scale: 100,
  rotation: 0,
  tilt: 0,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
  flipHorizontal: false,
  flipVertical: false,
};

type NumericControl = "x" | "y" | "width" | "scale" | "rotation" | "tilt";
type CropControl = "cropTop" | "cropRight" | "cropBottom" | "cropLeft";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function getCrop(image: ImagePlacement) {
  const horizontal = Math.max(0.1, 1 - (image.cropLeft + image.cropRight) / 100);
  const vertical = Math.max(0.1, 1 - (image.cropTop + image.cropBottom) / 100);
  return {
    horizontal,
    vertical,
    aspectRatio: (image.aspectRatio * horizontal) / vertical,
  };
}

function getPrintedSize(image: ImagePlacement) {
  const crop = getCrop(image);
  const width = image.width * (image.scale / 100);
  return { width, height: width / crop.aspectRatio };
}

function resetImage(image: ImagePlacement): ImagePlacement {
  return { ...image, ...initialPlacement, y: image.id === "back" ? 155 : 15 };
}

function ImageControls({
  image,
  onChange,
  onRemove,
  onReset,
}: {
  image: ImagePlacement;
  onChange: (changes: Partial<ImagePlacement>) => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  const controlId = useId();
  const { width, height } = getPrintedSize(image);

  const numericInput = (
    label: string,
    key: NumericControl,
    min: number,
    max: number,
    unit: string,
    step = 1,
  ) => (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="relative">
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-12 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
          type="number"
          min={min}
          max={max}
          step={step}
          value={image[key]}
          onChange={(event) => onChange({ [key]: clamp(Number(event.target.value), min, max) })}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
          {unit}
        </span>
      </div>
    </label>
  );

  const cropInput = (label: string, key: CropControl, opposite: CropControl) => (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      <span>{label} {image[key]}%</span>
      <input
        className="accent-indigo-600"
        type="range"
        min="0"
        max={90 - image[opposite]}
        value={image[key]}
        onChange={(event) => onChange({ [key]: Number(event.target.value) })}
      />
    </label>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby={controlId}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 id={controlId} className="font-semibold text-slate-950">{image.label}</h3>
          <p className="mt-0.5 max-w-48 truncate text-xs text-slate-500">{image.fileName}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onReset} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300">
            Reset
          </button>
          <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-rose-600 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300">
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {numericInput("Left", "x", 0, PAGE_WIDTH, "mm")}
        {numericInput("Top", "y", 0, PAGE_HEIGHT, "mm")}
        {numericInput("Width", "width", 1, PAGE_WIDTH, "mm")}
        {numericInput("Rotate", "rotation", 0, 359, "deg")}
      </div>

      <div className="mt-4 rounded-xl bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor={`${controlId}-scale`}>Scale</label>
          <output className="text-sm font-bold text-indigo-700">{image.scale}%</output>
        </div>
        <input
          id={`${controlId}-scale`}
          className="mt-2 w-full accent-indigo-600"
          type="range"
          min="25"
          max="200"
          value={image.scale}
          onChange={(event) => onChange({ scale: Number(event.target.value) })}
        />
      </div>

      <div className="mt-3 rounded-xl bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor={`${controlId}-tilt`}>Horizontal tilt</label>
          <output className="text-sm font-bold text-indigo-700">{image.tilt} deg</output>
        </div>
        <input
          id={`${controlId}-tilt`}
          className="mt-2 w-full accent-indigo-600"
          type="range"
          min="-30"
          max="30"
          value={image.tilt}
          onChange={(event) => onChange({ tilt: Number(event.target.value) })}
        />
      </div>

      <fieldset className="mt-3 rounded-xl bg-white p-3">
        <legend className="px-1 text-sm font-semibold text-slate-700">Crop edges</legend>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          {cropInput("Top", "cropTop", "cropBottom")}
          {cropInput("Right", "cropRight", "cropLeft")}
          {cropInput("Bottom", "cropBottom", "cropTop")}
          {cropInput("Left", "cropLeft", "cropRight")}
        </div>
      </fieldset>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={image.flipHorizontal}
          onClick={() => onChange({ flipHorizontal: !image.flipHorizontal })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700"
        >
          Mirror horizontal
        </button>
        <button
          type="button"
          aria-pressed={image.flipVertical}
          onClick={() => onChange({ flipVertical: !image.flipVertical })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700"
        >
          Mirror vertical
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">Printed size: {width.toFixed(1)} x {height.toFixed(1)} mm</p>
    </section>
  );
}

async function createEditedImageData(image: ImagePlacement) {
  const source = new Image();
  source.src = image.pdfData;
  await source.decode();

  const crop = getCrop(image);
  const sourceX = (image.cropLeft / 100) * source.naturalWidth;
  const sourceY = (image.cropTop / 100) * source.naturalHeight;
  const sourceWidth = source.naturalWidth * crop.horizontal;
  const sourceHeight = source.naturalHeight * crop.vertical;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const shear = Math.tan((image.tilt * Math.PI) / 180);
  const scaleX = 1 / (1 + Math.abs(shear) / crop.aspectRatio);
  const xOffset = shear < 0 ? -shear * canvas.height * scaleX : 0;
  context.translate(xOffset, 0);
  context.transform(scaleX, 0, shear * scaleX, 1, 0, 0);
  if (image.flipHorizontal || image.flipVertical) {
    context.translate(image.flipHorizontal ? sourceWidth : 0, image.flipVertical ? sourceHeight : 0);
    context.scale(image.flipHorizontal ? -1 : 1, image.flipVertical ? -1 : 1);
  }
  context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return canvas.toDataURL("image/jpeg", 0.95);
}

export function PdfArranger() {
  const [images, setImages] = useState<Record<string, ImagePlacement>>({});
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function addImage(id: "front" | "back", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      return;
    }

    const src = URL.createObjectURL(file);
    objectUrls.current.add(src);
    const decoded = new Image();
    decoded.src = src;

    try {
      await decoded.decode();
      const canvas = document.createElement("canvas");
      canvas.width = decoded.naturalWidth;
      canvas.height = decoded.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      context.drawImage(decoded, 0, 0);
      const pdfData = canvas.toDataURL("image/jpeg", 0.95);
      setImages((current) => {
        const previous = current[id];
        if (previous) {
          URL.revokeObjectURL(previous.src);
          objectUrls.current.delete(previous.src);
        }
        return {
          ...current,
          [id]: {
            id,
            label: id === "front" ? "First image" : "Second image",
            fileName: file.name,
            src,
            pdfData,
            aspectRatio: decoded.naturalWidth / decoded.naturalHeight,
            ...initialPlacement,
            y: id === "back" ? 155 : 15,
          },
        };
      });
      setError("");
    } catch {
      URL.revokeObjectURL(src);
      objectUrls.current.delete(src);
      setError("That image could not be read. Try a different file.");
    }
  }

  function updateImage(id: string, changes: Partial<ImagePlacement>) {
    setImages((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  }

  function removeImage(id: string) {
    setImages((current) => {
      URL.revokeObjectURL(current[id].src);
      objectUrls.current.delete(current[id].src);
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function downloadPdf() {
    const selected = Object.values(images);
    if (selected.length !== 2) {
      setError("Add both images before exporting the PDF.");
      return;
    }
    setIsExporting(true);
    setError("");
    try {
      const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (const image of selected) {
        const { width, height } = getPrintedSize(image);
        document.addImage(await createEditedImageData(image), "JPEG", image.x, image.y, width, height, undefined, "FAST", image.rotation);
      }
      document.save("print-both-sides.pdf");
    } catch {
      setError("The PDF could not be created. Please try different image files.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectedImages = ["front", "back"].map((id) => images[id]).filter((image): image is ImagePlacement => Boolean(image));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0e7ff,_transparent_35%),linear-gradient(135deg,_#f8fafc,_#eef2ff)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-bold tracking-[0.18em] text-indigo-600 uppercase">PrintBothSides</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Arrange. Print. Done.</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Place two local images on a single A4 page. Your files stay in this browser.</p>
          </div>
          <button type="button" onClick={downloadPdf} disabled={isExporting} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300">
            {isExporting ? "Preparing PDF..." : "Download PDF"}
          </button>
        </header>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-labelledby="preview-heading" className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id="preview-heading" className="text-lg font-bold text-slate-950">Page preview</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">A4 · 210 x 297 mm</span>
            </div>
            <div className="mx-auto aspect-[210/297] w-full max-w-[560px] overflow-hidden rounded-sm bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="relative h-full w-full">
                {selectedImages.map((image) => {
                  const crop = getCrop(image);
                  const { width, height } = getPrintedSize(image);
                  return (
                    <div
                      key={image.id}
                      className="absolute origin-top-left overflow-hidden"
                      style={{
                        left: `${(image.x / PAGE_WIDTH) * 100}%`,
                        top: `${(image.y / PAGE_HEIGHT) * 100}%`,
                        width: `${(width / PAGE_WIDTH) * 100}%`,
                        height: `${(height / PAGE_HEIGHT) * 100}%`,
                        transform: `rotate(${image.rotation}deg)`,
                      }}
                    >
                      <img
                        src={image.src}
                        alt={`${image.label} preview`}
                        className="absolute max-w-none origin-top-left"
                        style={{
                          width: `${100 / crop.horizontal}%`,
                          height: `${100 / crop.vertical}%`,
                          left: `${-image.cropLeft / crop.horizontal}%`,
                          top: `${-image.cropTop / crop.vertical}%`,
                          transform: `scaleX(${image.flipHorizontal ? -1 : 1}) scaleY(${image.flipVertical ? -1 : 1}) skewX(${image.tilt}deg)`,
                        }}
                      />
                    </div>
                  );
                })}
                {selectedImages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">+</div>
                    <p className="font-semibold text-slate-800">Your A4 page is ready</p>
                    <p className="mt-1 text-sm text-slate-500">Add two images to begin arranging.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside aria-label="Image arrangement controls" className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50">
              <h2 className="text-lg font-bold text-slate-950">Add your images</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Select the two sides or images you want to print.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {(["front", "back"] as const).map((id, index) => (
                  <label key={id} className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-100 focus-within:ring-3 focus-within:ring-indigo-200">
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => addImage(id, event)} />
                    {images[id] ? `Replace image ${index + 1}` : `Choose image ${index + 1}`}
                  </label>
                ))}
              </div>
            </section>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

            {selectedImages.map((image) => (
              <ImageControls
                key={image.id}
                image={image}
                onChange={(changes) => updateImage(image.id, changes)}
                onRemove={() => removeImage(image.id)}
                onReset={() => updateImage(image.id, resetImage(image))}
              />
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
