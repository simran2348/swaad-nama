import { createContext } from 'react';

/**
 * A layer over the bottom nav. Screens portal an action bar into it
 * (e.g. "Add to tier") to cover the nav while it shows.
 */
export const NavSlotContext = createContext<HTMLElement | null>(null);

/** Shared by the nav and bars in the slot, so they line up. */
export const NAV_HEIGHT = 'h-16';
