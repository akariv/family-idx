import { AfterViewInit, Component, ElementRef, Input, OnInit } from '@angular/core';
import { Indicators, Slide } from '../datatypes';
import { timer } from 'rxjs';
import { MarkdownService } from '../markdown.service';

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.less']
})
export class SlidesComponent implements AfterViewInit, OnInit {
  @Input() slides: Slide[] = [];
  
  observer: IntersectionObserver;
  currentSlide: Slide;

  bgColor: string = 'white';

  constructor(private el: ElementRef, public md: MarkdownService) { }

  ngOnInit() {
    console.log('SLIDES', this.slides);
    // this.handleSlide(this.slides[0]);
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
  }

}
