import { Component, Input } from '@angular/core';
import { MarkdownService } from '../markdown.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.less']
})
export class FooterComponent {
  @Input() footer: SafeHtml;

  constructor() { }
}
