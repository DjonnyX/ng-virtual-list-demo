import {
    Directive,
    ElementRef,
    inject,
    output,
} from '@angular/core';
import { ClickOutsideService } from './click-outside.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Directive({
    selector: '[clickOutside]',
})
export class ClickOutsideDirective {
    onClickOutside = output<Event>();

    onClick = output<Event>();

    private _service = inject(ClickOutsideService);

    private _elementRef = inject(ElementRef<HTMLElement>);

    constructor() {
        const element: HTMLElement = this._elementRef.nativeElement;
        this._service.activeTarget = element;
        this._service.$onClick.pipe(
            takeUntilDestroyed(),
            tap(e => {
                const element: HTMLElement = this._elementRef.nativeElement;
                if (e.target === element) {
                    this.onClick.emit(e);
                } else {
                    this.onClickOutside.emit(e);
                }
            }),
        ).subscribe();
    }
}
