import { AfterViewInit, Component, Input, OnChanges, ViewChild } from '@angular/core';
import { Section, Slide } from '../datatypes';
import { timer } from 'rxjs';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.less']
})
export class NavigationComponent implements OnChanges, AfterViewInit {
  @Input() sections: Section[];
  @Input() slide: Slide;

  @ViewChild('container') containerEl: any;
  @ViewChild('selector') selectorEl: any;

  ngOnChanges(): void {
    this.updateSelector();
    this.sections[0].name = this.sections[0].name.split(' ').join('<br/>');
  }

  ngAfterViewInit(): void {
      this.updateSelector();
  }

  updateSelector() {
    const container = this.containerEl?.nativeElement as HTMLElement;
    timer(10).subscribe(() => {
      const el: HTMLElement | null = container?.querySelector('.active');
      if (!!el) {
        el.scrollIntoView({behavior: 'smooth'});
        timer(200).subscribe(() => {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const top = rect.top - containerRect.top;
          const left = rect.left - containerRect.left + container.scrollLeft;
          const height = rect.height;
          const width = rect.width;
          const selector = this.selectorEl.nativeElement;
          selector.style.top = `${top}px`;
          selector.style.left = `${left}px`;
          selector.style.height = `${height}px`;
          selector.style.width = `${width}px`;
        });
      }
    });
  }
}
