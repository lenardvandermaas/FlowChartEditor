import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { FlowChartEditorComponent } from "./components/flow-chart-editor/flow-chart-editor.component";
import { DimensionsEditorComponent } from "./components/dimensions-editor/dimensions-editor.component";
import { FrankFlowchartComponent } from "./components/frank-flowchart/frank-flowchart.component";
import { SequenceEditorComponent } from "./components/sequence-editor/sequence-editor.component";
import { NgModule } from "@angular/core";
import { RxPush } from "@rx-angular/template/push";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { RouterModule } from "@angular/router";
import { routes } from "./app.routes";

@NgModule({
  declarations: [
    AppComponent,
    DimensionsEditorComponent,
    FlowChartEditorComponent,
    FrankFlowchartComponent,
    SequenceEditorComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
    RxPush,
    DragDropModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
