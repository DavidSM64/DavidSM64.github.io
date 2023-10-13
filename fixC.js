const REGEX_CURLY_BRACE_SAME_LINE = /\)\s*\{/gm;
const REGEX_ELSE_SAME_LINE = /\}\s*else\s*\{/gm;
const REGEX_EMPTY_SAME_LINE = /\{\s*\}/gm;
const REGEX_REMOVE_LEADING_SPACES_LINE = /^ +/gm;
const REGEX_FIND_SWITCH_BLOCKS = /(?:(?:case)|(?:default)).*\n(?: *)((?:.*\n)*?\s*(?:(?=(?:case))|(?:break;)))/g;

function _get_detailed_matches(inputText, regex) {
    let results = [];
    let m;
    while ((m = regex.exec(inputText)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        let matchedStuff = {};
        
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(`Found match, group ${groupIndex}: ${match}`);
            matchedStuff[groupIndex] = match;
        });
        
        results.push(matchedStuff);
    }
    return results;
}

function _get_whole_matches(inputText, regex) {
    return inputText.match(regex);
}

function _replace_matches(inputText, matches, replacement) {
    if (matches == null) return inputText;
    let result = inputText;
    for (let i = 0; i < matches.length; i++) {
        // Escape special characters in the match
        let escapedMatch = matches[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let regex = new RegExp(escapedMatch, 'g');
        result = result.replace(regex, replacement);
    }
    return result;
}

function _add_indents(input, indentSize = 4) {
    let indent = 0;
    return input.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('}')) {
            indent -= indentSize;
        }
        const result = ' '.repeat(indent) + trimmedLine;
        if (trimmedLine.endsWith('{')) {
            indent += indentSize;
        }
        return result;
    }).join('\n');
}

function fix_code_formatting(input) {
    out = input;
    out = _replace_matches(out, _get_whole_matches(out, REGEX_CURLY_BRACE_SAME_LINE), ") {");
    out = _replace_matches(out, _get_whole_matches(out, REGEX_ELSE_SAME_LINE), "} else {");
    out = _replace_matches(out, _get_whole_matches(out, REGEX_EMPTY_SAME_LINE), "{}");
    out = _replace_matches(out, _get_whole_matches(out, REGEX_REMOVE_LEADING_SPACES_LINE), "");
    out = _add_indents(out);
    return out;
}