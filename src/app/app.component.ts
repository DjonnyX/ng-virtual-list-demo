import { CommonModule } from '@angular/common';
import { Component, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
// import { NgVirtualListComponent, IVirtualListCollection, IVirtualListStickyMap } from '../../../virtual-list/projects/ng-virtual-list/src/public-api';
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListStickyMap } from 'ng-virtual-list';
import { combineLatest, debounceTime, filter, of, switchMap, tap } from 'rxjs';
import { LOGO } from './const';

const MAX_ITEMS = 100000;

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

const generateLetter = () => {
  return CHARS[Math.round(Math.random() * CHARS.length)];
}

const generateWord = () => {
  const length = 5 + Math.floor(Math.random() * 50), result = [];
  while (result.length < length) {
    result.push(generateLetter());
  }
  return `${result.join('')}`;
};

const generateText = () => {
  const length = 2 + Math.floor(Math.random() * 10), result = [];
  while (result.length < length) {
    result.push(generateWord());
  }
  let firstWord = '';
  for (let i = 0, l = result[0].length; i < l; i++) {
    const letter = result[0].charAt(i);
    firstWord += i === 0 ? letter.toUpperCase() : letter;
  }
  result[0] = firstWord;
  return `${result.join(' ')}.`;
};

const GROUP_DYNAMIC_ITEMS: IVirtualListCollection = [],
  GROUP_DYNAMIC_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

let groupDynamicIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item', incomType = Math.random() > .5 ? 'in' : 'out';
  if (type === 'group-header') {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupDynamicIndex}` : `${id}. ${generateText()}`, incomType });
  GROUP_DYNAMIC_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

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

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_STICKY_MAP;

  constructor() {
    // const list = this._listContainerRef;
    // toObservable(list).pipe(
    //   filter(list => !!list),
    //   switchMap((list => {
    //     return combineLatest([of(list), list.$initialized]);
    //   })),
    //   filter(([, init]) => init),
    //   debounceTime(1),
    //   tap(([list]) => {
    //     list.scrollToEnd('instant');
    //   })
    // ).subscribe();
  }
}
