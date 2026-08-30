import type { Dictionary } from './dictionary';
import type { MultiDictSearchResult, DictionaryResult } from './types';
import type { LanguageModule } from './language-module';

/**
 * Manages multiple dictionary instances and aggregates search results.
 */
export class DictionaryManager {
    private dictionaries: Dictionary[] = [];
    private languageModule: LanguageModule;

    constructor(languageModule: LanguageModule) {
        this.languageModule = languageModule;
    }

    deactivate(): void {
        this.dictionaries = [];
    }

    addDictionary(dict: Dictionary): void {
        // Replace any existing dictionary with the same id rather than appending
        // a duplicate. Guards against duplicate entries if a dictionary is added
        // more than once (e.g. overlapping load/refresh calls).
        const existingIdx = this.dictionaries.findIndex(d => d.id === dict.id);
        if (existingIdx !== -1) {
            this.dictionaries[existingIdx] = dict;
            return;
        }
        this.dictionaries.push(dict);
    }

    removeDictionary(id: string): void {
        this.dictionaries = this.dictionaries.filter(d => d.id !== id);
    }

    getDictionary(id: string): Dictionary | undefined {
        return this.dictionaries.find(d => d.id === id);
    }

    getDictionaryIds(): string[] {
        return this.dictionaries.map(d => d.id);
    }

    get loaded(): boolean {
        return this.dictionaries.length > 0;
    }

    /**
     * Load all enabled dictionaries in the configured order.
     */
    async loadDictionaries(enabledDicts: string[]): Promise<void> {
        this.dictionaries = [];

        console.log('[Zhongwen] Loading dictionaries:', enabledDicts);

        // Load dictionaries in the order specified by enabledDicts
        for (const dictId of enabledDicts) {
            const loader = this.languageModule.dictionaries.loaders[dictId];
            if (!loader) {
                console.log(`[Zhongwen] Unknown dictionary type: ${dictId}`)
                continue;
            }

            try {
                const dict = await loader.loadDictionary();
                this.addDictionary(dict);
            } catch (err) {
                console.warn(`[Zhongwen] Failed to load dictionary '${dictId}':`, err);
            }
        }
    }

    /**
     * Force refresh all loaded dictionaries.
     */
    async refreshDictionaries(): Promise<void> {
        const ids = this.getDictionaryIds();
        this.dictionaries = [];

        for (const dictId of ids) {
            const loader = this.languageModule.dictionaries.loaders[dictId];
            if (!loader) continue;

            try {
                const dict = await loader.refreshDictionary();
                this.addDictionary(dict);
            } catch (err) {
                console.warn(`[Zhongwen] Failed to refresh dictionary '${dictId}':`, err);
            }
        }
    }

    async getDictStatus(): Promise<unknown> {
        return await this.languageModule.dictionaries.getStatus?.();
    }

    /**
     * Search all registered dictionaries for the given text.
     * Returns aggregated results from all dictionaries as a MultiDictSearchResult.
     */
    search(text: string, maxResultsPerDict: number = 7): MultiDictSearchResult | null {
        const allResults: DictionaryResult[] = [];
        let maxMatchLen = 0;
        let hasMore = false;

        for (const dict of this.dictionaries) {
            const response = dict.search(text, maxResultsPerDict);
            if (!response) continue;

            if (response.matchLen > maxMatchLen) {
                maxMatchLen = response.matchLen;
            }
            allResults.push(...response.entries);
            if (response.more) hasMore = true;
        }

        if (allResults.length === 0) return null;

        const result: MultiDictSearchResult = {
            matchLen: maxMatchLen,
            results: allResults,
            more: hasMore || undefined,
        };

        // Let the active language module enrich the result (e.g. grammar/vocab hints).
        this.languageModule.postProcessSearch?.(result, this);

        return result;
    }
}
