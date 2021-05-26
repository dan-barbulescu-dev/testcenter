import {
  Component, Input, OnChanges, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { CustomtextPipe, CustomtextService } from 'iqb-components';
import {
  Observable, ReplaySubject, Subject, Subscription
} from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alert',
  templateUrl: 'alert.component.html',
  styleUrls: ['alert.css'],
  encapsulation: ViewEncapsulation.None
})
export class AlertComponent implements OnChanges {
  @Input() text: string;
  @Input() customtext: string;
  @Input() replacements: string[];
  @Input() level: 'error' | 'warning' | 'info' | 'success';

  icons = {
    error: 'error',
    warning: 'warning',
    info: 'info',
    success: 'check_circle'
  };

  get displayText$(): Observable<string> {
    return this._displayText$
      .pipe(
        map(text => this.highlightTicks(text || ''))
      );
  }

  private _displayText$: Subject<string>;
  private customTextSubscription: Subscription;

  constructor(
    private cts: CustomtextService
  ) {
    this._displayText$ = new ReplaySubject<string>();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.customtext) {
      this.unsubscribeCustomText();
      if (changes.text) {
        this._displayText$.next(this.text);
      }
    } else if (changes.customtext || changes.replacements) {
      this.unsubscribeCustomText();
      this.subscribeCustomText();
    }
  }

  private subscribeCustomText(): void {
    this.customTextSubscription = this.getCustomtext()
      .subscribe(text => this._displayText$.next(text));
  }

  private unsubscribeCustomText(): void {
    if (this.customTextSubscription) {
      this.customTextSubscription.unsubscribe();
      this.customTextSubscription = null;
    }
  }

  getCustomtext(): Observable<string> {
    return new CustomtextPipe(this.cts)
      .transform(this.text, this.customtext, ...(this.replacements || []));
  }

  private highlightTicks = (text: string): string => text.replace(
    /\u0060([^\u0060]+)\u0060/g,
    (match, match2) => `<span class='highlight'>${match2}</span>`
  );
}
