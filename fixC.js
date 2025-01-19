const REGEX_CURLY_BRACE_SAME_LINE = /\)\s*\{/gm;
const REGEX_ELSE_SAME_LINE = /\}\s*else\s*\{/gm;
const REGEX_EMPTY_SAME_LINE = /\{\s*\}/gm;
const REGEX_FIND_SWITCH_BLOCKS = /(?:(?:case)|(?:default)).*\n(?: *)((?:.*\n)*?\s*(?:(?=(?:case))|(?:break;)))/g;
const REGEX_GET_LEFT_POINTERS = /([a-zA-Z_][a-zA-Z0-9_]*)([*]+)[ ]+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
const REGEX_ELSE_IF = /\}\s*else\s*if\s*([(][^)]*[)])\s*\{/gm;

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
            //console.log(`Found match, group ${groupIndex}: ${match}`);
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

function _get_line_no_comment(line) {
    return line.replace(/(?:\/\/.*)|(?:\/[*].*[*]\/)/, "");
}

function _add_indents(input, indentSize = 4) {
    let indent = 0;
    return input.split('\n').map(line => {
        const trimmedLine = line.trim();
        const trimmedLineNoComment = _get_line_no_comment(trimmedLine).trim();
        if (trimmedLine.startsWith('}')) {
            indent -= indentSize;
            if(indent < 0) {
                indent = 0;
            }
        }
        const result = ' '.repeat(indent) + trimmedLine;
        if (trimmedLineNoComment.endsWith('{')) {
            indent += indentSize;
        }
        return result;
    }).join('\n');
}

// Adds indents to switch statements specifically.
function _add_switch_indents(input, indentSize = 4) {
    let indent = 0;
    let nextIndent = 0;
    return input.split('\n').map(line => {
        if(nextIndent != 0) {
            indent += nextIndent;
            nextIndent = 0;
        }
        const lineNoComment = _get_line_no_comment(line);
        const lineNoCommentTrimmed = lineNoComment.trim();
        if((lineNoCommentTrimmed.startsWith("case") || lineNoCommentTrimmed.startsWith("default")) && lineNoCommentTrimmed.endsWith(':')) {
            nextIndent += indentSize;
        }
        if(lineNoCommentTrimmed.endsWith('break;')) {
            nextIndent -= indentSize;
        }
        let result = ' '.repeat(indent) + line;
        
        return result;
    }).join('\n');
}

function _fix_pointer_alignment(input) {
    let matches = _get_detailed_matches(input, REGEX_GET_LEFT_POINTERS);
    for (let match of matches) {
        let newPattern = match[1] + ' ' + match[2] + match[3];
        input = input.replace(match[0], newPattern);
    }
    return input;
}

function _fix_if_else(input) {
    let matches = _get_detailed_matches(input, REGEX_ELSE_IF);
    for (let match of matches) {
        let newPattern = '} else if(' + match[1] + ') {';
        input = input.replace(match[0], newPattern);
    }
    return input;
}

function _trim_all_lines(input) {
    var lines = input.split('\n');

    for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].trim();
    }

    return lines.join('\n');
}

function fix_code_formatting(input) {
    out = input;
    out = _replace_matches(out, _get_whole_matches(out, REGEX_CURLY_BRACE_SAME_LINE), ") {");
    out = _replace_matches(out, _get_whole_matches(out, REGEX_ELSE_SAME_LINE), "} else {");
    out = _replace_matches(out, _get_whole_matches(out, REGEX_EMPTY_SAME_LINE), "{}");
    out = _trim_all_lines(out);
    out = _fix_pointer_alignment(out);
    out = _fix_if_else(out);
    out = _add_indents(out);
    out = _add_switch_indents(out);
    return out;
}
