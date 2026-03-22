'use client';

import { createContext, useContext } from 'react';

export const MobileSidebarOpenContext = createContext(false);

export function useMobileSidebarOpen() {
  return useContext(MobileSidebarOpenContext);
}
