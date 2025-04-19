// src/index.ts
import remarkInlineAsideFootnotesPlugin from './remark-marginnotes.js';
import { inlineAsideFootnoteHandlers as rehypeInlineAsideFootnoteHandlers } from './rehype-handlers.js';

// Export the remark plugin as the default export
export default remarkInlineAsideFootnotesPlugin;

// Export the rehype handlers as a named export
export { rehypeInlineAsideFootnoteHandlers };

// Re-export types if needed for consumers (Optional but good practice)
export type { AsideFootnoteReference, AsideFootnoteDefinition } from './remark-marginnotes.js';