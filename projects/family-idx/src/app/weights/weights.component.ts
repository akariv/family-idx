import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Data, DataType, Datum, Slide, Value } from '../datatypes';

@Component({
  selector: 'app-weights',
  templateUrl: './weights.component.html',
  styleUrls: ['./weights.component.less']
})
export class WeightsComponent implements OnInit {
  @Input() slide: Slide;

  @Output() highlightIndicator = new EventEmitter<string[]>();
  @Output() updated = new EventEmitter<{data: Data, title: string, data_type: DataType}>();

  currentData: Data;
  dimensions: string[];
  dimensionIndicators: {[key: string]: string[]} = {};
  dimensionColors: {[key: string]: string} = {};
  indicatorLinks: {[key: string]: string} = {};
  chartTitles: {[key: string]: string} = {};
  states: {[key: string]: string} = {};
  indicatorWeights: any = {};
  hiddenIndicators: any = {};
  spotlightIndicators: string[] = [];
  indicators: string[];
  non_indicators: string[];
  openDimension = '';
  countries: Datum[];
  rawDataMode = false;

  ngOnInit() {
    this.currentData = this.slide.data;
    this.indicators = this.currentData.indicators;
    this.non_indicators = this.currentData.non_indicators;
    this.countries = this.currentData.countries.slice();
    this.countries.forEach((country: Datum) => {
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
      this.indicatorLinks[indicator] = this.slide.data.indicator_info[indicator].link_to_doc;
      this.states[indicator] = 'show';
      this.chartTitles[indicator] = this.slide.data.indicator_info[indicator].chart_title;
      this.chartTitles[dimension] = this.slide.data.indicator_info[indicator].dimension_chart_title;
    }
    this.updateIndicatorWeight([], 1);
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
    this.rawDataMode = this.indicators.filter((indicator: string) => weights[indicator] > 0).length === 1;
    const newData: Data = {
      ...this.currentData,
      indicators: this.indicators.filter((indicator: string) => weights[indicator] > 0),
      non_indicators: [
        ...this.non_indicators,
        ...this.indicators.filter((indicator: string) => weights[indicator] === 0)
      ],
      countries: this.countries.map((country: Datum) => {
        const ret: Datum = {
          ...country,
          values: country.origValues.map((value: Value, idx: number) => {
            return {
              ...value,
              value: this.rawDataMode ? value.raw : (value.origValue || 0) * weights[this.indicators[idx]]
            }
          }).filter((value: Value, idx: number) => weights[this.indicators[idx]] > 0)
        };
        ret.sum = ret.values.reduce((acc: number, value: Value) => acc + value.value, 0);
        return ret;
      }).filter((country: Datum) => this.rawDataMode ? !country.values[0].estimated : true)
    };
    newData.average = newData.countries.reduce((acc: number, country: Datum) => acc + country.sum, 0) / newData.countries.length;
    if (!this.rawDataMode) {
      newData.average = 0;
    }
    newData.max = newData.countries.reduce((acc: number, country: Datum) => Math.max(acc, country.sum), 0);
    newData.max = newData.max / 0.75;
    if (resort) {
      newData.countries.sort((a: Datum, b: Datum) => b.sum - a.sum);
    }
    this.currentData = newData;
    let newTitle = 'מדד מותאם אישית';
    if (this.indicators.every((indicator: string) => weights[indicator] > 0)) {
      newTitle = 'מדד מדיניות המשפחה';
    }
    for (let dimension of this.dimensions) {
      const onlyDimension = this.indicators.map((indicator: string) => 
        newData.indicators.includes(indicator) === this.dimensionIndicators[dimension].includes(indicator)
      ).every((val: boolean) => val);
      console.log('DDDD', dimension, onlyDimension, newData.indicators, this.dimensionIndicators[dimension]);
      if (onlyDimension) {
        newTitle = this.chartTitles[dimension];
      }
    }
    if (this.rawDataMode) {
      newTitle = this.chartTitles[newData.indicators[0]];
    }
    this.updated.emit({data: newData, title: newTitle, data_type: {name: this.rawDataMode ? 'גולמי' : 'מדד'}});
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
