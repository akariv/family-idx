import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Data, Datum, Slide, Value } from '../datatypes';

@Component({
  selector: 'app-weights',
  templateUrl: './weights.component.html',
  styleUrls: ['./weights.component.less']
})
export class WeightsComponent implements OnInit {
  @Input() slide: Slide;

  @Output() highlightIndicator = new EventEmitter<string[]>();
  @Output() updated = new EventEmitter<Data>();

  currentData: Data;
  dimensions: string[];
  dimensionIndicators: {[key: string]: string[]} = {};
  indicatorWeights: any = {};
  hiddenIndicators: any = {};

  ngOnInit() {
    this.currentData = this.slide.data;
    this.currentData.countries.forEach((country: Datum) => {
      country.values.forEach((value: Value) => {
        value.origValue = value.value;
      });
    });
    this.dimensions = [];
    for (const indicator of this.slide.data.indicators) {
      const dimension = this.slide.data.indicator_info[indicator].dimension;
      if (!this.dimensions.includes(dimension)) {
        this.dimensions.push(dimension);
        this.dimensionIndicators[dimension] = [];
      }
      this.dimensionIndicators[dimension].push(indicator);
      this.indicatorWeights[indicator] = 1;
    }
  }

  updateIndicatorWeight(indicators: string[], weight: number, resort: boolean = true) {
    indicators.forEach((indicator: string) => {
      this.indicatorWeights[indicator] = weight;
    });
    const newData = {
      ...this.currentData,
      countries: this.currentData.countries.map((country: Datum) => {
        const ret: Datum = {
          ...country,
          values: country.values.map((value: Value, idx: number) => {
            return {
              ...value,
              value: (value.origValue || 0) * this.indicatorWeights[this.currentData.indicators[idx]]
            }
          })
        };
        ret.sum = ret.values.reduce((acc: number, value: Value) => acc + value.value, 0);
        return ret;
      })
    };
    if (resort) {
      newData.countries.sort((a: Datum, b: Datum) => b.sum - a.sum);
    }
    this.currentData = newData;
    this.updated.emit(newData);
  }
}
