import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Data, Datum, Indicators, Slide } from '../datatypes';

import { Series, stack } from 'd3-shape';
import { scaleLinear, scaleBand, ScaleLinear, ScaleBand } from 'd3-scale';
import { selectAll, select, BaseType } from 'd3-selection';
import { Transition, transition } from 'd3-transition';
import { easeLinear } from 'd3-ease';
import { fromEvent, timer } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.less']
})
export class ChartComponent implements OnChanges, AfterViewInit {
  @Input() slide: Slide;
  @Input() indicators: Indicators;

  @ViewChild('chart') chart: ElementRef;
  @ViewChild('countries') countries: ElementRef;
  @ViewChild('average') average: ElementRef;

  ready = false;
  width = 0;
  height = 0;
  padding = 32;
  leftPadding = 0;
  i=0;
  gridImage: SafeResourceUrl;
  
  constructor(private sanitizer: DomSanitizer) {}
  
  ngOnChanges(): void {
    if (this.ready) {
      console.log('CURRENT SLIDE DATA', this.slide.data);
      const data = this.slide.data || {};
      const indicators = data?.indicators || [];
      const non_indicators = data?.non_indicators || [];
      const countries = data?.countries || [];
      const layout = stack<any, Datum, string>()
        .keys([...non_indicators, ...indicators])
        .value((d, key) => {
          const idx = indicators.indexOf(key);
          if (idx === -1) {
            return 0;
          }
          return d.values[idx].value + data.average / 50;
        })(countries);
      console.log('CURRENT SLIDE LAYOUT', layout);
      layout.forEach((ind) => {
        ind.forEach((d: any) => {
          d.key = ind.key;
        });
      });
      
      const maxX = Math.max(...countries.map(x => x.sum));
      const x = scaleLinear().domain([0, maxX]).range([this.leftPadding, this.width]);
      console.log('X', maxX, this.width, x(maxX), x(0));
      const maxHeight = countries.length * 40;
      const paddingOuter = maxHeight > this.height ? 0 : (this.height - maxHeight) / 80;
      const y = scaleBand()
        .domain(countries.map((d) => d.country_name))
        .range([this.padding, this.height - this.padding])
        .paddingOuter(paddingOuter)
        .paddingInner(0.2)
      ;
      const t = transition()
        .duration(1000)
        .ease(easeLinear);
      this.updateBars(layout, x, y, t);
      this.updateLabels(data.countries, y, t, this.countriesVisible());

      // A single path on the right border of the image
      const gridColor = this.slide.section.role === 'intro' ? '#243856' : '#fff';
      const gridOpacity = this.slide.section.role === 'intro' ? 0.25 : 0.1;
      const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200">
        <path d="M0,0 L0,200" stroke="${gridColor}" stroke-width="1" stroke-opacity="${gridOpacity}" />
      </svg>`;
      this.gridImage = this.sanitizer.bypassSecurityTrustResourceUrl('url(data:image/svg+xml;base64,' + btoa(gridSvg)+')');
    }
  }

  ngAfterViewInit(): void {
    this.updateDimensions();
    this.ready = true;
    this.ngOnChanges();
    fromEvent(window, 'resize').subscribe(() => {
      this.updateDimensions();
      this.ngOnChanges();
    });
  }

  updateDimensions(): void {
    const el = this.chart.nativeElement;
    this.width = el.offsetWidth;
    if (this.width > 720) {
      this.width = 720;
    }
    this.height = el.offsetHeight;
  }

  barColor(d: any) {
    let ret = 'rgba(255, 255, 255, 0.1)';
    if (this.slide.section.role === 'intro') {
      ret = '#d7d6cc';
    }
    if ((this.slide.highlight_countries || []).map(x => x.name).indexOf(d.data.country_name) >= 0) {
      if (this.slide.section.role === 'intro') {
        ret = '#243856'
        if (this.slide.data.indicator_info[d.key]) {
          ret = this.slide.data.indicator_info[d.key].color;
        }
      } else {
        ret = 'rgba(255, 255, 255, 0.3)';
      }
    } else {

    } if (this.slide.section.role === 'footer') {
      ret = 'rgba(255, 255, 255, 0.05)';
    }
    return ret;
  }

  barPositionX(x: ScaleLinear<number, number, number>, d: any) {
    // console.log('DDDD2', d, this.slide.data.indicator_info);
    const skip = this.slide.data.indicator_info[d.key]?.skip || 0;
    return (x(d[0]) + skip) + 'px';
  }
 
  updateBars(layout: Series<Datum, string>[], x: ScaleLinear<number, number, number>, y: ScaleBand<string>, t: Transition<BaseType, any, any, any>) {
    const canvas = select(this.chart.nativeElement);
    const barHeight = y.bandwidth() + 'px';
    // Bars
    canvas.selectAll('.series')
      .data(layout || [], (d, i, nodes) => (d ? (d as any).key : (nodes && nodes[i] as HTMLElement).id || ''))
      .join(
        (enter) => enter.append('div')
          .attr('class', 'series')
          .attr('data-series', (d: any) => d.key)
          .style('opacity', 1)
        ,
        (update) => update,
        (exit) => exit
          .transition(t)
          .style('opacity', 0)
          .remove()
      )
      .selectAll('.bar')
      .data((d) => d || [], (d: any, i, nodes) => d ? d.data.country_name + '-' + d.key : (nodes[i] as HTMLElement).id || i)
      .join(
        (enter) => enter.append('div').attr('class', 'bar').attr('data-country', (d) => d.data.country_name + '-' + (d as any).key)
          .style('top', (d) => y(d.data.country_name) + 'px')
          .style('height', barHeight)
          .style('left', 0)
          .style('width', 0)
          .style('background-color', (d) => this.barColor(d))
          .call((enter) => enter
            .transition(t)
            .style('left', (d: any) => this.barPositionX(x, d))
            .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
          )
        ,
        (update) => update
          .transition(t)
            .style('top', (d) => y(d.data.country_name) + 'px')
            .style('left', (d: any) => this.barPositionX(x, d))
            .style('height', barHeight)
            .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
            .style('background-color', (d) => this.barColor(d))
        ,
        (exit) => exit
          .transition(t)
            .style('left', '0px')
            .style('width', '0px')
            .remove()
      )
    ;
  }

  updateLabels(data: Datum[], y: ScaleBand<string>, t: Transition<BaseType, any, any, any>, visible: boolean) {
    const countries = select(this.countries.nativeElement);

    // Labels
    countries.selectAll('.label')
      .data(data || [], (d: any) => (d as Datum).country_name)
      .join(
        (enter) => enter.append('div').attr('class', 'label')
          .html((d: any) => `<span class='flag'>${d.flag}</span>&nbsp;${d.country_name}`)
          .style('top', (d) => y(d.country_name) + 'px')
          .style('height', y.bandwidth() + 'px')
          .style('opacity', 0)
          .call((enter) => enter
            .transition(t)
            .style('opacity', visible ? 1 : 0)
          )
        ,
        (update) => update
          .transition(t)
            .style('top', (d) => y(d.country_name) + 'px')
            .style('opacity', visible ? 1 : 0)
            .style('height', y.bandwidth() + 'px')
          ,
        (exit) => exit
          .transition(t)
          .style('opacity', 0)
          .remove()
      );
  }

  countriesVisible() {
    return this.slide.show_countries;
  }
}
