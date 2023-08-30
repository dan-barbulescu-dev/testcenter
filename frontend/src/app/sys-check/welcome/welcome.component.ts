import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import UAParser from 'ua-parser-js';
import { SysCheckDataService } from '../sys-check-data.service';
import { ReportEntry } from '../sys-check.interfaces';
import { BackendService } from '../backend.service';

@Component({
  styleUrls: ['../sys-check.component.css'],
  templateUrl: './welcome.component.html'
})
export class WelcomeComponent implements OnInit {
  private report: Map<string, ReportEntry> = new Map<string, ReportEntry>();

  // TODO discuss if sysCheck should show a warning.
  private rating = {
    screen: {
      width: 800,
      height: 600
    }
  };

  constructor(public sysCheckDataService: SysCheckDataService,
              private backendService: BackendService) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.sysCheckDataService.setNewCurrentStep('w');
      this.getScreenData();
      this.getFromUAParser();
      this.getNavigatorInfo();
      this.getBrowserPluginInfo();
      this.sysCheckDataService.questionnaireReport.length = 0;
      this.getTime()
        .subscribe(() => {
          const report = Array.from(this.report.values())
            .sort((item1: ReportEntry, item2: ReportEntry) => (item1.label > item2.label ? 1 : -1));
          this.sysCheckDataService.environmentReport = Object.values(report);
          this.sysCheckDataService.timeCheckDone = true;
        });
    });
  }

  private getFromUAParser() {
    const uaInfos = new UAParser().getResult();
    [
      ['cpu', 'architecture', 'CPU-Architektur'],
      ['device', 'model', 'Gerätemodell'],
      ['device', 'type', 'Gerätetyp'],
      ['device', 'vendor', 'Gerätehersteller'],
      ['browser', 'name', 'Browser'],
      ['browser', 'major', 'Browser-Version'],
      ['os', 'name', 'Betriebsystem'],
      ['os', 'version', 'Betriebsystem-Version']
    ].forEach((item: string[]) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if ((uaInfos[item[0]]) && (uaInfos[item[0]][item[1]])) {
        this.report.set(item[2], {
          id: item[2],
          type: 'environment',
          label: item[2],
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          value: uaInfos[item[0]][item[1]],
          warning: false
        });
      }
    });
  }

  private getNavigatorInfo() {
    [
      ['hardwareConcurrency', 'CPU-Kerne'],
      ['cookieEnabled', 'Browser-Cookies aktiviert'],
      ['language', 'Browser-Sprache']
    ].forEach((item: string[]) => {
      if (typeof navigator[item[0] as keyof Navigator] !== 'undefined') {
        this.report.set(item[1], {
          id: item[0],
          type: 'environment',
          label: item[1],
          value: navigator[item[0] as keyof Navigator] as string,
          warning: false
        });
      }
    });
  }

  private getBrowserPluginInfo() {
    if ((typeof navigator.plugins === 'undefined') || (!navigator.plugins.length)) {
      return;
    }
    const pluginNames = Array<string>();
    for (let i = 0; i < navigator.plugins.length; i++) {
      pluginNames.push(navigator.plugins[i].name);
    }
    this.report.set('Browser-Plugins', {
      id: 'browser-plugins',
      type: 'environment',
      label: 'Browser-Plugins',
      value: pluginNames.join(', '),
      warning: false
    });
  }

  private getScreenData() {
    const isLargeEnough = (window.screen.width >= this.rating.screen.width) &&
      (window.screen.height >= this.rating.screen.height);
    this.report.set('Bildschirm-Auflösung', {
      id: 'screen-resolution',
      type: 'environment',
      label: 'Bildschirm-Auflösung',
      value: `${window.screen.width} x ${window.screen.height}`,
      warning: !isLargeEnough
    });
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.offsetWidth;
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.offsetHeight;
    this.report.set('Fenster-Größe', {
      id: 'screen-size',
      type: 'environment',
      label: 'Fenster-Größe',
      value: `${windowWidth} x ${windowHeight}`,
      warning: false
    });
  }

  private getTime(): Observable<true> {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const clientTime = new Date().getTime();
    return this.backendService.getServerTime()
      .pipe(
        map(serverTime => {
          const timeDifferenceSeconds = Math.round((clientTime - serverTime.timestamp) / 1000);
          this.report.set('Zeitabweichung', {
            id: 'time-difference',
            type: 'environment',
            label: 'Zeitabweichung',
            value: timeDifferenceSeconds.toString(10),
            warning: timeDifferenceSeconds >= 60
          });
          this.report.set('Zeitzone', {
            id: 'time-zone',
            type: 'environment',
            label: 'Zeitzone',
            value: timeZone,
            warning: timeZone !== serverTime.timezone
          });
          return true;
        })
      );
  }
}
