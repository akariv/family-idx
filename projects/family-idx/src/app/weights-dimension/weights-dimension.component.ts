import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-weights-dimension',
  templateUrl: './weights-dimension.component.html',
  styleUrls: ['./weights-dimension.component.less']
})
export class WeightsDimensionComponent {
  @Input() dimension: string;
  @Input() indicators: string[];
  @Input() indicatorWeights: {[key: string]: number};

  @Output() weight = new EventEmitter<{indicators: string[], weight: number, sort: boolean}>();
  @Output() highlight = new EventEmitter<string[]>();

  updateWeight(indicators: string[], weight: number, sort: boolean = true) {
    this.weight.emit({indicators, weight, sort});
  }

  updateHighlight(indicators: string[]) {
    this.highlight.emit(indicators);
  }
}
