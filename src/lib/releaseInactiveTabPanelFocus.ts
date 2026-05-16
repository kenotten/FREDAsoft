/**
 * Blur focus when it remains inside a tab panel that is not the active tab.
 * Prevents "Blocked aria-hidden on an element because its descendant retained focus".
 */
export function releaseInactiveTabPanelFocus(activeTab: string): void {
  document.querySelectorAll<HTMLElement>('[data-tab-panel]').forEach((panel) => {
    const panelTab = panel.getAttribute('data-tab-panel');
    if (!panelTab || panelTab === activeTab) return;

    const focused = document.activeElement;
    if (focused instanceof HTMLElement && panel.contains(focused)) {
      focused.blur();
    }
  });
}
