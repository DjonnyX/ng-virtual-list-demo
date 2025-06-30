import { IVirtualListCollection, IVirtualListStickyMap } from "ng-virtual-list";
import { generateText } from "../utils";

const MAX_ITEMS = 100000;

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

export {
    GROUP_DYNAMIC_ITEMS,
    GROUP_DYNAMIC_ITEMS_STICKY_MAP,
};
