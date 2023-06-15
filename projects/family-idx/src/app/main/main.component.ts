import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Slide } from '../datatypes';
import { MarkdownService } from '../markdown.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.less']
})
export class MainComponent {
  slides: Slide[] = [];
  indicators: string[] = [];
  footer = '';
  
  constructor(private http: HttpClient, public md: MarkdownService) {
    this.http.get('assets/slides.json').subscribe((data: any) => {
      this.slides = data.slides;
      this.indicators = data.indicators;
      this.footer = data.footer;
    });
  }
}
