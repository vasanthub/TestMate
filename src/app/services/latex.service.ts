import { Injectable } from '@angular/core';
import katex from 'katex';

@Injectable({
  providedIn: 'root'
})
export class LatexService {
  
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
