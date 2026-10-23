const MAGIC_STAR = /^\*\s*/;
const SLASH_PATTERN = /\s*(\/|\\)\s*/g;
const ILLEGAL_CHARS = /[\\:"*?%<>|]/g;
const COPY_SUFFIX = /\s+copy(\s+\d+)?$/i;
const MULTI_SPACE = /\s{2,}/g;
const TRIM_SPACE = /^\s+|\s+$/g;
// line/paragraph separators end the string literal in the ExtendScript call
const LINE_SEPARATORS = /[\u2028\u2029]/g;

export function sanitizeLayerName(name: string): string {
    if (!name) return 'Layer';
    return (
        name
            .replace(LINE_SEPARATORS, ' ')
            .replace(MAGIC_STAR, '')
            .replace(COPY_SUFFIX, '')
            .replace(SLASH_PATTERN, '-')
            .replace(ILLEGAL_CHARS, '-')
            .replace(MULTI_SPACE, ' ')
            .replace(TRIM_SPACE, '')
    ) || 'Layer';
}
