import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Data, Indicators, Section, Slide } from '../datatypes';
import { timer } from 'rxjs';
import { MarkdownService } from '../markdown.service';
import { ChartComponent } from '../chart/chart.component';

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.less'],
})
export class SlidesComponent implements AfterViewInit, OnInit {
  @Input() slides: Slide[] = [];
  @ViewChild('chart') chart: ChartComponent;
  
  observer: IntersectionObserver;
  currentSlide: Slide;
  highlightedIndicator: string | null = null;
  highlightedIndicators: string[] | null = null;
  sliderResult: {[key: string]: number} = {};

  bgColor: string = 'white';
  snapping: boolean = true;

  sections: Section[] = [];

  constructor(private el: ElementRef, public md: MarkdownService) { }

  ngOnInit() {
    console.log('SLIDES', this.slides);
    const sectionNames: string[] = [];
    this.slides.forEach((slide) => {
      if (sectionNames.indexOf(slide.section.name) === -1) {
        sectionNames.push(slide.section.name);
        this.sections.push(slide.section);
      }
    });
    console.log('SECTIONS', this.sections);
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      let handled = false;
      entries.forEach((entry) => {
        if (entry.isIntersecting && !handled) {
          const el = entry.target as HTMLElement;
          const slideNum = el.getAttribute('data-slide'); 
          if (slideNum !== null) {
            console.log('SLIDE NUM', slideNum);
            const slide = this.slides[parseInt(slideNum)];
            this.handleSlide(slide);
            handled = true;
          }
        }
      });
    }, {threshold: 0.25});
    for (const el of this.el.nativeElement.querySelectorAll('.slide, app-footer')) {
      this.observer.observe(el);
    }
  }

  handleSlide(slide: Slide) {
    this.currentSlide = slide;
    this.bgColor = slide.section.color;
    this.highlightedIndicator = null;
    this.snapping = slide.section.role !== 'footer' && slide.section.role !== 'exploration';
  }

  updateData(slide: Slide, data: Data) {
    slide.data = data;
    if (this.currentSlide === slide) {
      this.chart.ngOnChanges();
    }
  }

  highlightIndicators(indicators: string[]) {
    if (indicators.length === 0) {
      this.highlightedIndicators = null;
      this.highlightedIndicator = null;
    } else {
      this.highlightedIndicators = indicators;//.slice();
      this.highlightedIndicator = indicators[0];
    }
  }

  slideContent(i: number) {
    return this.md._("(" + i + ") " + this.slides[i].content[0])
  }

  updateSliderResult(slide: Slide, result: number) {
    if (slide.slider !== null) {
      this.sliderResult[slide.slider] = result;
    }
  }
}
