import { numericPinyin2Zhuyin } from './zhuyin';

/** Tone diacritics as HTML entities (combining marks), indexed by tone number. */
const tones: Record<number, string> = {
    1: '&#772;',
    2: '&#769;',
    3: '&#780;',
    4: '&#768;',
    5: ''
};

/** Tone diacritics as Unicode combining marks, indexed by tone number. */
const utones: Record<number, string> = {
    1: '\u0304',
    2: '\u0301',
    3: '\u030C',
    4: '\u0300',
    5: ''
};

export function parse(s: string): RegExpMatchArray | null {
    return s.match(/([^AEIOU:aeiou]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
}

/**
 * Place the tone mark on the correct vowel of a syllable.
 * Returns [html, text] where html uses HTML entities and text uses Unicode.
 */
export function tonify(vowels: string, tone: number): [string, string] {
    let html = '';
    let text = '';

    if (vowels === 'ou') {
        html = 'o' + tones[tone] + 'u';
        text = 'o' + utones[tone] + 'u';
    } else {
        let tonified: boolean = false;
        for (let i = 0; i < vowels.length; i++) {
            let c: string = vowels.charAt(i);
            html += c;
            text += c;
            if (c === 'a' || c === 'e') {
                html += tones[tone];
                text += utones[tone];
                tonified = true;
            } else if (i === vowels.length - 1 && !tonified) {
                html += tones[tone];
                text += utones[tone];
                tonified = true;
            }
        }
        html = html.replace(/u:/, '&uuml;');
        text = text.replace(/u:/, '\u00FC');
    }

    return [html, text];
}

export function pinyinAndZhuyin(
    syllables: string,
    showToneColors: boolean,
    pinyin: boolean,
    zhuyin: boolean,
    fontSize: string
): [string, string] {
    let text = '';
    let html = '';
    let a: string[] = syllables.split(/[\s·]+/);
    for (let i = 0; i < a.length; i++) {
        let syllable: string = a[i];
        let m: RegExpMatchArray | null = parse(syllable);

        let pinyinClass = 'w-pinyin';
        if (fontSize === 'small') {
            pinyinClass += '-small';
        }

        // ',' in pinyin
        if (syllable === ',') {
            html += ' ,';
            text += ' ,';
            continue;
        }
        if (i > 0) {
            html += '&nbsp;';
            text += ' ';
        }

        if (pinyin) {
            if (syllable === 'r5') {
                if (showToneColors) {
                    html += '<span class="' + pinyinClass + ' tone5">r</span>';
                } else {
                    html += '<span class="' + pinyinClass + '">r</span>';
                }
                text += 'r';
                continue;
            }
            if (syllable === 'xx5') {
                if (showToneColors) {
                    html += '<span class="' + pinyinClass + ' tone5">??</span>';
                } else {
                    html += '<span class="' + pinyinClass + '">??</span>';
                }
                text += '??';
                continue;
            }
            if (showToneColors) {
                html += '<span class="' + pinyinClass + ' tone' + m![4] + '">';
            } else {
                html += '<span class="' + pinyinClass + '">';
            }
            let t: [string, string] = tonify(m![2], parseInt(m![4], 10));
            html += m![1] + t[0] + m![3];
            html += '</span>';
        }

        // Zhuyin
        if (pinyin && zhuyin) {
            html += '<br>' + p[2];
        }

        if (zhuyin) {
            let zhuyinClass = 'w-zhuyin';
            if (fontSize === 'small') {
                zhuyinClass += '-small';
            }

            html += '<span class="tone' + m![4] + ' ' + zhuyinClass + '">'
                + numericPinyin2Zhuyin(syllable) + '</span>';
        }
    }
    return [html, text];
}
