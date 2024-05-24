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
  dimensionColors: {[key: string]: string} = {};
  states: {[key: string]: string} = {};
  indicatorWeights: any = {};
  hiddenIndicators: any = {};
  spotlightIndicators: string[] = [];
  indicators: string[];
  non_indicators: string[];
  openDimension = '';

  ngOnInit() {
    this.currentData = this.slide.data;
    this.indicators = this.slide.data.indicators;
    this.non_indicators = this.slide.data.non_indicators;
    this.currentData.countries.forEach((country: Datum) => {
      country.values.forEach((value: Value) => {
        value.origValue = value.value;
      });
      country.origValues = [...country.values];
    });
    this.dimensions = [];
    for (const indicator of this.indicators) {
      const dimension = this.slide.data.indicator_info[indicator].dimension;
      const color = this.slide.data.indicator_info[indicator].color;
      if (!this.dimensions.includes(dimension)) {
        this.dimensions.push(dimension);
        this.dimensionIndicators[dimension] = [];
        this.dimensionColors[dimension] = color;
      }
      this.dimensionIndicators[dimension].push(indicator);
      this.indicatorWeights[indicator] = 1;
      this.states[indicator] = 'show';
    }
  }

  updateIndicatorWeight(indicators: string[], weight: number, resort: boolean = true) {
    if (indicators.length > 0) {
      this.spotlightIndicators = [];
    }
    indicators.forEach((indicator: string) => {
      this.indicatorWeights[indicator] = weight;
      this.hiddenIndicators[indicator] = weight === 0;
    });
    const weights: any = {};
    this.states = {};
    for (const indicator of this.indicators) {
      if (this.spotlightIndicators.length > 0) {
        if (this.spotlightIndicators.includes(indicator)) {
          weights[indicator] = weight;
          this.states[indicator] = 'spotlight';
        } else {
          weights[indicator] = 0;
          this.states[indicator] = 'hide';
        }
      } else if (!this.hiddenIndicators[indicator]) {
        weights[indicator] = this.indicatorWeights[indicator];
        this.states[indicator] = 'show';
      } else {
        weights[indicator] = 0;
        this.states[indicator] = 'hide';
      }
    }
    const newData: Data = {
      ...this.currentData,
      indicators: this.indicators.filter((indicator: string) => weights[indicator] > 0),
      non_indicators: [
        ...this.non_indicators,
        ...this.indicators.filter((indicator: string) => weights[indicator] === 0)
      ],
      countries: this.currentData.countries.map((country: Datum) => {
        const ret: Datum = {
          ...country,
          values: country.origValues.map((value: Value, idx: number) => {
            return {
              ...value,
              value: (value.origValue || 0) * weights[this.indicators[idx]]
            }
          }).filter((value: Value, idx: number) => weights[this.indicators[idx]] > 0)
        };
        ret.sum = ret.values.reduce((acc: number, value: Value) => acc + value.value, 0);
        return ret;
      })
    };
    newData.average = newData.countries.reduce((acc: number, country: Datum) => acc + country.sum, 0) / newData.countries.length;
    newData.max = newData.countries.reduce((acc: number, country: Datum) => Math.max(acc, country.sum), 0);
    if (resort) {
      newData.countries.sort((a: Datum, b: Datum) => b.sum - a.sum);
    }
    this.currentData = newData;
    this.updated.emit(newData);
  }

  show(indicators: string[]) {
    indicators.forEach((indicator: string) => {
      this.hiddenIndicators[indicator] = false;
      if (this.indicatorWeights[indicator] === 0) {
        this.indicatorWeights[indicator] = 1;
      }
    });
    this.spotlightIndicators = [];
    this.updateIndicatorWeight([], 1);
  }

  hide(indicators: string[]) {
    indicators.forEach((indicator: string) => {
      this.hiddenIndicators[indicator] = true;
    });
    this.spotlightIndicators = [];
    this.updateIndicatorWeight([], 1);
  }

  spotlight(indicators: string[]) {
    this.spotlightIndicators = indicators;
    this.updateIndicatorWeight([], 1);
  }
}
