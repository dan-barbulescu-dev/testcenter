import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { MainDataService } from '../shared/shared.module';
import { WorkspaceDataService } from './workspacedata.service';

@Component({
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  private routingSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    public mainDataService: MainDataService,
    public workspaceDataService: WorkspaceDataService
  ) {
  }

  navLinks = [
    { path: 'files', label: 'Dateien' },
    { path: 'results', label: 'Ergebnisse/Antworten' },
    { path: 'reviews', label: 'Kommentare' },
    { path: 'syscheck', label: 'System-Check Berichte' }
  ];

  ngOnInit(): void {
    setTimeout(() => {
      this.mainDataService.appSubTitle$.next('');
      this.routingSubscription = this.route.params.subscribe((params: Params) => {
        this.workspaceDataService.workspaceId$.next(params.ws);
        const workspace = this.mainDataService.getAccessObject('workspaceAdmin', params.ws);
        this.workspaceDataService.wsName = workspace.label;
        this.workspaceDataService.wsRole = workspace.flags.mode;
        this.mainDataService.appSubTitle$.next(
          `Verwaltung "${this.workspaceDataService.wsName}" (${this.workspaceDataService.wsRole})`
        );
      });
    });
  }

  ngOnDestroy(): void {
    if (this.routingSubscription !== null) {
      this.routingSubscription.unsubscribe();
    }
  }
}
