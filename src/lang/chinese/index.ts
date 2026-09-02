import type { LanguageModule, RenderContext, DictionaryLookup } from '../../core/language-module';
import type { DictionaryResult, MultiDictSearchResult } from '../../core/types';
import { CedictDictionary, ID as CEDICT_ID, NAME as CEDICT_NAME } from './cedict';
import { ID as TAIGI_ID, NAME as TAIGI_NAME } from './taigi';
import { CedictLoader, getDictStatus } from './cedict-loader';
import { TaigiLoader } from './taigi-loader';
import { pinyinAndZhuyin } from './pinyin';

/** Render a CEDICT entry in the popup. */
function makeCedictHtml(entry: DictionaryResult, ctx: RenderContext): string {
    const { config, result, index, showToneColors, texts } = ctx;
    let html = '';
    let hanziClass = 'w-hanzi';
    if (config.fontSize === 'small') {
        hanziClass += '-small';
    }

    // Hanzi
    if (config.simpTrad === 'auto') {
        html += '<span class="' + hanziClass + '">' + entry.headword + '</span>&nbsp;';
    } else {
        html += '<span class="' + hanziClass + '">' + entry.headword + '</span>&nbsp;';
        if (entry.traditional && entry.traditional !== entry.headword) {
            html += '<span class="' + hanziClass + '">' + entry.traditional + '</span>&nbsp;';
        }
    }

    // Pinyin / Zhuyin
    let p: [string, string] = pinyinAndZhuyin(entry.reading, showToneColors, !config.zhuyin, config.zhuyin, config.fontSize);
    html += p[0];

    // Definition
    let defClass = 'w-def';
    if (config.fontSize === 'small') {
        defClass += '-small';
    }
    let translation: string = entry.definitions.map(d => d.def).join(' ◆ ');
    html += '<br><span class="' + defClass + '">' + translation + '</span><br>';

    let addFinalBr: boolean = false;

    // Grammar
    if (config.grammar && result.grammar && result.grammar.index === index) {
        html += '<br><span class="grammar">Press "g" for grammar and usage notes.</span><br>';
        addFinalBr = true;
    }

    // Vocab
    if (config.vocab && result.vocab && result.vocab.index === index) {
        html += '<br><span class="vocab">Press "v" for vocabulary notes.</span><br>';
        addFinalBr = true;
    }

    if (addFinalBr) {
        html += '<br>';
    }

    // Store for clipboard: [simplified, traditional, pinyin_text, translation, raw_pinyin]
    texts[index] = [entry.headword, entry.traditional || entry.headword, p[1], translation, entry.reading];

    return html;
}

/** Render a Taigi entry in the popup. */
function makeTaigiHtml(entry: DictionaryResult, ctx: RenderContext): string {
    const { config, index, texts } = ctx;
    let html = '';
    let hanziClass = 'w-hanzi';
    if (config.fontSize === 'small') {
        hanziClass += '-small';
    }

    // Headword
    html += '<span class="' + hanziClass + '">' + entry.headword + '</span>&nbsp;';

    // Reading type badge (白/文/替/俗)
    if (entry.readingType) {
        const colors: Record<string, string> = { '白': 'green', '文': 'blue', '替': 'gray', '俗': 'orange' };
        const color = colors[entry.readingType] || 'gray';
        html += '<span style="color:' + color + ';font-weight:bold;font-size:0.8em;">' + entry.readingType + '</span>&nbsp;';
    }

    // Tai-lo reading
    let pinyinClass = 'w-pinyin';
    if (config.fontSize === 'small') {
        pinyinClass += '-small';
    }
    html += '<span class="' + pinyinClass + '">' + entry.reading + '</span>';

    // Play button for MoE audio (each heteronym may have its own audio)
    if (entry.audioId) {
        html += '&nbsp;<button class="taigi-audio-btn" data-audio-id="' + entry.audioId +
            '" title="Play Taigi audio" aria-label="Play Taigi audio">&#9654;</button>';
    }

    // Definitions
    let defClass = 'w-def';
    if (config.fontSize === 'small') {
        defClass += '-small';
    }

    for (const def of entry.definitions) {
        let defHtml = '';
        if (def.type) {
            defHtml += '<b>【' + def.type + '】</b>';
        }
        defHtml += def.def;
        html += '<br><span class="' + defClass + '">' + defHtml + '</span>';

        // Examples
        if (def.examples) {
            for (const ex of def.examples) {
                html += '<br><span class="' + defClass + '" style="margin-left:1em;font-size:0.9em;">';
                html += ex.text;
                if (ex.reading) {
                    html += ' <i>' + ex.reading + '</i>';
                }
                if (ex.translation) {
                    html += ' <span style="color:gray;">' + ex.translation + '</span>';
                }
                html += '</span>';
            }
        }
    }

    html += '<br>';

    // Store for clipboard: [simplified, traditional, reading, definition, raw_reading]
    const translation = entry.definitions.map(d => (d.type ? '【' + d.type + '】' : '') + d.def).join('; ');
    texts[index] = [entry.headword, entry.headword, entry.reading, translation, entry.reading];

    return html;
}

export const chineseModule: LanguageModule = {
    id: 'chinese',

    dictionaries: {
        catalog: [
            { id: CEDICT_ID, label: CEDICT_NAME },
            { id: TAIGI_ID, label: TAIGI_NAME },
        ],
        loaders: {
            cedict: new CedictLoader(),
            taigi: new TaigiLoader(),
        },
        getStatus: getDictStatus,
    },

    renderEntry(entry: DictionaryResult, ctx: RenderContext): string {
        if (entry.source === 'cedict') {
            return makeCedictHtml(entry, ctx);
        } else if (entry.source === 'taigi') {
            return makeTaigiHtml(entry, ctx);
        }
        return '';
    },

    renderFooter(source: string): string {
        if (source === 'taigi') {
            return '<br><span class="moe">Press "o" to look up in MoE dictionary</span><br>';
        }
        return '';
    },

    postProcessSearch(result: MultiDictSearchResult, dicts: DictionaryLookup): void {
        // Check for grammar/vocab keywords in CEDICT entries
        const cedict = dicts.getDictionary('cedict') as CedictDictionary | undefined;
        if (!cedict) return;

        for (let i = 0; i < result.results.length; i++) {
            const entry = result.results[i];
            if (entry.source === 'cedict') {
                const word = entry.headword;
                if (cedict.hasGrammarKeyword(word) && result.matchLen === word.length) {
                    // the final index should be the last one with the maximum length
                    result.grammar = { keyword: word, index: i };
                }
                if (cedict.hasVocabKeyword(word) && result.matchLen === word.length) {
                    // the final index should be the last one with the maximum length
                    result.vocab = { keyword: word, index: i };
                }
            }
        }
    },
};
