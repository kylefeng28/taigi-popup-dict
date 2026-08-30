import type { ZhongwenConfig, MultiDictSearchResult, DictionaryResult } from './types';
import type { Dictionary, DictionaryLoader } from './dictionary';

/** Minimal lookup surface a module needs to reach its own loaded dictionaries. */
export interface DictionaryLookup {
    getDictionary(id: string): Dictionary | undefined;
}

/**
 * Dictionary registration for a language module: the catalog shown in options,
 * the loaders keyed by dictionary id, and an optional status probe.
 */
export interface DictionaryRegistration {
    /** Dictionaries offered by this module, for the options page. */
    catalog: { id: string; label: string }[];
    /** Loaders keyed by dictionary id. */
    loaders: Record<string, DictionaryLoader>;
    /** Optional language-specific status (e.g. cached-dictionary info). */
    getStatus?(): Promise<unknown>;
}

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

    /** Dictionary registration: catalog, loaders, and optional status probe. */
    dictionaries: DictionaryRegistration;

    /** Render a single dictionary entry to an HTML string for the popup. */
    renderEntry(entry: DictionaryResult, ctx: RenderContext): string;

    /**
     * Enrich an aggregated search result with language-specific metadata
     * (e.g. grammar/vocab hints). Called after the core aggregates results,
     * with a lookup for the module's own loaded dictionaries. Optional.
     */
    postProcessSearch?(result: MultiDictSearchResult, dicts: DictionaryLookup): void;
}
