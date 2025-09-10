import { IVirtualListItem } from "ng-virtual-list";
import { generateText } from "./text";

export const generateWriteIndicator = (index: number): IVirtualListItem<any> => {
    const id = index + 1, type = 'write-indicator';
    return { id, type };
}

export const generateMessage = (index: number): IVirtualListItem<any> => {
    const id = index + 1, type = 'item', incomType = Math.random() > .5 ? 'in' : 'out';
    return { id, type, edited: false, name: `${id}. ${generateText()}`, incomType };
}
