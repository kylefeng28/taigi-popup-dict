import type { ZhongwenConfig, MultiDictSearchResult, DictionaryResult } from './types';

/**
 * Context passed to a language module when rendering a single entry.
 * Carries everything a renderer needs without reaching into the content
 * script's module-level state.
 */
export interface RenderContext {
    /** Current configuration. */
    config: ZhongwenConfig;
    /** The full aggregated search result (for grammar/vocab index checks etc.). */
    result: MultiDictSearchResult;
    /** Index of the entry being rendered within result.results. */
    index: number;
    /** Whether tone colors should be applied. */
    showToneColors: boolean;
    /**
     * Clipboard/word-list accumulator, indexed by entry index.
     * A renderer stores the entry's exportable representation here.
     */
    texts: string[][];
}

/**
 * A language module owns everything language-specific: how entries render,
 * (later) keyboard shortcuts, help text, dictionary registration, and config.
 * The core popup engine drives the module through these hooks.
 */
export interface LanguageModule {
    /** Unique identifier, e.g. 'chinese'. */
    id: string;

    /** Render a single dictionary entry to an HTML string for the popup. */
    renderEntry(entry: DictionaryResult, ctx: RenderContext): string;
}
