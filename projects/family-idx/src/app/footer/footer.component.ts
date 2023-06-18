import { Component, Input } from '@angular/core';
import { MarkdownService } from '../markdown.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.less']
})
export class FooterComponent {
  @Input() footer = '';

  constructor(public md: MarkdownService) { }
}
