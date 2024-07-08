import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {

  marked = marked;

  constructor(private sanitizer: DomSanitizer) { }

  replaceBolds(md: string) {
    const parts = md.split('**');
    const ret = parts.map((part, i) => i % 2 === 0 ? ` ${part} ` : part.trim()).join('**');
    return ret;
  }

  _(markdown: string) {
    markdown = this.replaceBolds(markdown);
    const html = this.marked(markdown);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
