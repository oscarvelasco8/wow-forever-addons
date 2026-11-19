import type { CanDeactivateFn } from '@angular/router';
export const draftLeaveGuard: CanDeactivateFn<{ canLeave(): boolean }> = component => component.canLeave();
