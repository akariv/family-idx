import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Datum, Slide } from '../datatypes';

import { Series, stack } from 'd3-shape';
import { scaleLinear, scaleBand, ScaleLinear, ScaleBand } from 'd3-scale';
import { selectAll, select } from 'd3-selection';
import { transition } from 'd3-transition';
import { easeLinear } from 'd3-ease';
import { timer } from 'rxjs';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.less']
})
export class ChartComponent implements OnChanges, AfterViewInit {
  @Input() slide: Slide;

  ready = false;
  width = 0;
  height = 0;
  padding = 32;
  leftPadding = 120;
  i=0;
  
  constructor(private el: ElementRef) {}
  
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
          return d.values[idx].value;
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
      this.updateBars(layout, x, y);
    }
  }

  ngAfterViewInit(): void {
    this.updateDimensions();
    this.ready = true;
    this.ngOnChanges();
  }

  updateDimensions(): void {
    const el = this.el.nativeElement;
    this.width = el.offsetWidth;
    this.height = el.offsetHeight;
  }

  updateBars(layout: Series<Datum, string>[], x: ScaleLinear<number, number, number>, y: ScaleBand<string>) {
    const canvas = select(this.el.nativeElement);
    const t = transition()
      .duration(1000)
      .ease(easeLinear);

    canvas.selectAll('.series')
      .data(layout, (d, i, nodes) => (d ? (d as any).key : (nodes && nodes[i] as HTMLElement).id || ''))
      .join(
        (enter) => enter.append('div')
          .attr('class', 'series')
          .attr('data-series', (d: any) => d.key)
        ,
        // (exit) => exit.remove()
      )
      .selectAll('.bar')
      .data((d) => d, (d: any, i, nodes) => d ? d.data.country_name + '-' + d.key : (nodes[i] as HTMLElement).id || i)
      .join(
        (enter) => enter.append('div').attr('class', 'bar').attr('data-country', (d) => d.data.country_name + '-' + (d as any).key)
          .style('top', (d) => y(d.data.country_name) + 'px')
          .style('height', y.bandwidth() + 'px')
          .style('left', 0)
          .style('width', 0)
          .call((enter) => enter
            .transition(t)
            .style('left', (d) => x(d[0]) + 'px')
            .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
          )
        ,
        (update) => update
          .transition(t)
          .style('top', (d) => y(d.data.country_name) + 'px')
          .style('left', (d) => x(d[0]) + 'px')
          .style('height', y.bandwidth() + 'px')
          .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
        ,
        (exit) => exit
          .transition(t)
          .style('left', '0px')
          .style('width', '0px')
          .remove()
      )
    ;
  }
}
