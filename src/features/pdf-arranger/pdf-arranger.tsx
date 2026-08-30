"use client";

/* eslint-disable @next/next/no-img-element -- Local blob URLs cannot use Next.js image optimization. */

import { jsPDF } from "jspdf";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FlipHorizontal,
  FlipVertical,
  ImagePlus,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  ChangeEvent,
  type MouseEvent,
  useEffect,
  useId,
  type PointerEvent,
  useRef,
  useState,
} from "react";
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
type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  resizeX?: -1 | 1;
  resizeY?: -1 | 1;
};

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
  const sourceWidth = image.width * (image.scale / 100);
  const sourceHeight = sourceWidth / crop.aspectRatio;
  const rotation = (image.rotation * Math.PI) / 180;
  return {
    width: Math.abs(sourceWidth * Math.cos(rotation)) + Math.abs(sourceHeight * Math.sin(rotation)),
    height: Math.abs(sourceWidth * Math.sin(rotation)) + Math.abs(sourceHeight * Math.cos(rotation)),
  };
}

function getUnrotatedPrintedSize(image: ImagePlacement) {
  const width = image.width * (image.scale / 100);
  return { width, height: width / getCrop(image).aspectRatio };
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
  const [isExpanded, setIsExpanded] = useState(true);
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
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`${controlId}-content`}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${image.label}`}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300"
          >
            {isExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>
          <button type="button" aria-label={`Reset ${image.label}`} title="Reset edits" onClick={onReset} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300">
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Remove ${image.label}`} title="Remove image" onClick={onRemove} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-rose-600 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300">
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id={`${controlId}-content`}>
          <div className="grid grid-cols-2 gap-3">
            {numericInput("Left", "x", 0, PAGE_WIDTH, "mm")}
            {numericInput("Top", "y", 0, PAGE_HEIGHT, "mm")}
            {numericInput("Width", "width", 1, PAGE_WIDTH, "mm")}
            {numericInput("Rotate", "rotation", 0, 359, "deg")}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange({ rotation: (image.rotation + 270) % 360 })}
              aria-label="Rotate left 90 degrees"
              title="Rotate left 90 degrees"
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300"
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ rotation: (image.rotation + 90) % 360 })}
              aria-label="Rotate right 90 degrees"
              title="Rotate right 90 degrees"
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300"
            >
              <RotateCw size={18} aria-hidden="true" />
            </button>
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
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700"
            >
              <FlipHorizontal size={17} aria-hidden="true" />
              <span>Mirror horizontal</span>
            </button>
            <button
              type="button"
              aria-pressed={image.flipVertical}
              onClick={() => onChange({ flipVertical: !image.flipVertical })}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700"
            >
              <FlipVertical size={17} aria-hidden="true" />
              <span>Mirror vertical</span>
            </button>
          </div>
        </div>
      )}

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
  if (image.rotation === 0) return canvas.toDataURL("image/jpeg", 0.95);

  const rotation = (image.rotation * Math.PI) / 180;
  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = Math.ceil(
    Math.abs(canvas.width * Math.cos(rotation)) + Math.abs(canvas.height * Math.sin(rotation)),
  );
  rotatedCanvas.height = Math.ceil(
    Math.abs(canvas.width * Math.sin(rotation)) + Math.abs(canvas.height * Math.cos(rotation)),
  );
  const rotatedContext = rotatedCanvas.getContext("2d");
  if (!rotatedContext) throw new Error("Canvas is unavailable.");
  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate(rotation);
  rotatedContext.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotatedCanvas.toDataURL("image/jpeg", 0.95);
}

export function PdfArranger() {
  const [images, setImages] = useState<Record<string, ImagePlacement>>({});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const previewRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

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
      setSelectedImageId(id);
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
    if (selectedImageId === id) setSelectedImageId(null);
    setImages((current) => {
      URL.revokeObjectURL(current[id].src);
      objectUrls.current.delete(current[id].src);
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function startMove(
    event: PointerEvent<HTMLElement>,
    image: ImagePlacement,
  ) {
    if (event.button !== 0) return;
    const { width, height } = getPrintedSize(image);
    setSelectedImageId(image.id);
    dragState.current = {
      id: image.id,
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: image.x,
      startY: image.y,
      startWidth: width,
      startHeight: height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startResize(
    event: PointerEvent<HTMLElement>,
    image: ImagePlacement,
    resizeX: -1 | 1,
    resizeY: -1 | 1,
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const { width, height } = getPrintedSize(image);
    dragState.current = {
      id: image.id,
      mode: "resize",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: image.x,
      startY: image.y,
      startWidth: width,
      startHeight: height,
      resizeX,
      resizeY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startMouseDrag(event: MouseEvent<HTMLDivElement>, image: ImagePlacement) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const resizeHandle = target.closest<HTMLElement>("[data-resize-x]");
    if (!resizeHandle && target.closest("[data-preview-control]")) return;

    const { width, height } = getPrintedSize(image);
    dragState.current = {
      id: image.id,
      mode: resizeHandle ? "resize" : "move",
      pointerId: -1,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: image.x,
      startY: image.y,
      startWidth: width,
      startHeight: height,
      resizeX: resizeHandle?.dataset.resizeX === "-1" ? -1 : 1,
      resizeY: resizeHandle?.dataset.resizeY === "-1" ? -1 : 1,
    };
    setSelectedImageId(image.id);
  }

  function updateDrag(clientX: number, clientY: number, pointerId: number) {
    const state = dragState.current;
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!state || state.pointerId !== pointerId || !bounds) return;

    const deltaX = ((clientX - state.startClientX) / bounds.width) * PAGE_WIDTH;
    const deltaY = ((clientY - state.startClientY) / bounds.height) * PAGE_HEIGHT;
    setImages((current) => {
      const image = current[state.id];
      if (!image) return current;

      if (state.mode === "move") {
        return {
          ...current,
          [state.id]: {
            ...image,
            x: clamp(state.startX + deltaX, 0, Math.max(0, PAGE_WIDTH - state.startWidth)),
            y: clamp(state.startY + deltaY, 0, Math.max(0, PAGE_HEIGHT - state.startHeight)),
          },
        };
      }

      const renderedWidth = clamp(
        state.startWidth + deltaX * (state.resizeX ?? 1),
        image.width * 0.25,
        Math.min(PAGE_WIDTH, image.width * 2),
      );
      const unscaledSize = getPrintedSize({ ...image, scale: 100 });
      const nextScale = (renderedWidth / unscaledSize.width) * 100;
      const renderedHeight = renderedWidth * (unscaledSize.height / unscaledSize.width);
      const x = state.resizeX === -1
        ? state.startX + state.startWidth - renderedWidth
        : state.startX;
      const y = state.resizeY === -1
        ? state.startY + state.startHeight - renderedHeight
        : state.startY;
      return {
        ...current,
        [state.id]: {
          ...image,
          scale: nextScale,
          x: clamp(x, 0, Math.max(0, PAGE_WIDTH - renderedWidth)),
          y: clamp(y, 0, Math.max(0, PAGE_HEIGHT - renderedHeight)),
        },
      };
    });
  }

  function endDrag(pointerId: number) {
    if (dragState.current?.pointerId !== pointerId) return;
    dragState.current = null;
  }

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) =>
      updateDrag(event.clientX, event.clientY, event.pointerId);
    const handlePointerEnd = (event: globalThis.PointerEvent) =>
      endDrag(event.pointerId);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    const handleMouseMove = (event: globalThis.MouseEvent) =>
      updateDrag(event.clientX, event.clientY, -1);
    const handleMouseUp = () => endDrag(-1);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
        document.addImage(
          await createEditedImageData(image),
          "JPEG",
          image.x,
          image.y,
          width,
          height,
          undefined,
          "FAST",
          0,
        );
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
          <button type="button" onClick={downloadPdf} disabled={isExporting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300">
            <Download size={18} aria-hidden="true" />
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
              <div
                ref={previewRef}
                className="relative h-full w-full"
              >
                {selectedImages.map((image) => {
                  const crop = getCrop(image);
                  const { width, height } = getPrintedSize(image);
                  const unrotatedSize = getUnrotatedPrintedSize(image);
                  const isSelected = selectedImageId === image.id;
                  return (
                    <div
                      key={image.id}
                      className="absolute"
                      onMouseDown={(event) => startMouseDrag(event, image)}
                      onMouseMove={(event) =>
                        updateDrag(event.clientX, event.clientY, -1)
                      }
                      onMouseUp={() => endDrag(-1)}
                      onPointerDown={(event) => {
                        const target = event.target as HTMLElement;
                        const resizeHandle = target.closest<HTMLElement>("[data-resize-x]");
                        if (resizeHandle) {
                          startResize(
                            event,
                            image,
                            resizeHandle.dataset.resizeX === "-1" ? -1 : 1,
                            resizeHandle.dataset.resizeY === "-1" ? -1 : 1,
                          );
                          return;
                        }
                        if (!target.closest("[data-preview-control]")) {
                          startMove(event, image);
                        }
                      }}
                      style={{
                        left: `${(image.x / PAGE_WIDTH) * 100}%`,
                        top: `${(image.y / PAGE_HEIGHT) * 100}%`,
                        width: `${(width / PAGE_WIDTH) * 100}%`,
                        height: `${(height / PAGE_HEIGHT) * 100}%`,
                        zIndex: isSelected ? 10 : 0,
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Select ${image.label}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedImageId(image.id)}
                        className={`absolute z-0 touch-none cursor-grab overflow-hidden outline-none transition active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-indigo-500 ${
                          isSelected
                            ? "ring-2 ring-indigo-600 ring-offset-2"
                            : "hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1"
                        }`}
                        style={{
                          left: "50%",
                          top: "50%",
                          width: `${(unrotatedSize.width / width) * 100}%`,
                          height: `${(unrotatedSize.height / height) * 100}%`,
                          transform: `translate(-50%, -50%) rotate(${image.rotation}deg)`,
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
                      </button>
                      {isSelected && (
                        <>
                          <div
                            className="absolute -top-11 left-0 flex items-center gap-1 rounded-lg bg-slate-900 p-1 shadow-lg"
                            role="toolbar"
                            data-preview-control
                            aria-label={`${image.label} quick controls`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                            type="button"
                            aria-label={`Decrease ${image.label} size`}
                            title="Decrease size"
                            onClick={() => updateImage(image.id, { scale: clamp(image.scale - 5, 25, 200) })}
                            className="grid size-8 place-items-center rounded-md text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <ZoomOut size={17} aria-hidden="true" />
                            </button>
                            <button
                            type="button"
                            aria-label={`Increase ${image.label} size`}
                            title="Increase size"
                            onClick={() => updateImage(image.id, { scale: clamp(image.scale + 5, 25, 200) })}
                            className="grid size-8 place-items-center rounded-md text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <ZoomIn size={17} aria-hidden="true" />
                            </button>
                            <span className="h-5 w-px bg-white/20" aria-hidden="true" />
                            <button
                            type="button"
                            aria-label={`Rotate ${image.label} left 90 degrees`}
                            title="Rotate left 90 degrees"
                            onClick={() => updateImage(image.id, { rotation: (image.rotation + 270) % 360 })}
                            className="grid size-8 place-items-center rounded-md text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <RotateCcw size={17} aria-hidden="true" />
                            </button>
                            <button
                            type="button"
                            aria-label={`Rotate ${image.label} right 90 degrees`}
                            title="Rotate right 90 degrees"
                            onClick={() => updateImage(image.id, { rotation: (image.rotation + 90) % 360 })}
                            className="grid size-8 place-items-center rounded-md text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <RotateCw size={17} aria-hidden="true" />
                            </button>
                            <span className="h-5 w-px bg-white/20" aria-hidden="true" />
                            <button
                            type="button"
                            aria-label={`Remove ${image.label}`}
                            title="Remove image"
                            onClick={() => removeImage(image.id)}
                            className="grid size-8 place-items-center rounded-md text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </div>
                          {([
                            ["top-1 left-1 cursor-nwse-resize", -1, -1, "top left"],
                            ["top-1 right-1 cursor-nesw-resize", 1, -1, "top right"],
                            ["bottom-1 left-1 cursor-nesw-resize", -1, 1, "bottom left"],
                            ["right-1 bottom-1 cursor-nwse-resize", 1, 1, "bottom right"],
                          ] as const).map(([position, resizeX, resizeY, corner]) => (
                            <button
                              key={corner}
                              type="button"
                              aria-label={`Resize ${image.label} from ${corner}`}
                              title={`Resize from ${corner}`}
                              data-preview-control
                              data-resize-x={resizeX}
                              data-resize-y={resizeY}
                              onClick={() => updateImage(image.id, {
                                scale: clamp(image.scale + 5, 25, 200),
                              })}
                              className={`absolute z-20 size-4 rounded-sm border-2 border-white bg-indigo-600 shadow-sm focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-500 ${position}`}
                            />
                          ))}
                        </>
                      )}
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

          <aside aria-label="Image arrangement controls" className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50">
              <h2 className="text-lg font-bold text-slate-950">Add your images</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Select the two sides or images you want to print.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {(["front", "back"] as const).map((id, index) => (
                  <label key={id} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-100 focus-within:ring-3 focus-within:ring-indigo-200">
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => addImage(id, event)} />
                    <ImagePlus size={18} aria-hidden="true" />
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
