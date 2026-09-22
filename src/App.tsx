import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { Channel, Category, Country } from './types';
import { INITIAL_FEATURED_CHANNELS } from './data/featuredChannels';
import { POPULAR_COUNTRIES } from './data/countries';
import { CountrySelector } from './components/CountrySelector';
import { OfflineIndicator } from './components/OfflineIndicator';
import { handleTvRemoteNavigation, focusElement } from './utils/tvNavigation';
import {
  Search,
  Radio,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Tv,
  Globe,
  ChevronDown,
  X,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
} from 'lucide-react';

const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>(INITIAL_FEATURED_CHANNELS);
  const [selectedCategory, setSelectedCategory] = useState<Category>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>('Please select a channel');
  const [statusText, setStatusText] = useState('Loading channels...');
  const [, setIsBuffering] = useState(false);

  // Auto-detect Smart TV for remote navigation
  const isTvMode = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return (
      ua.includes('smart-tv') ||
      ua.includes('smarttv') ||
      ua.includes('tizen') ||
      ua.includes('webos') ||
      ua.includes('googletv') ||
      ua.includes('android tv') ||
      ua.includes('apple tv') ||
      ua.includes('roku') ||
      ua.includes('viera') ||
      ua.includes('aft') ||
      ua.includes('netcast')
    );
  }, []);

  const [isTvActive, setIsTvActive] = useState<boolean>(isTvMode);
  const [channelNumberInput, setChannelNumberInput] = useState<string | null>(null);
  const channelNumberTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Country filtering states
  const [countries, setCountries] = useState<Country[]>(POPULAR_COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const selectedCountryRef = useRef<Country | null>(null);
  selectedCountryRef.current = selectedCountry;

  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);

  const globalChannelsRef = useRef<Channel[]>(INITIAL_FEATURED_CHANNELS);
  const countryCacheRef = useRef<Map<string, Channel[]>>(new Map());

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Background availability checking
  const checkChannelsInBackground = useCallback(async (channelList: Channel[]) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const batchSize = 10;
    let checkedCount = 0;

    for (let i = 0; i < channelList.length; i += batchSize) {
      const batch = channelList.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (ch) => {
          if (ch.status !== null) return;
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            await fetch(ch.url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
            clearTimeout(timer);
            setChannels((prev) =>
              prev.map((item) => (item.url === ch.url ? { ...item, status: true } : item))
            );
          } catch {
            setChannels((prev) =>
              prev.map((item) => (item.url === ch.url ? { ...item, status: false } : item))
            );
          }
          checkedCount++;
        })
      );

      if (checkedCount >= 300) break;
    }

    isCheckingRef.current = false;
  }, []);

  // Play a specific channel with HLS or Native HLS
  const playChannel = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    setOverlayMessage('Loading...');
    setIsBuffering(true);
    setIsPlaying(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set 8-second timeout for stream response
    timeoutRef.current = setTimeout(() => {
      setOverlayMessage((prev) => (prev === 'Loading...' ? 'Unavailable' : prev));
      setIsBuffering(false);
      setIsPlaying(false);
      setChannels((prev) =>
        prev.map((c) => (c.url === channel.url ? { ...c, status: false } : c))
      );
    }, 8000);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOverlayMessage(null);
        setIsBuffering(false);
        setIsPlaying(true);
        setChannels((prev) =>
          prev.map((c) => (c.url === channel.url ? { ...c, status: true } : c))
        );
        video.play().catch((err) => {
          console.warn('Autoplay blocked or user action needed:', err);
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setOverlayMessage('Unavailable');
          setIsBuffering(false);
          setIsPlaying(false);
          setChannels((prev) =>
            prev.map((c) => (c.url === channel.url ? { ...c, status: false } : c))
          );
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS support
      video.src = channel.url;
      const onLoaded = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOverlayMessage(null);
        setIsBuffering(false);
        setIsPlaying(true);
        setChannels((prev) =>
          prev.map((c) => (c.url === channel.url ? { ...c, status: true } : c))
        );
        video.play().catch(() => {
          setIsPlaying(false);
        });
        video.removeEventListener('loadedmetadata', onLoaded);
      };

      const onError = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOverlayMessage('Unavailable');
        setIsBuffering(false);
        setIsPlaying(false);
        setChannels((prev) =>
          prev.map((c) => (c.url === channel.url ? { ...c, status: false } : c))
        );
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    } else {
      setOverlayMessage('HLS streaming not supported in this browser');
      setIsBuffering(false);
      setIsPlaying(false);
    }
  }, []);

  // Filtered channels list based on Category and Search
  const filteredChannels = useMemo(() => {
    let list = channels;

    if (selectedCategory === 'news') {
      list = list.filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('news') ||
          n.includes('somoy') ||
          n.includes('independant') ||
          n.includes('jamuna') ||
          n.includes('24') ||
          n.includes('bbc') ||
          n.includes('cnn') ||
          n.includes('reuters') ||
          n.includes('al jazeera') ||
          n.includes('dw') ||
          n.includes('france')
        );
      });
    } else if (selectedCategory === 'sports') {
      list = list.filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('sport') ||
          n.includes('cricket') ||
          n.includes('football') ||
          n.includes('t sports') ||
          n.includes('ten') ||
          n.includes('espn') ||
          n.includes('fox') ||
          n.includes('red bull') ||
          n.includes('fight') ||
          n.includes('extreme')
        );
      });
    } else if (selectedCategory === 'entertainment') {
      list = list.filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('tv') ||
          n.includes('movie') ||
          n.includes('drama') ||
          n.includes('entertainment') ||
          n.includes('music') ||
          n.includes('show') ||
          n.includes('bangla') ||
          n.includes('hbo') ||
          n.includes('star') ||
          n.includes('rakuten') ||
          n.includes('cinema')
        );
      });
    } else if (selectedCategory === 'cartoon') {
      list = list.filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('cartoon') ||
          n.includes('kids') ||
          n.includes('disney') ||
          n.includes('nick') ||
          n.includes('pogo') ||
          n.includes('anime') ||
          n.includes('toon') ||
          n.includes('animation')
        );
      });
    }

    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      list = list.filter((c) => c.name.toLowerCase().includes(query));
    }

    return list;
  }, [channels, selectedCategory, searchQuery]);

  const displayList = useMemo(() => filteredChannels.slice(0, 500), [filteredChannels]);

  // Channel Next / Previous Navigation
  const handleNextChannel = useCallback(() => {
    if (displayList.length === 0) return;
    if (!currentChannel) {
      playChannel(displayList[0]);
      return;
    }
    const idx = displayList.findIndex((c) => c.url === currentChannel.url);
    const nextIdx = (idx + 1) % displayList.length;
    playChannel(displayList[nextIdx]);
  }, [displayList, currentChannel, playChannel]);

  const handlePrevChannel = useCallback(() => {
    if (displayList.length === 0) return;
    if (!currentChannel) {
      playChannel(displayList[displayList.length - 1]);
      return;
    }
    const idx = displayList.findIndex((c) => c.url === currentChannel.url);
    const prevIdx = (idx - 1 + displayList.length) % displayList.length;
    playChannel(displayList[prevIdx]);
  }, [displayList, currentChannel, playChannel]);

  // Player Play / Pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seamless Fullscreen Toggle:
  // Directly targets the video element so native player controls' fullscreen button
  // and the app's button stay 100% in sync without conflicting or trapping the user!
  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const isFs =
      Boolean(document.fullscreenElement) ||
      Boolean((document as any).webkitFullscreenElement) ||
      Boolean((document as any).mozFullScreenElement) ||
      Boolean((document as any).msFullscreenElement) ||
      Boolean((video as any).webkitDisplayingFullscreen);

    if (isFs) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
    } else {
      if (video.requestFullscreen) {
        video.requestFullscreen().catch(() => {
          // Fallback to container if browser blocks video-only fullscreen
          videoContainerRef.current?.requestFullscreen?.().catch(() => {});
        });
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if (videoContainerRef.current?.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(() => {});
      }
    }
  }, []);

  // Synchronize Fullscreen state across native events & browser controls
  useEffect(() => {
    const handleFsChange = () => {
      const isFs =
        Boolean(document.fullscreenElement) ||
        Boolean((document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    const video = videoRef.current;
    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video.addEventListener('webkitendfullscreen', handleWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
        video.removeEventListener('webkitendfullscreen', handleWebkitEnd);
      }
    };
  }, []);

  // Fetch initial global playlist data
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setStatusText('Loading channels from playlist...');
      try {
        const response = await fetch(PLAYLIST_URL);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.text();
        if (isCancelled) return;

        const lines = data.split('\n');
        const list: Channel[] = [];
        let currentName = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            const parts = line.split(',');
            if (parts.length > 1) {
              currentName = parts[parts.length - 1].trim();
            }
          } else if (line.startsWith('http')) {
            if (currentName) {
              if (!currentName.toLowerCase().includes('[geo-blocked]')) {
                list.push({ name: currentName, url: line, status: null });
              }
              currentName = '';
            }
          }
        }

        const map = new Map<string, Channel>();
        INITIAL_FEATURED_CHANNELS.forEach((c) => map.set(c.url, c));
        list.forEach((c) => {
          if (!map.has(c.url)) {
            map.set(c.url, c);
          }
        });

        const combinedList = Array.from(map.values());
        combinedList.sort((a, b) => a.name.localeCompare(b.name));

        if (!isCancelled) {
          globalChannelsRef.current = combinedList;
          setChannels((prev) => (selectedCountryRef.current ? prev : combinedList));
          setStatusText(`Loaded ${combinedList.length} channels.`);
          checkChannelsInBackground(combinedList);
        }
      } catch (err) {
        console.warn('Playlist parse error or fallback active:', err);
        if (!isCancelled) {
          globalChannelsRef.current = INITIAL_FEATURED_CHANNELS;
          setStatusText(`Loaded ${INITIAL_FEATURED_CHANNELS.length} verified channels.`);
          checkChannelsInBackground(INITIAL_FEATURED_CHANNELS);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [checkChannelsInBackground]);

  // Cleanup video and HLS on App unmount ONLY
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Fetch all countries list dynamically from IPTV-org API
  useEffect(() => {
    let isCancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch('https://iptv-org.github.io/api/countries.json');
        if (!response.ok) return;
        const data = await response.json();
        if (isCancelled || !Array.isArray(data) || data.length === 0) return;

        interface ApiCountry {
          name: string;
          code?: string;
          flag?: string;
          languages?: string[];
        }

        const apiCountries: Country[] = (data as ApiCountry[])
          .map((c) => ({
            name: c.name,
            code: (c.code || '').toLowerCase(),
            flag: c.flag || '🌐',
            languages: c.languages,
          }))
          .filter((c) => c.code && c.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(() => {
          const map = new Map<string, Country>();
          POPULAR_COUNTRIES.forEach((c) => map.set(c.code.toLowerCase(), c));
          apiCountries.forEach((c) => {
            if (!map.has(c.code.toLowerCase())) {
              map.set(c.code.toLowerCase(), c);
            }
          });
          return Array.from(map.values());
        });
      } catch (err) {
        console.warn('Could not fetch dynamic countries:', err);
      }
    }

    loadCountries();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle Country Selection
  const handleSelectCountry = useCallback(
    async (country: Country | null) => {
      setSelectedCountry(country);
      setSearchQuery('');

      if (!country) {
        setChannels(globalChannelsRef.current);
        setStatusText(`Loaded all ${globalChannelsRef.current.length} global channels.`);
        checkChannelsInBackground(globalChannelsRef.current);
        return;
      }

      const countryCode = country.code.toLowerCase();

      if (countryCacheRef.current.has(countryCode)) {
        const cached = countryCacheRef.current.get(countryCode)!;
        setChannels(cached);
        setStatusText(`Loaded ${cached.length} channels for ${country.flag || '🌐'} ${country.name}`);
        checkChannelsInBackground(cached);
        return;
      }

      setIsLoadingCountry(true);
      setStatusText(`Loading channels for ${country.flag || '🌐'} ${country.name}...`);

      try {
        const countryUrl = `https://iptv-org.github.io/iptv/countries/${countryCode}.m3u`;
        const response = await fetch(countryUrl);

        if (!response.ok) {
          throw new Error(`Country playlist not found (${response.status})`);
        }

        const data = await response.text();
        const lines = data.split('\n');
        const countryChannels: Channel[] = [];
        let currentName = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            const parts = line.split(',');
            if (parts.length > 1) {
              currentName = parts[parts.length - 1].trim();
            }
          } else if (line.startsWith('http')) {
            if (currentName) {
              if (!currentName.toLowerCase().includes('[geo-blocked]')) {
                countryChannels.push({
                  name: currentName,
                  url: line,
                  status: null,
                  country: country.name,
                });
              }
              currentName = '';
            }
          }
        }

        if (countryChannels.length > 0) {
          countryCacheRef.current.set(countryCode, countryChannels);
          setChannels(countryChannels);
          setStatusText(`Loaded ${countryChannels.length} channels for ${country.flag || '🌐'} ${country.name}`);
          checkChannelsInBackground(countryChannels);
        } else {
          const matched = globalChannelsRef.current.filter((c) =>
            c.name.toLowerCase().includes(country.name.toLowerCase())
          );
          if (matched.length > 0) {
            setChannels(matched);
            setStatusText(`Found ${matched.length} channels matching ${country.name}`);
          } else {
            setStatusText(`No online channels found in playlist for ${country.name}`);
          }
        }
      } catch (err) {
        console.warn(`Failed to load playlist for ${country.name}:`, err);
        const matched = globalChannelsRef.current.filter(
          (c) =>
            c.name.toLowerCase().includes(country.name.toLowerCase()) ||
            c.name.toLowerCase().includes(country.code.toLowerCase())
        );
        if (matched.length > 0) {
          setChannels(matched);
          setStatusText(`Loaded ${matched.length} channels matching ${country.name}`);
        } else {
          setStatusText(`Could not load channels for ${country.name}. Showing global channels.`);
          setChannels(globalChannelsRef.current);
        }
      } finally {
        setIsLoadingCountry(false);
      }
    },
    [checkChannelsInBackground]
  );

  // Handle Channel Number jumping with TV remote number keys (0-9)
  const handleChannelNumberKey = useCallback(
    (digit: string) => {
      setChannelNumberInput((prev) => {
        const nextNum = (prev || '') + digit;
        if (channelNumberTimeoutRef.current) clearTimeout(channelNumberTimeoutRef.current);
        channelNumberTimeoutRef.current = setTimeout(() => {
          const channelNum = parseInt(nextNum, 10);
          if (!isNaN(channelNum) && channelNum >= 1 && channelNum <= displayList.length) {
            const target = displayList[channelNum - 1];
            playChannel(target);
            focusElement(`channel-item-${channelNum - 1}`);
          }
          setChannelNumberInput(null);
        }, 1200);
        return nextNum;
      });
    },
    [displayList, playChannel]
  );

  // Global Keyboard & TV Remote Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // TV remote number key channel jumping (0-9)
      if (!isInput && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleChannelNumberKey(e.key);
        return;
      }

      // If user is typing inside an input field (Search Box or Country Search), let Backspace and text editing keys work naturally
      if (isInput) {
        if (e.key === 'Backspace' || e.keyCode === 8 || e.key === 'Delete') {
          return; // Allow native text deletion
        }
        if (e.key === 'Escape') {
          target.blur();
          return;
        }
      }

      const currIdx = currentChannel ? displayList.findIndex((c) => c.url === currentChannel.url) : 0;
      const handled = handleTvRemoteNavigation(e, {
        totalChannels: displayList.length,
        currentChannelIndex: currIdx >= 0 ? currIdx : 0,
        isCountryModalOpen,
        closeCountryModal: () => setIsCountryModalOpen(false),
        onNextChannel: handleNextChannel,
        onPrevChannel: handlePrevChannel,
        onTogglePlayPause: togglePlayPause,
        onToggleFullscreen: toggleFullscreen,
        isFullscreen,
        onSelectCategory: (cat) => setSelectedCategory(cat as Category),
        onResetCountry: () => handleSelectCountry(null),
      });

      if (handled) return;

      if (isInput) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'MediaPlayPause':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'N':
        case 'ChannelUp':
        case 'MediaTrackNext':
          e.preventDefault();
          handleNextChannel();
          break;
        case 'b':
        case 'B':
        case 'ChannelDown':
        case 'MediaTrackPrevious':
          e.preventDefault();
          handlePrevChannel();
          break;
        case '/':
          e.preventDefault();
          document.getElementById('searchBox')?.focus();
          break;
        case 'Escape':
          if (isCountryModalOpen) setIsCountryModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    displayList,
    currentChannel,
    isCountryModalOpen,
    handleNextChannel,
    handlePrevChannel,
    togglePlayPause,
    toggleFullscreen,
    isFullscreen,
    handleSelectCountry,
    handleChannelNumberKey,
  ]);

  // Auto-focus first channel for TV remote on initial load
  useEffect(() => {
    if (isTvActive && displayList.length > 0) {
      const active = document.activeElement;
      if (!active || active === document.body || active.id === 'dekhoo-app') {
        const timer = setTimeout(() => {
          focusElement('channel-item-0');
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isTvActive, displayList.length]);

  const handleGoHome = () => {
    setSearchQuery('');
    setSelectedCategory('home');
  };

  const quickCountries = useMemo(() => {
    return [
      { name: 'Bangladesh', code: 'bd', flag: '🇧🇩' },
      { name: 'India', code: 'in', flag: '🇮🇳' },
      { name: 'Pakistan', code: 'pk', flag: '🇵🇰' },
      { name: 'United States', code: 'us', flag: '🇺🇸' },
      { name: 'United Kingdom', code: 'gb', flag: '🇬🇧' },
      { name: 'Saudi Arabia', code: 'sa', flag: '🇸🇦' },
    ];
  }, []);

  return (
    <div
      id="dekhoo-app"
      className={`min-h-screen bg-[#0d1117] text-[#ffffff] flex flex-col p-4 md:p-6 font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif] ${
        isTvMode ? 'tv-mode' : ''
      }`}
    >
      {/* Header Wrapper: Exact original layout with Live TV & Sports Hub in place */}
      <div className="max-w-[1200px] mx-auto w-full flex flex-col">
        <header className="w-full flex flex-col mb-5 relative">
          <button
            id="dekhoo-brand-btn"
            type="button"
            onClick={handleGoHome}
            className="dekhoo-link text-left cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-90 self-start"
          >
            <h1 className="text-[#ff4757] text-4xl sm:text-5xl font-black m-0 tracking-[1.5px] leading-tight">
              Dekhoo
            </h1>
          </button>
          <div className="subtitle text-[#f1f2f6] w-full text-left sm:text-center text-lg sm:text-2xl font-bold tracking-[1px] mt-1 sm:-mt-10 pointer-events-none">
            Live TV & Sports Hub
          </div>
        </header>
      </div>

      {/* Navigation & Country Controls Bar */}
      <div className="max-w-[1200px] mx-auto w-full mb-5 flex flex-col gap-3">
        {/* Category Pills + Country Selector Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <nav
            aria-label="Channel Categories"
            className="category-nav flex gap-2 flex-wrap"
          >
            {(['home', 'news', 'sports', 'entertainment', 'cartoon'] as Category[]).map((cat) => {
              const labelMap: Record<Category, string> = {
                home: 'Home',
                news: 'News',
                sports: 'Sports',
                entertainment: 'Entertainment',
                cartoon: 'Kids Zone',
              };
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`cat-${cat}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[0.95rem] font-semibold transition-colors duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#ff4757] border-[#ff4757] text-white'
                      : 'bg-[#21262d] border-[#30363d] text-white hover:bg-[#ff4757] hover:border-[#ff4757]'
                  }`}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </nav>

          {/* Main Country Selector Button */}
          <div className="flex items-center gap-2">
            <button
              id="country-selector-btn"
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 cursor-pointer border flex items-center gap-2 shadow-md ${
                selectedCountry
                  ? 'bg-[#ff4757] border-[#ff4757] text-white ring-2 ring-[#ff4757]/30'
                  : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:border-[#ff4757] hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4 text-white" />
              <span>
                {selectedCountry
                  ? `${selectedCountry.flag || '🌐'} ${selectedCountry.name}`
                  : 'Select Country'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

        {/* Quick Country Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-[#8b949e] font-medium whitespace-nowrap mr-1 flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#ff4757]" /> Quick:
          </span>

          <button
            id="quick-country-all"
            type="button"
            onClick={() => handleSelectCountry(null)}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCountry === null
                ? 'bg-[#ff4757] border-[#ff4757] text-white'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            🌐 All Global
          </button>

          {quickCountries.map((qc) => {
            const isSelected = selectedCountry?.code.toLowerCase() === qc.code.toLowerCase();
            return (
              <button
                key={qc.code}
                id={`quick-country-${qc.code.toLowerCase()}`}
                type="button"
                onClick={() => handleSelectCountry(qc)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#ff4757] border-[#ff4757] text-white shadow-sm'
                    : 'bg-[#161b22] border-[#30363d] text-gray-300 hover:text-white hover:bg-[#21262d] hover:border-[#ff4757]/60'
                }`}
              >
                <span>{qc.flag}</span>
                <span>{qc.name}</span>
              </button>
            );
          })}

          <button
            id="quick-all-countries-modal"
            type="button"
            onClick={() => setIsCountryModalOpen(true)}
            className="px-2.5 py-1 rounded-md border border-dashed border-[#30363d] bg-[#161b22]/70 text-[#58a6ff] hover:text-white hover:border-[#58a6ff] text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
          >
            + All 190+ Countries
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="main-container flex flex-col lg:flex-row gap-5 max-w-[1200px] mx-auto flex-1 w-full">
        {/* Video Player Section */}
        <section id="player-section" className="flex-[2] min-w-[300px]">
          <div
            id="video-container"
            ref={videoContainerRef}
            className="relative bg-black rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.7)] w-full aspect-video flex items-center justify-center border border-[#30363d]/40"
          >
            {/* Player Overlays */}
            {overlayMessage && (
              <div
                id="overlay-msg"
                className="absolute inset-0 z-10 bg-black text-white text-lg sm:text-2xl font-bold flex flex-col items-center justify-center text-center p-5 gap-3"
              >
                {overlayMessage === 'Loading...' ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-10 h-10 text-[#ff4757] animate-spin" />
                    <span>Loading channel stream...</span>
                    <span className="text-xs font-normal text-[#8b949e]">Connecting to live HLS broadcast</span>
                  </div>
                ) : overlayMessage === 'Unavailable' ? (
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-12 h-12 text-[#ff4757]" />
                    <span>Stream Unavailable</span>
                    <p className="text-xs sm:text-sm font-normal text-[#8b949e] max-w-md">
                      This broadcast link is currently offline, rate-limited, or geo-restricted. Please select another channel or retry.
                    </p>
                    <div className="flex items-center gap-2">
                      {currentChannel && (
                        <button
                          id="btn-player-retry"
                          type="button"
                          onClick={() => playChannel(currentChannel)}
                          className="mt-1 inline-flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-white px-4 py-2 rounded-lg text-sm transition-colors border border-[#30363d]"
                        >
                          <RefreshCw className="w-4 h-4" /> Retry Stream
                        </button>
                      )}
                      <button
                        id="btn-player-retry-next"
                        type="button"
                        onClick={handleNextChannel}
                        className="mt-1 inline-flex items-center gap-2 bg-[#ff4757] hover:bg-[#ff6b81] text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Next Channel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#21262d] flex items-center justify-center text-[#ff4757] border border-[#30363d]">
                      <Tv className="w-7 h-7" />
                    </div>
                    <span>{overlayMessage}</span>
                    <p className="text-xs font-normal text-[#8b949e]">Select any channel from the list to start watching</p>
                  </div>
                )}
              </div>
            )}

            <video
              id="player"
              ref={videoRef}
              playsInline
              controls
              className="w-full h-full object-contain block bg-black"
            />
          </div>

          {/* Quick TV & Player Channel Controls Bar */}
          <div className="mt-3 p-2.5 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-[200px]">
              <Radio className="w-5 h-5 flex-shrink-0 text-[#2ed573] animate-pulse" />
              <div className="truncate">
                <span className="text-xs text-[#8b949e] block font-medium">Currently Playing:</span>
                <span className="text-sm sm:text-base font-bold text-[#2ed573] truncate block">
                  {currentChannel ? currentChannel.name : 'No channel selected'}
                </span>
              </div>
            </div>

            {/* Next / Previous Channel & Play controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="btn-player-prev"
                type="button"
                onClick={handlePrevChannel}
                title="Previous Channel (B or CH-)"
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <button
                id="btn-player-playpause"
                type="button"
                onClick={togglePlayPause}
                title="Play / Pause (Space)"
                className="p-2 rounded-lg bg-[#ff4757] hover:bg-[#ff6b81] text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                id="btn-player-next"
                type="button"
                onClick={handleNextChannel}
                title="Next Channel (N or CH+)"
                className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-player-fullscreen"
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] flex items-center justify-center cursor-pointer active:scale-95"
              >
                {isFullscreen ? <Minimize className="w-4 h-4 text-[#ff4757]" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div id="status" className="mt-2 text-[#f39c12] text-xs font-medium flex items-center gap-2">
            {isLoadingCountry && <RefreshCw className="w-3 h-3 animate-spin text-[#ff4757]" />}
            <span>{statusText}</span>
          </div>
        </section>

        {/* Sidebar Channel List & Search */}
        <aside
          id="sidebar"
          className="flex-1 min-w-[280px] bg-[#161b22] border border-[#30363d]/60 rounded-xl p-4 max-h-[580px] flex flex-col shadow-lg"
        >
          {/* Active Country Filter Badge */}
          {selectedCountry && (
            <div className="flex items-center justify-between bg-[#21262d] border border-[#ff4757]/40 rounded-lg px-3 py-1.5 mb-2.5 text-xs animate-in fade-in">
              <span className="flex items-center gap-1.5 font-semibold text-white truncate">
                <span className="text-base">{selectedCountry.flag || '🌐'}</span>
                <span className="truncate">{selectedCountry.name}</span>
                <span className="text-[#8b949e] font-normal">({filteredChannels.length} channels)</span>
              </span>
              <button
                id="reset-country-btn"
                type="button"
                onClick={() => handleSelectCountry(null)}
                className="text-[#ff4757] hover:text-[#ff6b81] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer ml-2 flex-shrink-0"
                title="Reset to all global channels"
              >
                <X className="w-3.5 h-3.5" />
                <span>All Countries</span>
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative mb-3">
            <input
              id="searchBox"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedCountry
                  ? `Search in ${selectedCountry.name}...`
                  : 'Search any channel...'
              }
              className="w-full p-3 pl-10 rounded-lg border border-[#30363d] bg-[#0d1117] text-white text-sm outline-none focus:border-[#ff4757] transition-colors"
            />
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b949e] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Channels List */}
          <div
            id="channelList"
            className="channel-list overflow-y-auto flex-grow pr-1 space-y-1.5"
          >
            {isLoadingCountry ? (
              <div className="text-center text-[#8b949e] py-12 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-7 h-7 text-[#ff4757] animate-spin" />
                <span>Loading channels for {selectedCountry?.name}...</span>
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center text-[#8b949e] py-8 text-sm flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-[#8b949e]" />
                <span>
                  {searchQuery
                    ? `No channels found for "${searchQuery}"`
                    : selectedCountry
                    ? `No channels found for ${selectedCountry.name}`
                    : 'No channels available'}
                </span>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#ff4757] underline hover:text-[#ff6b81]"
                  >
                    Clear search
                  </button>
                ) : selectedCountry ? (
                  <button
                    type="button"
                    onClick={() => handleSelectCountry(null)}
                    className="text-xs text-[#ff4757] underline hover:text-[#ff6b81]"
                  >
                    Show all countries
                  </button>
                ) : null}
              </div>
            ) : (
              displayList.map((channel, idx) => {
                const isCurrent = currentChannel?.url === channel.url;
                let dotClass = 'w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 bg-[#8b949e]';
                if (channel.status === true) {
                  dotClass = 'w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 bg-[#2ed573] shadow-[0_0_6px_#2ed573]';
                } else if (channel.status === false) {
                  dotClass = 'w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 bg-[#ff4757] shadow-[0_0_6px_#ff4757]';
                }

                return (
                  <button
                    key={channel.url}
                    id={`channel-item-${idx}`}
                    type="button"
                    tabIndex={0}
                    onClick={() => playChannel(channel)}
                    className={`channel-item w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-between gap-2 group min-h-[44px] border ${
                      isCurrent
                        ? 'bg-[#30363d] border-[#ff4757] text-[#ff4757]'
                        : 'bg-[#21262d] border-transparent hover:bg-[#30363d] hover:text-[#ff4757] text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs text-[#8b949e] font-mono w-5 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <Play
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${
                          isCurrent
                            ? 'text-[#ff4757] opacity-100'
                            : 'text-gray-400 opacity-40 group-hover:opacity-100'
                        }`}
                      />
                      <span className="channel-name truncate text-sm font-medium" title={channel.name}>
                        {channel.name}
                      </span>
                    </div>
                    <span
                      className={dotClass}
                      title={
                        channel.status === true
                          ? 'Online'
                          : channel.status === false
                          ? 'Offline/Error'
                          : 'Untested'
                      }
                    />
                  </button>
                );
              })
            )}

            {filteredChannels.length > 500 && (
              <div className="text-center text-[#8b949e] text-xs py-3 border-t border-[#30363d] mt-2">
                Showing first 500 of {filteredChannels.length} channels. Use search to find more.
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Smart TV Remote On-Screen Channel Number Jump Display */}
      {channelNumberInput && (
        <div className="fixed top-8 right-8 z-50 bg-black/90 border-2 border-[#ff4757] text-[#ff4757] px-6 py-3 rounded-2xl text-2xl sm:text-3xl font-black shadow-2xl flex items-center gap-3 animate-pulse">
          <Tv className="w-6 h-6 text-[#ff4757]" />
          <span>CH {channelNumberInput}</span>
        </div>
      )}

      {/* Country Selector Modal */}
      <CountrySelector
        countries={countries}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
      />

      {/* Footer: Exactly centered like before */}
      <footer className="text-center py-5 text-[#8b949e] text-sm tracking-[0.5px] border-t border-[#21262d] mt-8 font-bold">
        Powered By MUBIX
      </footer>

      {/* Offline Status Warning Indicator */}
      <OfflineIndicator />
    </div>
  );
}
