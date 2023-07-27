import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { CustomtextService, MainDataService } from '../shared/shared.module';
import { BackendService } from '../backend.service';
import { AccessObject, AuthData } from '../app.interfaces';

@Component({
  templateUrl: './starter.component.html',
  styleUrls: ['./starter.component.css']
})
export class StarterComponent implements OnInit, OnDestroy {
  accessObjects: { [accessType: string]: AccessObject[] } = {};
  workspaces: AccessObject[] = [];
  private getMonitorDataSubscription: Subscription | null = null;
  private getBookletDataSubscription: Subscription | null = null;
  private getWorkspaceDataSubscription: Subscription | null = null;
  problemText: string;
  isSuperAdmin = false;
  constructor(
    private router: Router,
    private bs: BackendService,
    public cts: CustomtextService,
    public mds: MainDataService
  ) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.bs.getSessionData().subscribe(authDataUntyped => {
        if (typeof authDataUntyped === 'number') {
          return;
        }
        const authData = authDataUntyped as AuthData;
        if (!authData || !authData.token) {
          this.mds.logOut();
          return;
        }
        this.accessObjects = authData.claims;
        this.mds.setAuthData(authData);

        if ('attachmentManager' in this.accessObjects ||
          'workspaceMonitor' in this.accessObjects ||
          'testGroupMonitor' in this.accessObjects
        ) {
          this.mds.appSubTitle$.next(this.cts.getCustomText('gm_headline'));
        } else if ('workspaceAdmin' in this.accessObjects || 'superAdmin' in this.accessObjects) {
          this.mds.appSubTitle$.next('Verwaltung: Bitte Arbeitsbereich wählen');
          if (this.getWorkspaceDataSubscription !== null) {
            this.getWorkspaceDataSubscription.unsubscribe();
          }
          this.workspaces = authDataUntyped.claims.workspaceAdmin;
          this.isSuperAdmin = typeof authDataUntyped.claims.superAdmin !== 'undefined';
        } else {
          this.reloadTestList();
        }
      });
    });
  }

  startTest(test: AccessObject): void {
    this.bs.startTest(test.id).subscribe(testId => {
      if (typeof testId === 'number' &&
        ('workspaceMonitor' in test || 'testGroupMonitor' in test || 'attachmentManager' in test)) {
        const errCode = testId as number;
        if (errCode === 423) {
          this.problemText = 'Dieser Test ist gesperrt';
        } else {
          this.problemText = `Problem beim Start (${errCode})`;
        }
      } else if (typeof testId === 'number' && 'test' in test) {
        this.reloadTestList();
      } else {
        this.router.navigate(['/t', testId]);
      }
    });
  }

  buttonGotoMonitor(accessObject: AccessObject): void {
    this.router.navigateByUrl(`/gm/${accessObject.id.toString()}`);
  }

  buttonGotoAttachmentManager(accessObject) {
    this.router.navigateByUrl(`/am/${accessObject.id.toString()}`);
  }

  resetLogin(): void {
    this.mds.logOut();
  }

  private reloadTestList(): void {
    this.mds.appSubTitle$.next('Testauswahl');
    this.bs.getSessionData().subscribe(authDataUntyped => {
      if (typeof authDataUntyped === 'number') {
        return;
      }
      const authData = authDataUntyped as AuthData;
      if (!authData || !authData.token) {
        this.mds.logOut();
      }
      this.mds.setAuthData(authData);
    });
  }

  buttonGotoWorkspaceAdmin(ws: AccessObject): void {
    this.router.navigateByUrl(`/admin/${ws.id.toString()}/files`);
  }

  ngOnDestroy(): void {
    if (this.getMonitorDataSubscription !== null) {
      this.getMonitorDataSubscription.unsubscribe();
    }

    if (this.getBookletDataSubscription !== null) {
      this.getBookletDataSubscription.unsubscribe();
    }

    if (this.getWorkspaceDataSubscription !== null) {
      this.getWorkspaceDataSubscription.unsubscribe();
    }
  }
}
