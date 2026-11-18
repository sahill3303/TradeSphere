/**
 * Diff Helper for Notes Revision History
 * Computes line-by-line and token diffs between old and new text.
 */

export function computeLineDiff(oldText = '', newText = '') {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    const n = oldLines.length;
    const m = newLines.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (oldLines[i] === newLines[j]) {
                dp[i + 1][j + 1] = dp[i][j] + 1;
            } else {
                dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const diff = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            diff.unshift({ type: 'unchanged', text: oldLines[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'added', text: newLines[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            diff.unshift({ type: 'removed', text: oldLines[i - 1] });
            i--;
        }
    }

    return diff;
}

export function computeWordDiff(oldText = '', newText = '') {
    const oldTokens = oldText ? oldText.split(/(\s+)/) : [];
    const newTokens = newText ? newText.split(/(\s+)/) : [];

    const n = oldTokens.length;
    const m = newTokens.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (oldTokens[i] === newTokens[j]) {
                dp[i + 1][j + 1] = dp[i][j] + 1;
            } else {
                dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const rawDiff = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
            rawDiff.unshift({ type: 'unchanged', text: oldTokens[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            rawDiff.unshift({ type: 'added', text: newTokens[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            rawDiff.unshift({ type: 'removed', text: oldTokens[i - 1] });
            i--;
        }
    }

    // Coalesce adjacent tokens with the same type
    const coalesced = [];
    for (const item of rawDiff) {
        if (!item.text) continue;
        const last = coalesced[coalesced.length - 1];
        if (last && last.type === item.type) {
            last.text += item.text;
        } else {
            coalesced.push({ ...item });
        }
    }

    return coalesced;
}

export function generateNoteDiff({ oldTitle = '', newTitle = '', oldContent = '', newContent = '' }) {
    const titleChanged = oldTitle !== newTitle;
    const contentChanged = oldContent !== newContent;

    const lineDiff = computeLineDiff(oldContent, newContent);
    const wordDiff = computeWordDiff(oldContent, newContent);

    let addedLines = 0;
    let removedLines = 0;
    lineDiff.forEach(l => {
        if (l.type === 'added') addedLines++;
        if (l.type === 'removed') removedLines++;
    });

    let addedWords = 0;
    let removedWords = 0;
    wordDiff.forEach(w => {
        const count = w.text.trim().split(/\s+/).filter(Boolean).length;
        if (w.type === 'added') addedWords += count;
        if (w.type === 'removed') removedWords += count;
    });

    return {
        titleChanged,
        contentChanged,
        stats: {
            addedLines,
            removedLines,
            addedWords,
            removedWords,
            charDiff: (newContent || '').length - (oldContent || '').length
        },
        lineDiff,
        wordDiff
    };
}

