type Verona2NavigationTarget = 'next' | 'previous' | 'first' | 'last' | 'end';

type Verona2StateReportPolicy = 'none' | 'eager' | 'on-demand'; // TODO on-demand is not supported by tc?

type Verona2LogPolicy = 'disabled' | 'lean' | 'rich' | 'debug';

type Verona3PagingMode = 'separate' | 'concat-scroll' | 'concat-scroll-snap';

interface Verona2PlayerConfig {
  logPolicy: Verona2LogPolicy;
  pagingMode: Verona3PagingMode;
  stateReportPolicy: Verona2StateReportPolicy;
  unitNumber: number;
  unitTitle: string;
  unitId: string;
}

interface Verona3PlayerConfig extends Verona2PlayerConfig {
  enabledNavigationTargets: Verona2NavigationTarget[];
  startPage?: string;
}

export { Verona3PlayerConfig as VeronaPlayerConfig };
export { Verona2NavigationTarget as VeronaNavigationTarget };
