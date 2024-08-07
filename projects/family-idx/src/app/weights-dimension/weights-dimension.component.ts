import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

@Component({
  selector: 'app-weights-dimension',
  templateUrl: './weights-dimension.component.html',
  styleUrls: ['./weights-dimension.component.less']
})
export class WeightsDimensionComponent implements OnChanges {
  @Input() dimension: string;
  @Input() indicators: string[];
  @Input() indicatorWeights: {[key: string]: number};
  @Input() indicatorLinks: {[key: string]: string};
  @Input() states: {[key: string]: string};
  @Input() color: string;
  @Input() open = false;

  @Output() weight = new EventEmitter<{indicators: string[], weight: number}>();
  @Output() highlight = new EventEmitter<string[]>();
  @Output() show = new EventEmitter<string[]>();
  @Output() hide = new EventEmitter<string[]>();
  @Output() spotlight = new EventEmitter<string[]>();
  @Output() openToggle = new EventEmitter<boolean>();

  state = 'show';
  ownWeight = 1;
  cancel = false;
  
  ngOnChanges() {
    // console.log('DIMENSION CHANGES', this.dimension);
    if (this.indicators.every((indicator: string) => this.states[indicator] === 'spotlight')) {
      this.state = 'spotlight';
    } else if (this.indicators.some((indicator: string) => this.states[indicator] === 'spotlight')) {
      this.state = 'hide';
    } else if (this.indicators.some((indicator: string) => this.states[indicator] === 'show')) {
      this.state = 'show';
    } else {
      this.state = 'hide';
    }
    this.cancel = !this.indicators.every((indicator: string) => this.indicatorWeights[indicator] === this.ownWeight);
  }

  updateWeight(indicators_: string[], weight: number) {
    const indicators = [...indicators_];
    this.weight.emit({indicators, weight});
  }

  updateHighlight(indicators: string[]) {
    this.highlight.emit(indicators);
  }
}
