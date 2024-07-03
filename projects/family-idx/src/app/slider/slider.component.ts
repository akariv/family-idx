import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Slide } from '../datatypes';
import { SafeStyle, DomSanitizer } from '@angular/platform-browser';
import { ScaleLinear, scaleLinear } from 'd3-scale';

@Component({
  selector: 'app-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.less']
})
export class SliderComponent implements OnInit, AfterViewInit {

  @Input() slide: Slide;
  @Output() updated = new EventEmitter<number>();
  @ViewChild('slider') slider: ElementRef;

  min = 0;
  max = 0;
  guess_: number;
  guessed = false;
  gradient: SafeStyle;
  x: ScaleLinear<number, number>;
  guessPosition = 0;
  step = 0.1;
  
  constructor(private sanitizer: DomSanitizer, private el: ElementRef) {
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 11px, #fff 12px, #fff 25%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 100%)`
    );
  }

  ngOnInit() {
    this.max = this.slide.slider_max || 0;
    this.guess_ = this.slide.data.average || Math.floor(this.max / 4);    
  }

  ngAfterViewInit(): void {
    const slider = this.slider.nativeElement as HTMLInputElement;
    let width = slider.offsetWidth;
    const HANDLE_WIDTH = 24;
    const RANGE_BUFFER = (HANDLE_WIDTH / 2 * 100) / width;
    this.x = scaleLinear().domain([0, this.max]).range([RANGE_BUFFER, 100 - RANGE_BUFFER]).clamp(false);
    this.updateGradient(this.x(this.guess_));
  }

  updateGradient(pct: number) {
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 11px, #fff 12px, #fff ${pct}%, rgba(0,0,0,0) ${pct}%, rgba(0,0,0,0) 100%)`
    );
  }

  set guess(value: number) {
    this.guess_ = value;
    this.guessed = true;
    const pct = this.x(value);
    this.updateGradient(pct);
    this.updated.emit(value);
    this.guessPosition = this.slider.nativeElement.offsetWidth * pct / 100;
    this.step = 1;
  }

  get guess() {
    return this.guess_;
  }

  scrollAway() {
    const el = this.el.nativeElement as HTMLElement;
    const parent = el.parentElement;
    parent?.parentElement?.scrollBy({top: parent?.offsetHeight || 400, behavior: 'smooth'});
  }    
}
