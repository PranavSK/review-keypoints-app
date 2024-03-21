/* eslint-disable @typescript-eslint/ban-types */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ExtractFunction<T> =
  Extract<T, Function> extends never ? Function : Extract<T, Function>;
export function isFunction<T>(
  value: Function | T,
): value is ExtractFunction<T> {
  return typeof value === "function";
}

export function calculatePercentage(
  value: number,
  { min, max }: { min: number; max: number },
) {
  return ((value - min) / (max - min)) * 100;
}

export function secondsToTimecode(seconds: number, showHours = false) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (showHours) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours.toFixed(0).padStart(2, "0")}:${remainingMinutes.toFixed(0).padStart(2, "0")}:${remainingSeconds.toFixed(2).padStart(2, "0")}`
  }
  return `${minutes}:${remainingSeconds.toFixed(2).padStart(2, "0")}`;
}

export async function getVideoDuration(url: string) {
  return new Promise<number>((resolve) => {
    const vidEl = document.createElement("video");
    vidEl.src = url;
    vidEl.addEventListener("loadedmetadata", () => {
      resolve(vidEl.duration);
      vidEl.remove();
    });
    vidEl.style.display = "none";
    document.body.append(vidEl);
  });
}
