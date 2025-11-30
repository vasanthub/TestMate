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
}
