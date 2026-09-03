import type { LyraApi } from '../preload'

declare module '*.css'

declare global {
  interface Window {
    lyra: LyraApi
  }
}

export {}
