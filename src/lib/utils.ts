/* eslint-disable @typescript-eslint/ban-types */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type ExtractFunction<T> = Extract<T, Function> extends never ? Function : Extract<T, Function>
export function isFunction<T>(value: Function | T): value is ExtractFunction<T> {
  return typeof value === "function"
}

export function calculatePercentage(value: number, { min, max }: { min: number, max: number }) {
  return ((value - min) / (max - min)) * 100
}

export function secondsToTimecode(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds - minutes * 60
  return `${minutes}:${remainingSeconds.toFixed(2).padStart(2, "0")}`
}
