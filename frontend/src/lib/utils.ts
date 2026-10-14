import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only plain web links may become clickable: a "javascript:" link from external data would run in the page.
export const isWebUrl = (url?: string | null): url is string => !!url && /^https?:\/\//i.test(url)