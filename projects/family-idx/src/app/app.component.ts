import { Component } from '@angular/core';

import { marked } from 'marked';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {

  constructor() {
    // Marked.js options
    const renderer = new marked.Renderer();
    const linkRenderer = renderer.link;
    renderer.link = (href: string, title: string, text: string) => {
      const localLink = (href || '').startsWith(`${location.protocol}//${location.hostname}`);
      const html = linkRenderer.call(renderer, href, title, text);
      let ret = localLink ? html : html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `);
      if (text.endsWith('←')) {
        ret = `<div class="arrow">${ret}</div>`;
      }
      return ret;
    };
    // renderer.codespan = (code: string) => {
    //   const splitPoint = code.indexOf(' ');
    //   return `<span class="step-number">${code.slice(0, splitPoint)}</span><span class="step-title">${code.slice(splitPoint + 1)}</span>`;
    // };
    marked.use({renderer});    
  }
}
