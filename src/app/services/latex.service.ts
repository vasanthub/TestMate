import { Injectable } from '@angular/core';
import katex from 'katex';

@Injectable({
  providedIn: 'root'
})
export class LatexService {
  
  renderLatex3(text: string): string {
  if (!text) return '';

  // Convert literal "\n" from JSON into real newlines
  text = text.replace(/\\n/g, "\n");

  // 1) Display LaTeX $$...$$ (allow newlines)
  let rendered = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true
      });
    } catch (e) {
      return match;
    }
  });

  // 2) Inline LaTeX
  rendered = rendered.replace(/\$([^\$]+?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false
      });
    } catch (e) {
      return match;
    }
  });

  return rendered;
}


  renderLatex(text: string): string {
    if (!text) return '';
    
    // Replace inline LaTeX $...$ with rendered HTML
    let rendered = text.replace(/\$([^\$]+)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false
        });
      } catch (e) {
        return match;
      }
    });
    
    // Replace display LaTeX $$...$$ with rendered HTML
    rendered = rendered.replace(/\$\$([^\$]+)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true
        });
      } catch (e) {
        return match;
      }
    });

    return rendered;
  }

  // Lowercased words that end in "." mid-sentence, so a following capitalised word
  // is NOT a new sentence. Kept deliberately small - only cases that actually occur
  // in this content followed by a capital/'$' (e.g. "conc. HCl", "X vs. Y").
  private readonly nonBreakingAbbreviations = new Set([
    'conc', 'vs', 'viz', 'cf'
  ]);

  /**
   * Splits display text (question / answer / explanation) into the lines it should
   * render as. In order:
   *
   *   1. Line breaks stored as the literal two characters "\" + "n" (instead of a
   *      real newline) are converted - some hand-authored and AI-generated entries
   *      do this. Skipped inside $...$ / $$...$$ where a backslash-n is a LaTeX
   *      command (\nu, \neq, \nabla, \ni...).
   *   2. The text is split on real newlines.
   *   3. If that yields a single line AND the author put no breaks of their own,
   *      the paragraph is broken at sentence boundaries so multi-step worked
   *      solutions ("Concept: ... Substituting: ... Arithmetic: ... So ...") read
   *      one step per line instead of as one run-on block. Sentence detection
   *      ignores decimals and periods inside math.
   */
  splitIntoLines(text: string | null | undefined): string[] {
    if (!text) return [];

    const normalised = this.convertLiteralNewlines(text);
    let lines = normalised.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) {
      lines = this.splitSentences(normalised).map(l => l.trim()).filter(l => l.length > 0);
    }

    return lines;
  }

  // Turns a literal "\n" into a real newline, but never inside $...$ / $$...$$.
  private convertLiteralNewlines(text: string): string {
    let out = '';
    let inMath = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (ch === '$') {
        if (text[i + 1] === '$') { out += '$$'; i++; }
        else { out += ch; }
        inMath = !inMath;
        continue;
      }

      if (!inMath && ch === '\\' && text[i + 1] === 'n') {
        out += '\n';
        i++;
        continue;
      }

      out += ch;
    }
    return out;
  }

  // Breaks a single paragraph after '.', '?' or '!' when it is followed by
  // whitespace and a capital letter or '$'. Periods inside $...$, decimal points
  // and a few known abbreviations do not count.
  private splitSentences(text: string): string[] {
    const result: string[] = [];
    let start = 0;
    let inMath = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (ch === '$') {
        if (text[i + 1] === '$') i++;
        inMath = !inMath;
        continue;
      }
      if (inMath) continue;

      if (ch !== '.' && ch !== '?' && ch !== '!') continue;

      // Need whitespace then an uppercase letter or '$' to call it a boundary.
      let j = i + 1;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
      if (j === i + 1) continue;
      if (!/[A-Z$]/.test(text[j] ?? '')) continue;

      // "3.14" - decimal point, not a full stop.
      if (ch === '.' && /[0-9]/.test(text[i - 1] ?? '')) continue;

      // "e.g. Foo" / "i.e. Foo" / "conc. HCl" / "X vs. Y".
      const tail = text.slice(Math.max(0, i - 8), i + 1).toLowerCase();
      if (/(^|[^a-z])(e\.g|i\.e)\.$/.test(tail)) continue;
      const word = /([a-z]+)\.$/.exec(tail);
      if (word && this.nonBreakingAbbreviations.has(word[1])) continue;

      result.push(text.slice(start, i + 1));
      start = j;
      i = j - 1;
    }

    if (start < text.length) result.push(text.slice(start));
    return result;
  }
}
