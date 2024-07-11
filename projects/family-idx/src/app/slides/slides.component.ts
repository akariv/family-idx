import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Data, DataType, Indicators, Section, Slide } from '../datatypes';
import { Subscription, delay, filter, first, fromEvent, interval, tap, timer } from 'rxjs';
import { MarkdownService } from '../markdown.service';
import { ChartComponent } from '../chart/chart.component';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.less'],
})
export class SlidesComponent implements AfterViewInit, OnInit {
  @Input() slides: Slide[] = [];
  @ViewChild('chart') chart: ChartComponent;
  @ViewChild('scrolled') scrolled: ElementRef;
  @ViewChild('animationMask') animationMask: ElementRef;
  
  observer: IntersectionObserver;
  currentSlide: Slide;
  highlightedIndicator: string | null = null;
  highlightedIndicators: string[] | null = null;
  sliderResult: {[key: string]: number} = {};

  bgColor: string = 'rgb(232, 234, 230)';

  sections: Section[] = [];
  height: any = 100;
  textShadow: SafeStyle | null = null;
  gridImage: SafeResourceUrl;

  hover: any = {};

  animationMaskUrl: SafeResourceUrl | null = null; 
  animationMaskUrl_ = '';

  spreadOut = true;
  spreadOutOffsetH1 = 0;
  spreadOutOffsetText = 0;

  constructor(private el: ElementRef, public md: MarkdownService, private route: ActivatedRoute, private sanitizer: DomSanitizer, private router: Router) {
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
    this.setGridImage(this.currentSlide);
    this.setTextShadow(this.currentSlide);
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
    timer(0).subscribe(() => {
      const svg = this.animationMask.nativeElement.outerHTML;
      this.animationMaskUrl = this.sanitizer.bypassSecurityTrustResourceUrl('url(data:image/svg+xml;base64,' + btoa(svg) + ')');
      this.spreadOut = window.innerWidth <= 768;
    });
    timer(100).subscribe(() => {
      const h1 = this.el.nativeElement.querySelector('h1') as HTMLElement;
      const h1Bounds = h1.getBoundingClientRect();
      const text = h1.parentElement as HTMLElement;
      const textBounds = text.getBoundingClientRect()
      const h1SlideBounds = (text.parentElement as HTMLElement).getBoundingClientRect();
      this.spreadOutOffsetH1 = window.innerHeight - (h1Bounds.bottom - h1SlideBounds.top + 40 - this.spreadOutOffsetH1);
      this.spreadOutOffsetText = -(window.innerHeight - (textBounds.bottom - h1SlideBounds.top)) + 20;
    });
    this.route.fragment.pipe(
      filter(fragment => !!fragment),
      filter(fragment => fragment !== this.currentSlide.section.slug),
      delay(100),
    ).subscribe((fragment) => {
      const target = this.el.nativeElement.querySelector('[data-slug=' + fragment + ']') as HTMLElement;
      target.scrollIntoView();
    });
  }

  updateDimensions() {
    this.height = window.innerHeight;
  }

  handleSlide(slide: Slide) {
    if (this.currentSlide === slide) {
      return;
    }
    this.bgColor = slide.section.color;
    this.highlightedIndicator = null;
    this.setTextShadow(slide); 
    this.setGridImage(slide);
    this.currentSlide = slide;
    this.router.navigate([], {fragment: slide.section.slug, replaceUrl: true});
  }

  updateData(slide: Slide, update: {data: Data, title: string, data_type: DataType}) {
    slide.data = update.data;
    slide.data_type = update.data_type;
    slide.chart_title = update.title;
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
    if (slide.slider !== null) {
      this.sliderResult[slide.slider] = result;
    }
  }

  setTextShadow(slide: Slide) {
    const color = slide.section.color;
    this.textShadow = this.sanitizer.bypassSecurityTrustStyle(`
      0 1px ${color},
      0 -1px ${color},
      1px 0 ${color},
      -1px 0 ${color},
      0 0 3px ${color},
      0 0 3px ${color},
      0 0 3px ${color},
      0 0 3px ${color}
  `);
  }

  setGridImage(slide: Slide) {
    // A single path on the right border of the image
    const gridColor = slide.section.role === 'intro' ? '#243856' : '#fff';
    const gridOpacity = slide.section.role === 'intro' ? 0.25 : 0.1;
    const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200">
      <path d="M0,0 L0,200" stroke="${gridColor}" stroke-width="1" stroke-opacity="${gridOpacity}" />
    </svg>`;
    timer(0).subscribe(() => {
      this.gridImage = this.sanitizer.bypassSecurityTrustResourceUrl('url(data:image/svg+xml;base64,' + btoa(gridSvg)+')');
    });
  }

  gestureStart(event: TouchEvent) {
    if (this.spreadOut) {
      this.spreadOut = false;
      return;
    }
    if (this.scrolled.nativeElement.scrollTop > 0) {
      return;
    }
    const startY = event.touches[0].clientY;
    fromEvent<TouchEvent>(window, 'touchend').pipe(
      first(),
    ).subscribe((event2: TouchEvent) => {
      const endY = event2.changedTouches[0].clientY;
      if (endY - startY > 100) {
        this.spreadOut = true;
      }
    });
  }
  // checkOverscroll(event: TouchEvent) {
  //   console.log('OVERSCROLL', this.scrolled.nativeElement.scrollTop);
  //   if (this.scrolled.nativeElement.scrollTop < 0) {
  //       this.spreadOut = true;
  //   }
  //   return true;
  // }

}
