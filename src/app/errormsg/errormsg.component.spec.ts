import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrormsgComponent } from './errormsg.component';
import {HttpClientModule} from "@angular/common/http";

describe('ErrormsgComponent', () => {
  let component: ErrormsgComponent;
  let fixture: ComponentFixture<ErrormsgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ErrormsgComponent ],
      imports: [HttpClientModule]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrormsgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
