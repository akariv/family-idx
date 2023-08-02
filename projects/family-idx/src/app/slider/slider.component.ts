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
  
  constructor(private sanitizer: DomSanitizer) {
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(90deg, #fff 0%, #fff 25%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 100%)`);
  }

  ngOnInit() {
    this.max = this.slide.slider_max || 0;
    this.guess_ = Math.floor(this.max / 4);    
  }

  ngAfterViewInit(): void {
    const slider = this.slider.nativeElement as HTMLInputElement;
    const width = slider.offsetWidth;
    this.x = scaleLinear().domain([0, this.max]).range([2000 / width, 100 - 2000/width]);
  }

  set guess(value: number) {
    this.guess_ = value;
    this.guessed = true;
    const pct = this.x(value);
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(90deg, #fff 0%, #fff ${pct}%, rgba(0,0,0,0) ${pct}%, rgba(0,0,0,0) 100%)`);
    this.updated.emit(value);
  }

  get guess() {
    return this.guess_;
  }
}
