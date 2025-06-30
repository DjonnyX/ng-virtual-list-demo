import { CommonModule } from '@angular/common';
import { Component, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NgVirtualListComponent, IScrollEvent, IRect } from '../../../virtual-list/projects/ng-virtual-list/src/public-api';
// import { NgVirtualListComponent, IScrollEvent, IRect } from 'ng-virtual-list';
import { BehaviorSubject, combineLatest, debounceTime, delay, filter, from, interval, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { LOGO } from './const';
import { GROUP_DYNAMIC_ITEMS, GROUP_DYNAMIC_ITEMS_STICKY_MAP } from './const/collection';
import { generateMessage, generateWriteIndicator } from './utils/collection';

const SNAP_HEIGHT = 100;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly logo = LOGO;

  protected _listContainerRef = viewChild('dynamicList', { read: NgVirtualListComponent });

  private _$isEndOfListPosition = new BehaviorSubject<boolean>(true);
  readonly $isEndOfListPosition = this._$isEndOfListPosition;

  private _$version = new BehaviorSubject<number>(0);
  readonly $version = this._$version.asObservable();

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_STICKY_MAP;

  constructor() {
    const list = this._listContainerRef;

    const $virtualList = toObservable(list).pipe(
      filter(list => !!list),
      switchMap(list => combineLatest([of(list), list?.$initialized])),
      filter(([, init]) => !!init),
      map(([list]) => list),
    );

    combineLatest([this.$version, $virtualList]).pipe(
      map(([version, list]) => ({ version, list })),
      mergeMap(({ version, list }) => {
        return combineLatest([of(version), of(list)]);
      }),
      map(([version, list]) => ({ version, list })),
      filter(({ list }) => !!list),
      debounceTime(50),
      tap(({ version, list }) => {
        if (version === 0) {
          list!.scrollToEnd('instant');
        }

        if (this._$isEndOfListPosition.getValue()) {
          list!.scrollToEnd('instant');
        }
      })
    ).subscribe();

    $virtualList.pipe(
      delay(100),
      switchMap(() => this.write()),
    ).subscribe();

    from(interval(2000)).pipe(
      switchMap(() => this.write()),
    ).subscribe();

    combineLatest([this.$scrollParams, $virtualList, this.$version]).pipe(
      delay(10),
      switchMap(([{ viewportEndY, scrollWeight }, list]) => {
        let bounds: IRect | undefined;
        if (list) {
          bounds = list.getItemBounds(this.groupDynamicItems[this.groupDynamicItems.length - 1].id);
        }

        const height = (bounds?.height ?? 0);

        return of((viewportEndY + height + SNAP_HEIGHT) >= scrollWeight);
      }),
      tap(v => {
        this._$isEndOfListPosition.next(v);
      }),
    ).subscribe();

    const appHeightHandler = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    window.addEventListener('resize', appHeightHandler);

    $virtualList.pipe(
      tap(() => {
        appHeightHandler();
      }),
      delay(100),
      tap(() => {
        document.documentElement.style.setProperty('--viewport-alpha', '1');
      }),
    ).subscribe();
  }

  private write() {
    const msg = generateMessage(this.groupDynamicItems.length);
    return of(msg).pipe(
      tap(() => {
        const writeIndicator = generateWriteIndicator(this.groupDynamicItems.length);
        this.groupDynamicItems = [...this.groupDynamicItems, writeIndicator];
        this.groupDynamicItemsStickyMap[writeIndicator.id] = 0;

        this.increaseVersion();
      }),
      delay(500),
      tap(() => {
        const items = [...this.groupDynamicItems];
        items.pop();
        items.push(msg);
        this.groupDynamicItemsStickyMap[msg.id] = 0;

        for (let i = 0, l = 1; i < l; i++) {
          const msgStart = generateMessage(this.groupDynamicItems.length + 10000 + i);
          this.groupDynamicItemsStickyMap[msgStart.id] = 0;
          items.unshift(msgStart);
        }

        this.groupDynamicItems = items;

        this.increaseVersion();
      })
    );
  }

  private increaseVersion() {
    this._$version.next(this._$version.getValue() + 1);
  }

  private _$scrollParams = new BehaviorSubject<{ viewportEndY: number, scrollWeight: number }>({ viewportEndY: 0, scrollWeight: 0 });
  readonly $scrollParams = this._$scrollParams.asObservable();

  onScrollHandler(e: IScrollEvent & { [x: string]: any; }) {
    this._$scrollParams.next({
      viewportEndY: e.scrollSize + e.size,
      scrollWeight: e.scrollWeight,
    });
  }

  onScrollEndHandler(e: IScrollEvent & { [x: string]: any; }) {
    this._$scrollParams.next({
      viewportEndY: e.scrollSize + e.size,
      scrollWeight: e.scrollWeight,
    });
  }
}
