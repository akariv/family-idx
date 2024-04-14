import { Component, Input, OnChanges } from '@angular/core';
import { MarkdownService } from '../markdown.service';
import { SafeHtml } from '@angular/platform-browser';
import { Slide } from '../datatypes';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.less']
})
export class FooterComponent implements OnChanges {
  @Input() slide: Slide;

  constructor(private md: MarkdownService) { }

  ngOnChanges() {
    if (this.slide) {
      this.slide.html[0] = this.md._(this.slide.content[0]);
    }
  }
}
