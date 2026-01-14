import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule  // <-- add this line
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }