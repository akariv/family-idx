import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Data, Indicators, Section, Slide } from '../datatypes';
import { Subscription, delay, filter, fromEvent, tap, timer } from 'rxjs';
import { MarkdownService } from '../markdown.service';
import { ChartComponent } from '../chart/chart.component';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.less'],
})
export class SlidesComponent implements AfterViewInit, OnInit {
  @Input() slides: Slide[] = [];
  @ViewChild('chart') chart: ChartComponent;
  @ViewChild('scrolled') scrolled: ElementRef;
  
  observer: IntersectionObserver;
  currentSlide: Slide;
  highlightedIndicator: string | null = null;
  highlightedIndicators: string[] | null = null;
  sliderResult: {[key: string]: number} = {};

  bgColor: string = 'rgb(232, 234, 230)';

  sections: Section[] = [];
  height: any = 100;
  textShadow: SafeStyle | null = null;

  constructor(private el: ElementRef, public md: MarkdownService, private route: ActivatedRoute, private sanitizer: DomSanitizer) {
  }

  ngOnInit() {
    console.log('SLIDES', this.slides);
    const sectionNames: string[] = [];
    this.sections = [];
    this.slides.forEach((slide, index) => {
      if (sectionNames.indexOf(slide.section.name) === -1) {
        sectionNames.push(slide.section.name);
        this.sections.push(slide.section);
        slide.id = slide.section.slug;
      }
    });
    this.currentSlide = this.slides[0];
    this.setTextShadow(this.currentSlide);
    this.route.fragment.pipe(
      filter(fragment => !!fragment),
      delay(100),
    ).subscribe((fragment) => {
      const target = this.el.nativeElement.querySelector('[data-slug=' + fragment + ']') as HTMLElement;
      target.scrollIntoView();
    });
  }

  ngAfterViewInit(): void {
    timer(100).subscribe(() => {
      this.updateDimensions();
      this.observer = new IntersectionObserver((entries) => {
        let handled = false;
        let slideNum : number | null = null;
        console.log('ENTRIES', entries);
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const slideNumS = el.getAttribute('data-slide'); 
            slideNum = parseInt(slideNumS || '');
            if (slideNumS !== null) {
              console.log('SLIDE NUM', slideNumS);
              handled = true;
            }
          }
        });
        if (handled && slideNum !== null) {
          const slide = this.slides[slideNum];
          console.log('HHHH', slideNum);
          this.handleSlide(slide);
        }
      }, {threshold: 0.25});
      for (const el of this.el.nativeElement.querySelectorAll('.slide')) {
        this.observer.observe(el);
      }
    });
    fromEvent(window, 'resize').subscribe(() => {
      this.updateDimensions();
    });
  }

  updateDimensions() {
    this.height = window.innerHeight;
  }

  handleSlide(slide: Slide) {
    if (this.currentSlide === slide) {
      return;
    }
    this.currentSlide = slide;
    this.bgColor = slide.section.color;
    this.highlightedIndicator = null;
    this.setTextShadow(slide); 
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

  slideContent(slide: Slide, part: number = 0) {
    if (!slide.html[part]) {
      slide.html[part] = this.md._(slide.content[part]);
    }
    return slide.html[part];
  }

  updateSliderResult(slide: Slide, result: number) {
    // console.log('SLIDER RESULT', slide.slider, result);
    if (slide.slider !== null) {
      this.sliderResult[slide.slider] = result;
    }
  }

  setTextShadow(slide: Slide) {
    const color = slide.section.color;
    this.textShadow = this.sanitizer.bypassSecurityTrustStyle(`
      0 2px 2px ${color},
      0 -2px 2px ${color},
      2px 0 2px ${color},
      -2px 0 2px ${color},
      0 4px 6px ${color},
      0 -4px 6px ${color},
      4px 0 6px ${color},
      -4px 0 6px ${color}
  `);
  }
}
