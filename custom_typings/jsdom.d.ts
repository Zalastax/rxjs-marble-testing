import { Config, DocumentWithParentWindow } from 'jsdom'

declare module 'jsdom' {
  export function jsdom(markup?: string, config?: Config): DocumentWithParentWindow;
}