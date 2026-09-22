import { Channel } from '../types';

export const INITIAL_FEATURED_CHANNELS: Channel[] = [
  // News
  {
    name: "Al Jazeera English HD",
    url: "https://live-hls-web-aje.getaj.net/AJE/03.m3u8",
    status: true,
    category: "news"
  },
  {
    name: "DW English HD",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    status: true,
    category: "news"
  },
  {
    name: "France 24 English",
    url: "https://stream.france24.com/hls/live/2037500/F24_EN_LO_HLS/master.m3u8",
    status: true,
    category: "news"
  },
  {
    name: "EuroNews English",
    url: "https://euronews-euronews-world-1-nl.samsung.wurl.tv/playlist.m3u8",
    status: true,
    category: "news"
  },
  {
    name: "ABC News Live (US)",
    url: "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8",
    status: true,
    category: "news"
  },
  {
    name: "Somoy TV Live",
    url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/bd.m3u",
    status: null,
    category: "news"
  },
  {
    name: "Jamuna TV News 24",
    url: "https://stream.jamuna.tv/hls/jamunatv.m3u8",
    status: null,
    category: "news"
  },
  {
    name: "Channel 24 Bangladesh",
    url: "https://stream.channel24bd.tv/live/channel24/playlist.m3u8",
    status: null,
    category: "news"
  },

  // Sports
  {
    name: "Red Bull TV Live Sports & Extreme",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    status: true,
    category: "sports"
  },
  {
    name: "Fight Sports TV Live",
    url: "https://fightsports-samsungau.amagi.tv/playlist.m3u8",
    status: true,
    category: "sports"
  },
  {
    name: "EDGE Sport Extreme HD",
    url: "https://edgesport-samsung-uk.amagi.tv/playlist.m3u8",
    status: true,
    category: "sports"
  },
  {
    name: "Motorvision TV Sports",
    url: "https://motorvision-rakuten.amagi.tv/playlist.m3u8",
    status: true,
    category: "sports"
  },
  {
    name: "T Sports Live HD",
    url: "https://live.tsports.com/hls/stream.m3u8",
    status: null,
    category: "sports"
  },
  {
    name: "Ten Sports Cricket Hub",
    url: "https://tensports.live/stream/playlist.m3u8",
    status: null,
    category: "sports"
  },

  // Entertainment
  {
    name: "NASA TV Media HD (Live)",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    status: true,
    category: "entertainment"
  },
  {
    name: "Rakuten TV Action Movies",
    url: "https://rakuten-actionmovies-1-eu.rakuten.wurl.tv/playlist.m3u8",
    status: true,
    category: "entertainment"
  },
  {
    name: "Drama Life TV",
    url: "https://dramalife-samsunguk.amagi.tv/playlist.m3u8",
    status: true,
    category: "entertainment"
  },
  {
    name: "Bangla TV UK & Europe",
    url: "https://cdn-globe.live/banglatv/index.m3u8",
    status: null,
    category: "entertainment"
  },
  {
    name: "Star Entertainment Global",
    url: "https://starentertainment.live/hls/stream.m3u8",
    status: null,
    category: "entertainment"
  },

  // Kids Zone / Cartoon
  {
    name: "Kids Pang Cartoon TV",
    url: "https://kidspang-samsung-nz.amagi.tv/playlist.m3u8",
    status: true,
    category: "cartoon"
  },
  {
    name: "Toon Goggles Animated Cartoons",
    url: "https://tgtoonscartoons-samsunguk.amagi.tv/playlist.m3u8",
    status: true,
    category: "cartoon"
  },
  {
    name: "Duck TV Kids Learning & Fun",
    url: "https://ducktv-samsung-uk.amagi.tv/playlist.m3u8",
    status: true,
    category: "cartoon"
  },
  {
    name: "Disney Kids & Family Stories",
    url: "https://familykids-stream.amagi.tv/playlist.m3u8",
    status: null,
    category: "cartoon"
  },
  {
    name: "Pogo Kids Hindi Toons",
    url: "https://pogotoons.live/stream.m3u8",
    status: null,
    category: "cartoon"
  },
  {
    name: "Anime All Day TV",
    url: "https://anime-samsung-uk.amagi.tv/playlist.m3u8",
    status: true,
    category: "cartoon"
  }
];
