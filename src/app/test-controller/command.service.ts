import {Inject, Injectable, OnDestroy} from '@angular/core';
import {interval, of, Subject, Subscription} from 'rxjs';
import {Command, commandKeywords, isKnownCommand, TestStatus} from './test-controller.interfaces';
import {TestControllerService} from './test-controller.service';
import {distinctUntilChanged, filter, map, switchMap, zip} from 'rxjs/operators';
import {Uuid} from '../shared/uuid';
import {WebsocketBackendService} from '../shared/websocket-backend.service';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class CommandService extends WebsocketBackendService<Command[]> implements OnDestroy {

    constructor (
        @Inject('IS_PRODUCTION_MODE') public isProductionMode,
        private tcs: TestControllerService,
        @Inject('SERVER_URL') serverUrl: string,
        http: HttpClient
    ) {
        super(serverUrl, http);

        if (!this.isProductionMode) {
            this.setUpGlobalCommandsForDebug();
        }

        this.subscribeCommands();
        this.subscribeNewTestStarted();
    }
    public command$: Subject<Command> = new Subject<Command>();
    private commandSubscription: Subscription;
    initialData = [];
    pollingEndpoint = 'will_be_set';
    pollingInterval = 15000;
    wsChannelName = 'commands';
    private commandHistory: string[] = [];
    private newPollingEndpointSubscription: Subscription;

    private static commandToString(command: Command): string {
        return `[${command.id}] ${command.keyword} ` + command.arguments.join(' ');
    }

    ngOnDestroy() {
        this.commandSubscription.unsubscribe();
        this.newPollingEndpointSubscription.unsubscribe();
    }

    private subscribeNewTestStarted() {
        this.newPollingEndpointSubscription = this.tcs.testStatus$
            .pipe(
                distinctUntilChanged(),
                filter(testStatus => (testStatus === TestStatus.RUNNING) || (testStatus === TestStatus.PAUSED)),
                map(_ => `test/${this.tcs.testId}/commands`),
                filter(newPollingEndpoint => newPollingEndpoint !== this.pollingEndpoint)
            )
            .subscribe((pollingEndpoint: string) => {
                this.pollingEndpoint = pollingEndpoint;
                this.observeEndpointAndChannel()
                    .subscribe((commands: Command[]) => this.receiveChunkOfCommands(commands));
            });
    }

    private receiveChunkOfCommands(commands: Command[]) {
        console.log('commands received:', commands);
        of(...commands)
            .pipe(
                zip<Command, number>(interval(1500)),
                map(v => v[0])
            ).subscribe((command: Command) => {this.command$.next(command); });
    }

    private subscribeCommands() {
        this.commandSubscription = this.command$
            .pipe(
                switchMap((command: Command) => {
                    return this.http.patch(`${this.serverUrl}test/${this.tcs.testId}/command/${command.id}/executed`, {})
                        .pipe(map(() => command));
                })
            )
            .subscribe((command: Command) => {
                this.executeCommand(command);
            });
    }

    private executeCommand(command: Command) {

        console.log('execute command: ' + CommandService.commandToString(command));

        if (this.commandHistory.indexOf(command.id) >= 0) {
            console.warn('command already executed' + CommandService.commandToString(command));
        }

        this.commandHistory.push(command.id);
        switch (command.keyword) {
            case 'pause':
                this.tcs.testStatus$.next(TestStatus.PAUSED);
                break;
            case 'resume':
                this.tcs.testStatus$.next(TestStatus.RUNNING);
                break;
            case 'terminate':
                this.tcs.terminateTest();
                break;
            case 'goto':
                this.tcs.setUnitNavigationRequest(command.arguments[0]);
                break;
            case 'debug':
                this.tcs.debugPane = command.arguments[0] !== 'off';
                break;
            default:
                console.warn(`Unknown command: ` + CommandService.commandToString(command));
        }
    }

    private setUpGlobalCommandsForDebug() {
        window['tc'] = {};
        commandKeywords.forEach((keyword: string) => {
            window['tc'][keyword] = (args) => {this.commandFromTerminal(keyword, args, Uuid.create()); };
        });
    }

    private commandFromTerminal(keyword: string, args: string[], id: string): void {
        if (!this.isProductionMode) {
            return;
        }

        args = (typeof args === 'undefined') ? [] : args;
        const command = {keyword, arguments: args, id, timestamp: Date.now()};
        if (!isKnownCommand(keyword)) {
            console.warn(`Unknown command: ` + CommandService.commandToString(command));
            return;
        }

        this.command$.next(command);
    }
}
