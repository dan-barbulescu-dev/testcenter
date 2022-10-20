/* eslint-disable no-console */
import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  SysCheckInfo,
  AuthData,
  WorkspaceData,
  BookletData, AppError, AccessObject
} from './app.interfaces';
import { SysConfig } from './shared/shared.module';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  constructor(
    @Inject('SERVER_URL') private readonly serverUrl: string,
    private http: HttpClient
  ) {}

  login(loginType: 'admin' | 'login', name: string, password: string | undefined = undefined): Observable<AuthData> {
    return this.http.put<AuthData>(`${this.serverUrl}session/${loginType}`, { name, password });
  }

  codeLogin(code: string): Observable<AuthData> {
    return this.http.put<AuthData>(`${this.serverUrl}session/person`, { code });
  }

  getWorkspaceData(workspaceId: string): Observable<WorkspaceData> {
    return this.http
      .get<WorkspaceData>(`${this.serverUrl}workspace/${workspaceId}`)
      .pipe(catchError(() => {
        console.warn(`get workspace data failed for ${workspaceId}`);
        return of(<WorkspaceData>{
          id: workspaceId,
          name: workspaceId,
          role: 'n.d.'
        });
      }));
  }

  getGroupData(groupName: string): Observable<AccessObject> {
    // TODO find consistent terminology. in XSD they are called name & label
    // and likewise (mostly) in newer BE-versions
    interface NameAndLabel {
      name: string;
      label: string;
    }

    return this.http
      .get<NameAndLabel>(`${this.serverUrl}monitor/group/${groupName}`)
      .pipe(map((r: NameAndLabel): AccessObject => ({ id: r.name, name: r.label })))
      .pipe(catchError(() => {
        console.warn(`get group data failed for ${groupName}`);
        return of(<AccessObject>{
          id: groupName,
          name: groupName
        });
      }));
  }

  getSessionData(): Observable<AuthData | number> {
    return this.http
      .get<AuthData>(`${this.serverUrl}session`)
      .pipe(
        catchError((err: AppError) => of(err.code))
      );
  }

  getBookletData(bookletId: string): Observable<BookletData> {
    return this.http
      .get<BookletData>(`${this.serverUrl}booklet/${bookletId}/data`)
      .pipe(
        map(bData => {
          bData.id = bookletId;
          return bData;
        })
      );
  }

  startTest(bookletName: string): Observable<string | number> {
    return this.http
      .put<number>(`${this.serverUrl}test`, { bookletName })
      .pipe(
        map((testId: number) => String(testId)),
        catchError((err: AppError) => of(err.code))
      );
  }

  getSysConfig(): Observable<SysConfig | null> {
    return this.http
      .get<SysConfig>(`${this.serverUrl}system/config`)
      .pipe(
        catchError(() => of(null))
      );
  }

  getSysCheckInfo(): Observable<SysCheckInfo[]> {
    return this.http
      .get<SysCheckInfo[]>(`${this.serverUrl}sys-checks`)
      .pipe(
        catchError(() => of([]))
      );
  }
}
