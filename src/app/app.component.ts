import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, Signal, signal, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
// import { NgVirtualListComponent, IScrollEvent, ISize, IVirtualListItem } from '../../../virtual-list/projects/ng-virtual-list/src/public-api';
import { NgVirtualListComponent, IVirtualListItem, IScrollEvent, ISize } from 'ng-virtual-list';
import { BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, from, interval, map, mergeMap, of, switchMap, take, tap, throttleTime } from 'rxjs';
import { LOGO } from './const';
import { GROUP_DYNAMIC_ITEMS, GROUP_DYNAMIC_ITEMS_STICKY_MAP, ITEMS } from './const/collection';
import { generateMessage, generateWriteIndicator } from './utils/collection';
import { FormsModule } from '@angular/forms';
import { MenuButtonComponent } from './components/menu-button/menu-button.component';
import { SearchComponent } from './components/search/search.component';
import { DrawerComponent, DockMode, TDockMode } from "./components/drawer/drawer.component";
import { LongPressDirective } from './directives';
import { SearchHighlightDirective } from './directives/search-highlight.directive';

const SNAP_HEIGHT = 100;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, NgVirtualListComponent, SearchHighlightDirective,
    MenuButtonComponent, SearchComponent, DrawerComponent, LongPressDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  readonly logo = LOGO;

  protected _listContainerRef = viewChild('dynamicList', { read: NgVirtualListComponent });

  private _$isEndOfListPosition = new BehaviorSubject<boolean>(true);
  readonly $isEndOfListPosition = this._$isEndOfListPosition;

  private _$version = new BehaviorSubject<number>(0);
  readonly $version = this._$version.asObservable();

  menuOpened = signal<boolean>(false);

  dockMode: Signal<DockMode.LEFT | DockMode.NONE>;

  show = signal(true);

  search = signal('');

  searchedWords = signal<Array<string>>([]);

  items = ITEMS;

  title = signal<string>('Demo');

  isEditMode = signal<boolean>(false);

  groupDynamicItems = [...GROUP_DYNAMIC_ITEMS];
  groupDynamicItemsStickyMap = { ...GROUP_DYNAMIC_ITEMS_STICKY_MAP };

  private _scrollParams = signal<{ viewportEndY: number, scrollWeight: number }>({ viewportEndY: 0, scrollWeight: 0 });

  constructor() {
    const list = this._listContainerRef;

    this.dockMode = computed(() => {
      const menuOpened = this.menuOpened();
      return menuOpened ? DockMode.LEFT : DockMode.NONE;
    });

    const $virtualList = toObservable(list).pipe(
      filter(list => !!list),
      switchMap(list => combineLatest([of(list), list?.$initialized])),
      filter(([, init]) => !!init),
      map(([list]) => list),
    );

    combineLatest([this.$version, $virtualList]).pipe(
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

        // this.show.set(version % 2 === 0);
      })
    ).subscribe();

    combineLatest([$virtualList, toObservable(this.search)]).pipe(
      map(([list, search]) => ({ list, search })),
      filter(({ list }) => !!list),
      debounceTime(0),
      tap(({ list, search }) => {
        this.searchedWords.set(search.split(' '));
        for (let i = 0, l = this.groupDynamicItems.length; i < l; i++) {
          const item = this.groupDynamicItems[i], name: string = item['name'];
          if (name) {
            const index = name?.indexOf(search);
            if (index > -1) {
              list!.scrollTo(item.id, 'instant');
              break;
            }
          }
        }
      })
    ).subscribe();

    $virtualList.pipe(
      delay(100),
      mergeMap(() => this.write()),
    ).subscribe();


    from(interval(2000)).pipe(
      mergeMap(() => this.write()),
    ).subscribe();

    combineLatest([toObservable(this._scrollParams), $virtualList, this.$version]).pipe(
      delay(10),
      switchMap(([{ viewportEndY, scrollWeight }, list]) => {
        let bounds: ISize | undefined;
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

  onSearchHandler(pattern: string) {
    this.search.set(pattern);
  }

  private resetList() {
    this.groupDynamicItems = [...GROUP_DYNAMIC_ITEMS];
    this.groupDynamicItemsStickyMap = { ...GROUP_DYNAMIC_ITEMS_STICKY_MAP };
  }

  private _nextIndex = this.groupDynamicItems.length;

  private write() {
    const msg = generateMessage(this._nextIndex);
    this._nextIndex++;
    return of(msg).pipe(
      tap(() => {
        const writeIndicator = generateWriteIndicator(this._nextIndex);
        this._nextIndex++;
        this.groupDynamicItems = [...this.groupDynamicItems, writeIndicator];
        this.groupDynamicItemsStickyMap[writeIndicator.id] = 0;

        const writeIndicatorShift = generateWriteIndicator(this._nextIndex);
        this._nextIndex++;
        this.groupDynamicItems = [writeIndicatorShift, ...this.groupDynamicItems];
        this.groupDynamicItemsStickyMap[writeIndicatorShift.id] = 0;

        this.increaseVersion();
      }),
      delay(500),
      tap(() => {
        const items = [...this.groupDynamicItems];
        items.pop();
        // this._nextIndex--;
        items.push(msg);
        this.groupDynamicItemsStickyMap[msg.id] = 0;

        items.shift();
        // this._nextIndex--;

        for (let i = 0, l = 1; i < l; i++) {
          const msgStart = generateMessage(this._nextIndex);
          this._nextIndex++;
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

  onScrollHandler(e: IScrollEvent & { [x: string]: any; }) {
    this._scrollParams.set({
      viewportEndY: e.scrollSize + e.size,
      scrollWeight: e.scrollWeight,
    });
  }

  onScrollEndHandler(e: IScrollEvent & { [x: string]: any; }) {
    this._scrollParams.set({
      viewportEndY: e.scrollSize + e.size,
      scrollWeight: e.scrollWeight,
    });
  }

  onClickHandler(data: IVirtualListItem) {
    // const element = this.groupDynamicItems.find(({ id }) => id === data.id);
    // console.log('e', element)
    // if (element) {
    //   element['name'] = element['name'] + element['name'];
    // }

    // this.groupDynamicItems = [... this.groupDynamicItems];
  }

  onRoomClickHandler(data: IVirtualListItem) {
    this.menuOpened.set(false);
    this.title.set(data['name']);
    this.resetList();
    this._listContainerRef()?.scrollToEnd('instant');

    setTimeout(() => {
      this._listContainerRef()?.scrollToEnd('instant');
    }, 150);
  }

  onOpenMenuHandler() {
    this.menuOpened.update(v => !v);
  }

  onEditModeStartHandler() {
    this.isEditMode.set(true);
  }
}
