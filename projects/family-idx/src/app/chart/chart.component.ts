import { AfterViewInit, Component, ElementRef, Input, OnChanges, SecurityContext, SimpleChanges, ViewChild } from '@angular/core';
import { Country, Data, Datum, Indicators, Slide } from '../datatypes';

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
  styleUrls: ['./chart.component.less'],
})
export class ChartComponent implements OnChanges, AfterViewInit {
  @Input() slide: Slide;
  @Input() indicators: Indicators;
  @Input() highlightIndicator: string | null = null;
  @Input() highlightIndicators: string[] | null = null;
  @Input() sliderResult: number | null = null;

  @ViewChild('chart') chart: ElementRef;
  @ViewChild('countries') countries: ElementRef;
  @ViewChild('average') average: ElementRef;
  @ViewChild('result') result: ElementRef;

  DURATION = 500;

  ready = false;
  width = 0;
  height = 0;
  padding = 32;
  leftPadding = 0;
  hPadding = 0;
  i=0;
  gridImage: SafeResourceUrl;
  avgPos = 0;
  avgVisible = false;
  resultPos = 0;
  resultVisible = false;
  startFromZero = false;
  moving = false;

  constructor(private sanitizer: DomSanitizer) {}
  
  ngOnChanges(changes?: SimpleChanges): void {
    if (this.ready) {
      console.log('CURRENT SLIDE DATA', this.slide.data);
      const data = this.slide.data || {};
      const indicators = data?.indicators || [];
      const non_indicators = data?.non_indicators || [];
      const countries = data?.countries || [];
      this.startFromZero = this.slide.start_from_zero && !!changes && !!changes['slide'] && changes['slide'].currentValue !== changes['slide'].previousValue;

      const estimated: any = {};
      const layout = stack<any, Datum, string>()
        .keys([...non_indicators, ...indicators])
        .value((d, key) => {
          const idx = indicators.indexOf(key);
          if (idx === -1) {
            return 0;
          }
          if (d.values[idx].estimated) {
            estimated[`${key}-${d.country_name}`] = true;
          }
          return d.values[idx].value + data.average / 50;
        })(countries);
      console.log('CURRENT SLIDE LAYOUT', layout);
      
      layout.forEach((ind) => {
        ind.forEach((d: any) => {
          d.key = ind.key;
        });
      });
      let maxSlide = -1;
      const highlightSlide: {[key: string]: number} = {};
      if (this.highlightIndicator !== null) {
        layout.filter((ind) => ind.key === this.highlightIndicator)[0].forEach((d) => {
          if (maxSlide === -1) {
            maxSlide = d[0];
          } else {
            maxSlide = Math.max(maxSlide, d[0]);
          }
        });
        if (maxSlide > 0) {
          layout.filter((ind) => ind.key === this.highlightIndicator)[0].forEach((d) => {
            highlightSlide[d.data.country_name] = maxSlide - d[0];
          });  
        }
      }

      const maxX = Math.max(...countries.map(x => x.sum)) + data.average / 50 * indicators.length;
      const x = scaleLinear().domain([0, maxX+0.0001]).range([this.leftPadding, this.width - 16]);

      let expandWidth = 0;
      if (this.slide.expand_country !== null) {
        expandWidth = x(countries[this.slide.expand_country].sum) - this.leftPadding;
      }
      const maxHeight = countries.length * 40;
      const paddingOuter = maxHeight > this.height ? 0 : (this.height - maxHeight) / 80;
      const y = scaleBand()
        .domain(countries.map((d) => d.country_name))
        .range([this.hPadding, this.height - this.hPadding])
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
        expandWidth = ((expandedYPost(countryNext) || 0) - (expandedYPre(country) || 0)) || expandWidth;
        expandWidth -= barHeight*0.2;
        if (this.slide.expand_country_photo) {
          expandPhoto = `url(${this.slide.expand_country_photo})`;
        }
      }
      const t = transition()
        .duration(this.DURATION)
        .ease(easeLinear)
        .on('end', () => {
          this.moving = false;
        });
      this.moving = true;
      this.updateBars(layout, x, t, expandedY, expandWidth + 'px', barHeight + 'px', expandPhoto, estimated, highlightSlide);
      this.updateLabels(data.countries, t, this.countriesVisible(), expandedY, barHeight + 'px', (expandWidth - barHeight) / 2);
      this.updateHighlightLabels(layout, 
        this.slide.hide_country_labels ? [] : this.slide.highlight_countries,
        x, expandedY, barHeight, t, highlightSlide, expandWidth/2);

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
          this.avgVisible = this.slide.show_average && !this.highlightIndicator;
        });
      } else {
        this.avgVisible = this.slide.show_average && !this.highlightIndicator;
      }

      this.resultPos = x(this.sliderResult || 0) || this.resultPos;
      if (!this.resultVisible && !!this.slide.slider_result) {
        timer(1000).subscribe(() => {
          this.resultVisible = !!this.slide.slider_result;
        });
      } else {
        this.resultVisible = !!this.slide.slider_result;
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
    if (this.width < 760) {
      this.hPadding = 24;
    } else {
      this.hPadding = 32;
    }
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
        if (d.key === this.highlightIndicator || (this.highlightIndicators || []).indexOf(d.key) >= 0) {
          ret = 'rgba(255, 255, 255, 0.6)';
        } else {
          ret = 'rgba(255, 255, 255, 0.3)';
        }
      }
    } else {
      if (d.key === this.highlightIndicator || (this.highlightIndicators || []).indexOf(d.key) >= 0) {
        ret = 'rgba(255, 255, 255, 0.2)';
      }
    } if (this.slide.section.role === 'footer') {
      ret = 'rgba(255, 255, 255, 0.05)';
    }
    return ret;
  }

  labelBgColor() {
    if (this.slide.section.role === 'intro') {      
      return '#243856';
    } else {
      return '#fff';
    }
  }

  labelFgColor() {
    if (this.slide.section.role === 'intro') {      
      return '#fff';
    } else {
      return this.slide.section.color;
    }
  }
    

  labelClasses(d: any) {
    let ret = 'label';
    if ((this.slide.highlight_countries || []).map(x => x.name).indexOf(d.country_name) >= 0) {
      ret += ' highlight';
    }
    return ret;
  }
  
  labelContent(d: any, rawVal: string) {
    if (this.slide.data_type.name.indexOf('גולמי') == 0) {
      return rawVal;
    } else {
      return d.name;
    }
  }

  backgroundImage(d: SeriesPoint<Datum>, i: number, expandPhoto: string | null) {
    if (i === this.slide.expand_country && expandPhoto && d[0] !== d[1]) {
      return expandPhoto;
    } else {
      return null;
    }
  }

  barPositionX(x: ScaleLinear<number, number, number>, d: any, highlightSlide: {[key: string]: number}) {
    const slide = highlightSlide[d.data.country_name] || 0;
    const skip = this.slide.data.indicator_info[d.key]?.skip || 0;
    const barPos = x(d[0] + slide) + skip;
    return barPos + 'px';
  }
 
  updateBars(layout: Series<Datum, string>[], x: ScaleLinear<number, number, number>, t: Transition<BaseType, any, any, any>, 
             expandedY: (d: string) => number | undefined, expandWidth: string, barHeight: string, expandPhoto: string | null,
             estimated: {[key: string]: boolean}, highlightSlide: {[key: string]: number}) {
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
          .attr('class', (d: any) => estimated[`${d.key}-${d.data.country_name}`] ? 'bar estimated estimated-' + this.slide.section.color.slice(1) : 'bar')
          // .style('background-image', (d, i) => i === this.slide.expand_country ? expandPhoto : null)
          .call((enter) => enter
            .transition(t)
            .style('left', (d: any) => this.barPositionX(x, d, highlightSlide))
            .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
          )
        ,
        (update) => update
          .call((update) => {
            if (!this.startFromZero) {
              return update.transition(t)
                .style('top', (d) => expandedY(d.data.country_name) + 'px')
                .style('left', (d: any) => this.barPositionX(x, d, highlightSlide))
                .style('height', (d, i) => i === this.slide.expand_country ? expandWidth : barHeight)
                .style('width', (d) => (x(d[1]) - x(d[0])) + 'px')
                .style('background-color', (d) => this.barColor(d))
                .style('background-image', (d, i) => this.backgroundImage(d, i, expandPhoto))
                .attr('class', (d: any) => estimated[`${d.key}-${d.data.country_name}`] ? 'bar estimated estimated-' + this.slide.section.color.slice(1) : 'bar')
                // .style('background-image', (d, i) => i === this.slide.expand_country ? expandPhoto : null)
              }
            return update
              .transition(t)
                .style('height', (d, i) => i === this.slide.expand_country ? expandWidth : barHeight)
                .style('left', '0px')
                .style('width', '0px')
                .style('background-color', (d) => this.barColor(d))
                .style('background-image', (d, i) => this.backgroundImage(d, i, expandPhoto))
                .attr('class', (d: any) => estimated[`${d.key}-${d.data.country_name}`] ? 'bar estimated estimated-' + this.slide.section.color.slice(1) : 'bar')
                // i === this.slide.expand_country ? expandPhoto : null)
                .call((update) => update
                .transition()
                  .duration(1)
                  .style('top', (d) => expandedY(d.data.country_name) + 'px'))
              .call((update) => update
                .transition()
                  .delay(this.DURATION/2)
                  .duration(this.DURATION)
                  .ease(easeLinear)
                  .style('left', (d: any) => this.barPositionX(x, d, highlightSlide))
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
               barHeight: string, expandOffset: number) {
    const countries = select(this.countries.nativeElement);

    // Labels
    countries.selectAll('.label')
      .data(data || [], (d: any) => (d as Datum).country_name)
      .join(
        (enter) => enter.append('div').attr('class', 'label')
          .html((d: any) => `<span class='flag'>${d.flag}</span>&nbsp;<span class='name'>${d.country_name}</name>`)
          // .style('top', (d) => expandedY(d.country_name) + 'px')
          .style('top', (d, i) => (i === this.slide.expand_country ? expandOffset : 0) + (expandedY(d.country_name) || 0) + 'px')

          .style('height', barHeight)
          .style('opacity', 0)
          .attr('class', (d: any) => this.labelClasses(d))
          .call((enter) => enter
            .transition(t)
            .style('opacity', visible ? 1 : 0)
          )
        ,
        (update) => {
          if (this.startFromZero) {
            return update
              .transition(t)
                .style('opacity', 0)
                .style('height', barHeight)
                .attr('class', (d: any) => this.labelClasses(d))
              .call((update) => update
                .transition()
                  .duration(1)
                  .style('top', (d, i) => (i === this.slide.expand_country ? expandOffset : 0) + (expandedY(d.country_name) || 0) + 'px')
                  )
              .call((update) => update
                .transition()
                  .delay(this.DURATION/2)
                  .duration(this.DURATION)
                  .style('opacity', visible ? 1 : 0)
                );
          } else {
            return update
              .transition(t)
                .style('top', (d, i) => (i === this.slide.expand_country ? expandOffset : 0) + (expandedY(d.country_name) || 0) + 'px')
                .style('opacity', visible ? 1 : 0)
                .style('height', barHeight)
                .attr('class', (d: any) => this.labelClasses(d))
              ;
          }
        },
        (exit) => exit
          .transition(t)
          .style('opacity', 0)
          .remove()
      );
  }

  updateHighlightLabels(layout: Series<Datum, string>[], countries: Country[] | null, x: ScaleLinear<number, number, number>, expandedY: (d: string) => number | undefined, 
                        barHeight: number, t: Transition<BaseType, any, any, any>, highlightSlide: {[key: string]: number}, expandOffset: number = 0) {
    const canvas = select(this.chart.nativeElement);
    const last = layout[layout.length - 1];

    const countrySums = countries ? countries.map((d) => {
      const country_last = last.filter(dd => dd.data.country_name === d.name)[0];
      const slide = highlightSlide[d.name] || 0;
      const skip = this.slide.data.indicator_info[last.key]?.skip || 0;
      return x(country_last[1] + slide) + skip;
    }) : [];
    const countryVals = countries ? countries.map((d) => {
      const country_last = last.filter(dd => dd.data.country_name === d.name)[0];
      return country_last.data.values[0]?.value.toLocaleString();
    }) : [];
    const expand_country = this.slide.expand_country !== null ? this.slide.data.countries[this.slide.expand_country].country_name : null;
    // Bars
    canvas.selectAll('.country-hl')
      .data(countries || [], (d) => (d as Country).name)
      .join(
        (enter) => enter.append('div')
          .attr('class', 'country-hl')
          .attr('data-series', (d: any) => d.key)
          .style('transform', 'translateY(-50%)')
          .style('background-color', this.labelBgColor())
          .style('color', this.labelFgColor())
          .style('top', (d) => (d.name === expand_country ? expandOffset : barHeight/2) + (expandedY(d.name) || 0) + 'px')
          .style('left', (d, i) => (8 + countrySums[i]) + 'px')
          .style('opacity', 0)
          .call((x) => x.append('span').attr('class', 'text').html((d: any, i: number) => this.labelContent(d, countryVals[i])))
          .call((x) => x.append('span').attr('class', 'tag').style('background-color', this.labelBgColor()))
          .call((enter) => enter
            .transition()
            .duration(this.DURATION)
            .delay(this.DURATION)
            .style('opacity', 1)
          )
        ,
        (update) => update
          .call((x) => x.select('.text').html((d: any, i: number) => this.labelContent(d, countryVals[i])))
          .transition(t)
          .style('top', (d) => (d.name === expand_country ? expandOffset : barHeight/2) + (expandedY(d.name) || 0) + 'px')
          .style('left', (d, i) => (8 + countrySums[i]) + 'px')
          .style('background-color', this.labelBgColor())
          .style('color', this.labelFgColor())
          .style('opacity', 1)
          .call((x) => x.select('.tag').style('background-color', this.labelBgColor()))
        ,
        (exit) => exit
          .transition(t)
          .style('opacity', 0)
          .remove()
      )
    
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
