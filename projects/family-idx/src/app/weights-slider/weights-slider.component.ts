import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { timer } from 'rxjs';

@Component({
  selector: 'app-weights-slider',
  templateUrl: './weights-slider.component.html',
  styleUrls: ['./weights-slider.component.less']
})
export class WeightsSliderComponent implements OnChanges {

  @Input() state = 'show';
  @Input() title: string;
  @Input() bold: boolean;
  @Input() weight: number;
  @Input() cancel = false;
  @Input() color = '#fff';
  @Input() open = false;

  @Output() updating = new EventEmitter<number>();
  @Output() updated = new EventEmitter<number>();
  @Output() show = new EventEmitter<void>();
  @Output() hide = new EventEmitter<void>();
  @Output() spotlight = new EventEmitter<void>();
  @Output() openToggle = new EventEmitter<boolean>();

  weight_: number = 1; 
  gradient: SafeStyle;
  
  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    this.weight_ = this.state !== 'hide' ? this.weight : 0;
    const pct = this.weight_ * 20;
    this.gradient = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(270deg, ${this.color} 0%, ${this.color} ${pct}%, rgba(0,0,0,0) ${pct}%, rgba(0,0,0,0) 100%)`);
  }

  set value(value: number) {
    this.weight_ = value;
    this.updating.emit(value);
  }

  get value(): number {
    return this.weight_;
  }

  setMoving(value: boolean) {
    if (value) {
      this.updating.emit(this.weight_);
    } else {
      timer(100).subscribe(() => {
        this.updated.emit(this.weight_);
      });
    }
    return true;
  }

  toggle() {
    if (this.state === 'show') {
      this.spotlight.next();
    } else if (this.state === 'hide') {
      this.show.next();
    } else if (this.state === 'spotlight') {
      this.show.next();
    }
  }
}
