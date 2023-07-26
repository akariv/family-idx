import { AfterViewInit, Component, ElementRef, Input, OnChanges, SecurityContext, SimpleChanges, ViewChild } from '@angular/core';
import { Data, Datum, Indicators, Slide } from '../datatypes';

import { Series, SeriesPoint, stack } from 'd3-shape';
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
  avgPos = 0;
  avgVisible = false;

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
      const x = scaleLinear().domain([0, maxX+0.0001]).range([this.leftPadding, this.width]);
      console.log('X', maxX, this.width, x(maxX), x(0));
      let expandWidth = 0;
      if (this.slide.expand_country !== null) {
        expandWidth = x(countries[this.slide.expand_country].sum) - this.leftPadding;
      }
      const maxHeight = countries.length * 40;
      const paddingOuter = maxHeight > this.height ? 0 : (this.height - maxHeight) / 80;
      const y = scaleBand()
        .domain(countries.map((d) => d.country_name))
        .range([this.padding, this.height - this.padding])
        .paddingOuter(paddingOuter)
        .paddingInner(0.2);
      let expandedY = (d: string) => y(d);
      let barHeight = y.bandwidth();
      let expandPhoto: string | null = null;
      if (this.slide.expand_country !== null) {
        const country = countries[this.slide.expand_country].country_name;
        const countryNext = countries[this.slide.expand_country + 1]?.country_name;
        const expandedYPre = scaleBand()
          .domain(countries.map((d) => d.country_name))
          .range([this.padding, this.height - this.padding - expandWidth])
          .paddingOuter(paddingOuter)
          .paddingInner(0.2);
        const expandedYPost = scaleBand()
          .domain(countries.map((d) => d.country_name))
          .range([this.padding + expandWidth, this.height - this.padding])
          .paddingOuter(paddingOuter)
          .paddingInner(0.2);
        expandedY = this.expandIfNeeded(
          countries, this.slide.expand_country, y, expandedYPre, expandedYPost
        );
        barHeight = expandedYPre.bandwidth();
        console.log(expandedYPost(countryNext), this.padding + expandWidth);
        expandWidth = ((expandedYPost(countryNext) || 0) - (expandedYPre(country) || 0)) || expandWidth;
        expandWidth -= barHeight*0.2;
        if (this.slide.expand_country_photo) {
          expandPhoto = `url(${this.slide.expand_country_photo})`;
        }
      }
      const t = transition()
        .duration(1000)
        .ease(easeLinear);
      this.updateBars(layout, x, t, expandedY, expandWidth + 'px', barHeight + 'px', expandPhoto);
      this.updateLabels(data.countries, t, this.countriesVisible(), expandedY, barHeight + 'px');

      // A single path on the right border of the image
      const gridColor = this.slide.section.role === 'intro' ? '#243856' : '#fff';
      const gridOpacity = this.slide.section.role === 'intro' ? 0.25 : 0.1;
      const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200">
        <path d="M0,0 L0,200" stroke="${gridColor}" stroke-width="1" stroke-opacity="${gridOpacity}" />
      </svg>`;
      timer(0).subscribe(() => {
        this.gridImage = this.sanitizer.bypassSecurityTrustResourceUrl('url(data:image/svg+xml;base64,' + btoa(gridSvg)+')');
      });
      // this.avgVisible = false;
      this.avgPos = x(data.average) || this.avgPos;
      if (!this.avgVisible && this.slide.show_average) {
        timer(1000).subscribe(() => {
          this.avgVisible = this.slide.show_average;
        });
      } else {
        this.avgVisible = this.slide.show_average;
      }
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

  backgroundImage(d: SeriesPoint<Datum>, i: number, expandPhoto: string | null) {
    if (i === this.slide.expand_country && expandPhoto && d[0] !== d[1]) {
      console.log('expandPhoto', expandPhoto);
      return this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, this.sanitizer.bypassSecurityTrustResourceUrl(expandPhoto));
    } else {
      return null;
    }
  }

  barPositionX(x: ScaleLinear<number, number, number>, d: any) {
    // console.log('DDDD2', d, this.slide.data.indicator_info);
    const skip = this.slide.data.indicator_info[d.key]?.skip || 0;
    return (x(d[0]) + skip) + 'px';
  }
 
  updateBars(layout: Series<Datum, string>[], x: ScaleLinear<number, number, number>, t: Transition<BaseType, any, any, any>, 
             expandedY: (d: string) => number | undefined, expandWidth: string, barHeight: string, expandPhoto: string | null) {
    const canvas = select(this.chart.nativeElement);
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
          .style('top', (d) => expandedY(d.data.country_name) + 'px')
          .style('height', (d, i) => i === this.slide.expand_country ? expandWidth : barHeight)
          .style('left', '0px')
          .style('width', '0px')
          .style('background-color', (d) => this.barColor(d))
          .style('background-image', (d, i) => this.backgroundImage(d, i, expandPhoto))
          // .style('background-image', (d, i) => i === this.slide.expand_country ? expandPhoto : null)
          .call((enter) => enter
            .transition(t)
            .style('left', (d: any) => this.barPositionX(x, d))
            .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
          )
        ,
        (update) => update
          .call((update) => {
            if (!this.slide.start_from_zero) {
              return update.transition(t)
                .style('top', (d) => expandedY(d.data.country_name) + 'px')
                .style('left', (d: any) => this.barPositionX(x, d))
                .style('height', (d, i) => i === this.slide.expand_country ? expandWidth : barHeight)
                .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
                .style('background-color', (d) => this.barColor(d))
                .style('background-image', (d, i) => this.backgroundImage(d, i, expandPhoto))
                // .style('background-image', (d, i) => i === this.slide.expand_country ? expandPhoto : null)
              }
            return update
              .transition(t)
                .style('height', (d, i) => i === this.slide.expand_country ? expandWidth : barHeight)
                .style('left', '0px')
                .style('width', '0px')
                .style('background-color', (d) => this.barColor(d))
                .style('background-image', (d, i) => this.backgroundImage(d, i, expandPhoto))
                // i === this.slide.expand_country ? expandPhoto : null)
                .call((update) => update
                .transition()
                  .duration(1)
                  .style('top', (d) => expandedY(d.data.country_name) + 'px'))
              .call((update) => update
                .transition()
                  .delay(500)
                  .duration(1000)
                  .ease(easeLinear)
                  .style('left', (d: any) => this.barPositionX(x, d))
                  .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
              );
          })
        ,
        (exit) => exit
          .transition(t)
            .style('left', '0px')
            .style('width', '0px')
            .remove()
      )
    ;
  }

  updateLabels(data: Datum[], t: Transition<BaseType, any, any, any>, visible: boolean, expandedY: (d: string) => number | undefined,
               barHeight: string) {
    const countries = select(this.countries.nativeElement);

    // Labels
    countries.selectAll('.label')
      .data(data || [], (d: any) => (d as Datum).country_name)
      .join(
        (enter) => enter.append('div').attr('class', 'label')
          .html((d: any) => `<span class='flag'>${d.flag}</span>&nbsp;${d.country_name}`)
          .style('top', (d) => expandedY(d.country_name) + 'px')
          .style('height', barHeight)
          .style('opacity', 0)
          .call((enter) => enter
            .transition(t)
            .style('opacity', visible ? 1 : 0)
          )
        ,
        (update) => {
          if (this.slide.start_from_zero) {
            return update
              .transition(t)
                .style('opacity', 0)
                .style('height', barHeight)
              .call((update) => update
                .transition()
                  .duration(1)
                  .style('top', (d) => expandedY(d.country_name) + 'px')
              )
              .call((update) => update
                .transition()
                  .delay(500)
                  .duration(1000)
                  .style('opacity', visible ? 1 : 0)
              );
          } else {
            return update
              .transition(t)
                .style('top', (d) => expandedY(d.country_name) + 'px')
                .style('opacity', visible ? 1 : 0)
                .style('height', barHeight);
          }
        },
        (exit) => exit
          .transition(t)
          .style('opacity', 0)
          .remove()
      );
  }

  countriesVisible() {
    return this.slide.show_countries;
  }

  avgTextShadow() {
    const color = this.slide.section.color;
    return `
      0 2px 0px ${color},
      0 -2px 0px ${color},
      2px 0 0px ${color},
      -2px 0 0px ${color}
    `;
  }

  expandIfNeeded(data: Datum[], expand: number | null, 
      scale: ScaleBand<string>, 
      expandedPre: ScaleBand<string>, 
      expandedPost: ScaleBand<string>) {
    const names = data.map((d) => d.country_name);
    return (d: string) => {
      if (expand === null) {
        return scale(d);
      }  else {
        const idx = names.indexOf(d);
        if (idx <= expand) {
          return expandedPre(d);
        } else {
          return expandedPost(d);
        }
      }
    }
  }
}
