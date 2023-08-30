import { Component, Input } from '@angular/core';
import { ReportEntry } from './sys-check.interfaces';

@Component({
  selector: 'tc-report-result-list',
  template: `
    <mat-list>
      <mat-list-item *ngFor="let reportEntry of environmentReport">
        <span matListItemTitle>{{reportEntry.label}}</span>
        <span matListItemLine>{{reportEntry.value}}</span>
      </mat-list-item>
    </mat-list>
  `,
  styles: [
    'mat-list-item {margin-bottom: -10px;}'
  ]
})
export class ReportResultListComponent {
  @Input() environmentReport!: ReportEntry[];
}
