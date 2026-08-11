import { TaigiDictionary } from './taigi';
import type { DictionaryLoader } from './dictionary';
import { getJsonGzipped } from '../util';

/**
 * Loader for the Taigi (Taiwanese Hokkien) dictionary.
 * Loads the bundled dict-twblg.json data from the extension.
 */
export class TaigiLoader implements DictionaryLoader {
    readonly id = 'taigi';

    async loadDictionary(): Promise<TaigiDictionary> {
        const data = await getJsonGzipped('data/dict-twblg.json.gz');
        const dataExt = await getJsonGzipped('data/dict-twblg-ext.json.gz');
        for (let i = 0; i < dataExt.length; i++) {
            data.push(dataExt[i]);
        }
        return new TaigiDictionary(data);
    }

    async refreshDictionary(): Promise<TaigiDictionary> {
        // Taigi data is bundled; refresh just reloads from bundle
        return this.loadDictionary();
    }
}
