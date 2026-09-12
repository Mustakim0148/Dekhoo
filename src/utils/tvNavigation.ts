export function focusElement(
  target: HTMLElement | string | null | undefined,
  scrollBlock: ScrollLogicalPosition = 'nearest'
): boolean {
  if (!target) return false;
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return false;

  el.focus();
  try {
    el.scrollIntoView({ block: scrollBlock, inline: 'nearest', behavior: 'smooth' });
  } catch {
    el.scrollIntoView();
  }
  return true;
}

export interface SpatialNavigationOptions {
  totalChannels: number;
  currentChannelIndex: number;
  isCountryModalOpen: boolean;
  closeCountryModal: () => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  onTogglePlayPause: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onSelectCategory?: (category: string) => void;
  onResetCountry?: () => void;
  onChannelNumberJump?: (channelNum: number) => void;
}

// Categories list in visual tab order
const CATEGORY_IDS = [
  'dekhoo-brand-btn',
  'cat-home',
  'cat-news',
  'cat-sports',
  'cat-entertainment',
  'cat-cartoon',
  'country-selector-btn',
];

// Quick country buttons in visual bar order
const QUICK_COUNTRY_IDS = [
  'quick-country-all',
  'quick-country-bd',
  'quick-country-in',
  'quick-country-pk',
  'quick-country-us',
  'quick-country-gb',
  'quick-country-sa',
  'quick-all-countries-modal',
];

// Player controls in visual horizontal order
const PLAYER_CONTROL_IDS = [
  'btn-player-prev',
  'btn-player-playpause',
  'btn-player-next',
  'btn-player-fullscreen',
];

/**
 * Spatial Navigation Handler for TV Remotes & Keyboard Navigation
 * Handles Up, Down, Left, Right, OK, Back, ChannelUp/Down, Color buttons, and Number keys.
 */
export function handleTvRemoteNavigation(
  e: KeyboardEvent,
  options: SpatialNavigationOptions
): boolean {
  const {
    totalChannels,
    currentChannelIndex,
    isCountryModalOpen,
    closeCountryModal,
    onNextChannel,
    onPrevChannel,
    onTogglePlayPause,
    onToggleFullscreen,
    isFullscreen,
    onSelectCategory,
    onResetCountry,
  } = options;

  const key = e.key;
  const keyCode = e.keyCode;

  // 1. Detect Back / Return button (Escape, Android Back, Tizen 10009, WebOS 461)
  const isBackKey =
    key === 'Escape' ||
    key === 'Back' ||
    key === 'GoBack' ||
    key === 'BrowserBack' ||
    keyCode === 27 ||
    keyCode === 461 ||
    keyCode === 10009 ||
    keyCode === 8;

  // 2. Detect Color buttons on Smart TV remotes
  // Red = Home, Green = Sports, Yellow = News, Blue = Kids Zone
  if (
    key === 'ColorF0Red' ||
    key === 'Red' ||
    keyCode === 403
  ) {
    e.preventDefault();
    onSelectCategory?.('home');
    focusElement('cat-home');
    return true;
  }
  if (
    key === 'ColorF1Green' ||
    key === 'Green' ||
    keyCode === 404
  ) {
    e.preventDefault();
    onSelectCategory?.('sports');
    focusElement('cat-sports');
    return true;
  }
  if (
    key === 'ColorF2Yellow' ||
    key === 'Yellow' ||
    keyCode === 405
  ) {
    e.preventDefault();
    onSelectCategory?.('news');
    focusElement('cat-news');
    return true;
  }
  if (
    key === 'ColorF3Blue' ||
    key === 'Blue' ||
    keyCode === 406
  ) {
    e.preventDefault();
    onSelectCategory?.('cartoon');
    focusElement('cat-cartoon');
    return true;
  }

  // 3. Detect Media & Channel buttons on Smart TV remotes
  if (
    key === 'ChannelUp' ||
    key === 'MediaTrackNext' ||
    key === 'PageUp' ||
    keyCode === 33 ||
    keyCode === 427
  ) {
    e.preventDefault();
    onNextChannel();
    return true;
  }
  if (
    key === 'ChannelDown' ||
    key === 'MediaTrackPrevious' ||
    key === 'PageDown' ||
    keyCode === 34 ||
    keyCode === 428
  ) {
    e.preventDefault();
    onPrevChannel();
    return true;
  }
  if (
    key === 'MediaPlayPause' ||
    key === 'MediaPlay' ||
    key === 'MediaPause' ||
    keyCode === 179 ||
    keyCode === 415 ||
    keyCode === 19
  ) {
    e.preventDefault();
    onTogglePlayPause();
    return true;
  }

  // 4. Back Key Handling
  if (isBackKey) {
    if (isCountryModalOpen) {
      e.preventDefault();
      closeCountryModal();
      focusElement('country-selector-btn');
      return true;
    }
    if (isFullscreen) {
      e.preventDefault();
      onToggleFullscreen();
      return true;
    }
    // If inside search input, blur it
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.id === 'searchBox' || active.tagName === 'INPUT')) {
      e.preventDefault();
      active.blur();
      focusElement(`channel-item-${Math.max(0, currentChannelIndex)}`);
      return true;
    }
    return false;
  }

  // 5. Fullscreen Mode Navigation:
  // When watching in fullscreen, arrow keys navigate channels or toggle playback
  if (isFullscreen) {
    if (key === 'ArrowDown' || key === 'ArrowRight') {
      e.preventDefault();
      onNextChannel();
      return true;
    }
    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      onPrevChannel();
      return true;
    }
    if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      onTogglePlayPause();
      return true;
    }
    return false;
  }

  // If Country modal is open, let modal handle inner arrows unless it needs default
  if (isCountryModalOpen) {
    return false;
  }

  // 6. Directional Arrow Keys in Normal Dual-Pane Mode
  const isArrowKey =
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight';

  if (!isArrowKey) {
    return false;
  }

  const active = document.activeElement as HTMLElement | null;

  // Case A: Nothing focused or body is focused
  // Automatically focus current playing channel or channel-item-0
  if (!active || active === document.body || active.id === 'dekhoo-app') {
    e.preventDefault();
    const targetChannelIdx = currentChannelIndex >= 0 ? currentChannelIndex : 0;
    if (focusElement(`channel-item-${targetChannelIdx}`)) {
      return true;
    }
    focusElement('cat-home');
    return true;
  }

  const activeId = active.id || '';

  // Case B: Focused on a Channel Item in the sidebar
  if (activeId.startsWith('channel-item-')) {
    const currentIdx = parseInt(activeId.replace('channel-item-', ''), 10);
    if (!isNaN(currentIdx)) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        if (currentIdx < totalChannels - 1) {
          focusElement(`channel-item-${currentIdx + 1}`);
        }
        return true;
      }

      if (key === 'ArrowUp') {
        e.preventDefault();
        if (currentIdx > 0) {
          focusElement(`channel-item-${currentIdx - 1}`);
        } else {
          // At the top of the channel list: move up to Reset Country or Search box
          const resetBtn = document.getElementById('reset-country-btn');
          if (resetBtn) {
            focusElement(resetBtn);
          } else {
            focusElement('searchBox');
          }
        }
        return true;
      }

      if (key === 'ArrowLeft') {
        // Move across from Channel list to the Player controls!
        e.preventDefault();
        focusElement('btn-player-playpause');
        return true;
      }

      if (key === 'ArrowRight') {
        // Stay in list or keep focused
        return true;
      }
    }
  }

  // Case C: Focused on Search Input
  if (activeId === 'searchBox') {
    if (key === 'ArrowDown') {
      e.preventDefault();
      active.blur();
      focusElement('channel-item-0');
      return true;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      active.blur();
      focusElement('quick-country-all');
      return true;
    }
    if (key === 'ArrowLeft') {
      const input = active as HTMLInputElement;
      if (!input.value || input.selectionStart === 0) {
        e.preventDefault();
        active.blur();
        focusElement('btn-player-playpause');
        return true;
      }
    }
    return false;
  }

  // Case D: Focused on Reset Country button
  if (activeId === 'reset-country-btn') {
    if (key === 'ArrowDown') {
      e.preventDefault();
      focusElement('channel-item-0');
      return true;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      focusElement('searchBox');
      return true;
    }
    if (key === 'ArrowLeft') {
      e.preventDefault();
      focusElement('btn-player-fullscreen');
      return true;
    }
  }

  // Case E: Focused in Player Controls Bar
  if (PLAYER_CONTROL_IDS.includes(activeId) || activeId === 'btn-player-retry') {
    const ctrlIndex = PLAYER_CONTROL_IDS.indexOf(activeId);

    if (key === 'ArrowRight') {
      e.preventDefault();
      if (ctrlIndex >= 0 && ctrlIndex < PLAYER_CONTROL_IDS.length - 1) {
        focusElement(PLAYER_CONTROL_IDS[ctrlIndex + 1]);
      } else {
        // From right-most player button (Fullscreen), jump into the Channel List!
        const targetIdx = currentChannelIndex >= 0 ? currentChannelIndex : 0;
        if (!focusElement(`channel-item-${targetIdx}`)) {
          focusElement('searchBox');
        }
      }
      return true;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (ctrlIndex > 0) {
        focusElement(PLAYER_CONTROL_IDS[ctrlIndex - 1]);
      } else if (activeId === 'btn-player-retry') {
        focusElement('btn-player-playpause');
      }
      return true;
    }

    if (key === 'ArrowUp') {
      e.preventDefault();
      // Move up to the Quick Country bar or Category pills
      focusElement('quick-country-all');
      return true;
    }

    if (key === 'ArrowDown') {
      // Check if retry button exists on stream failure
      const retryBtn = document.getElementById('btn-player-retry');
      if (retryBtn && activeId !== 'btn-player-retry') {
        e.preventDefault();
        focusElement(retryBtn);
        return true;
      }
      return true;
    }
  }

  // Case F: Focused in Category Navigation Tabs
  if (CATEGORY_IDS.includes(activeId)) {
    const catIndex = CATEGORY_IDS.indexOf(activeId);

    if (key === 'ArrowRight') {
      e.preventDefault();
      if (catIndex < CATEGORY_IDS.length - 1) {
        focusElement(CATEGORY_IDS[catIndex + 1]);
      } else {
        focusElement(CATEGORY_IDS[0]); // wrap around
      }
      return true;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (catIndex > 0) {
        focusElement(CATEGORY_IDS[catIndex - 1]);
      } else {
        focusElement(CATEGORY_IDS[CATEGORY_IDS.length - 1]); // wrap around
      }
      return true;
    }

    if (key === 'ArrowDown') {
      e.preventDefault();
      // If at country selector button, go to searchBox; otherwise go to quick country bar
      if (activeId === 'country-selector-btn') {
        focusElement('searchBox');
      } else {
        focusElement('quick-country-all');
      }
      return true;
    }

    if (key === 'ArrowUp') {
      e.preventDefault();
      focusElement('dekhoo-brand-btn');
      return true;
    }
  }

  // Case G: Focused in Quick Country Bar
  if (QUICK_COUNTRY_IDS.includes(activeId)) {
    const qcIndex = QUICK_COUNTRY_IDS.indexOf(activeId);

    if (key === 'ArrowRight') {
      e.preventDefault();
      if (qcIndex < QUICK_COUNTRY_IDS.length - 1) {
        focusElement(QUICK_COUNTRY_IDS[qcIndex + 1]);
      }
      return true;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (qcIndex > 0) {
        focusElement(QUICK_COUNTRY_IDS[qcIndex - 1]);
      }
      return true;
    }

    if (key === 'ArrowUp') {
      e.preventDefault();
      focusElement('cat-home');
      return true;
    }

    if (key === 'ArrowDown') {
      e.preventDefault();
      if (qcIndex >= 4) {
        focusElement('searchBox');
      } else {
        focusElement('btn-player-playpause');
      }
      return true;
    }
  }

  return false;
}
