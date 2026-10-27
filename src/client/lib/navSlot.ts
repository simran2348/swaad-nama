import { createContext } from 'react';

/**
 * A spot just above the bottom nav. Screens portal an action bar into it
 * (e.g. "Add to tier") so it sits on top of the nav, outside the scroll area.
 */
export const NavSlotContext = createContext<HTMLElement | null>(null);

/** Shared by the nav and bars in the slot, so they line up. */
export const NAV_HEIGHT = 'h-16';
