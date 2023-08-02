import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SlidesComponent } from './slides/slides.component';
import { HttpClientModule } from '@angular/common/http';
import { MainComponent } from './main/main.component';
import { ChartComponent } from './chart/chart.component';
import { FooterComponent } from './footer/footer.component';
import { WeightsComponent } from './weights/weights.component';
import { WeightsDimensionComponent } from './weights-dimension/weights-dimension.component';
import { WeightsSliderComponent } from './weights-slider/weights-slider.component';
import { FormsModule } from '@angular/forms';
import { SliderComponent } from './slider/slider.component';

@NgModule({
  declarations: [
    AppComponent,
    SlidesComponent,
    MainComponent,
    ChartComponent,
    FooterComponent,
    WeightsComponent,
    WeightsDimensionComponent,
    WeightsSliderComponent,
    SliderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
