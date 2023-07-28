import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { timer } from 'rxjs';

@Component({
  selector: 'app-weights-slider',
  templateUrl: './weights-slider.component.html',
  styleUrls: ['./weights-slider.component.less']
})
export class WeightsSliderComponent implements OnChanges {
  @Input() title: string;
  @Input() bold: boolean;
  @Input() weight: number;

  @Output() updating = new EventEmitter<number>();
  @Output() updated = new EventEmitter<number>();

  weight_: number = 1; 

  ngOnChanges(): void {
    this.weight_ = this.weight;
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
}
