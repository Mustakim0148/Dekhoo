import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Country } from '../types';
import { Globe, Search, X, Check } from 'lucide-react';

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: Country | null;
  onSelectCountry: (country: Country | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  countries,
  selectedCountry,
  onSelectCountry,
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase().trim();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  // Handle TV remote navigation inside Country Selector modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isBackKey =
        e.key === 'Escape' ||
        e.key === 'Back' ||
        e.key === 'GoBack' ||
        e.key === 'BrowserBack' ||
        e.keyCode === 27 ||
        e.keyCode === 461 ||
        e.keyCode === 10009;

      if (isBackKey) {
        e.preventDefault();
        onClose();
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const activeId = active?.id || '';

      // D-Pad Navigation inside modal
      if (e.key === 'ArrowDown') {
        if (activeId === 'countrySearchInput') {
          e.preventDefault();
          const allBtn = document.getElementById('btn-all-countries');
          if (allBtn) allBtn.focus();
        } else if (activeId === 'btn-all-countries') {
          e.preventDefault();
          const firstCountry = document.querySelector<HTMLElement>('.country-grid-item');
          if (firstCountry) {
            firstCountry.focus();
            firstCountry.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } else if (activeId.startsWith('country-opt-')) {
          const items = Array.from(document.querySelectorAll<HTMLElement>('.country-grid-item'));
          const currentIdx = items.indexOf(active!);
          if (currentIdx !== -1 && currentIdx < items.length - 1) {
            e.preventDefault();
            // In a 3-column or 2-column grid, move down by column or next item
            const cols = window.innerWidth >= 768 ? 3 : window.innerWidth >= 640 ? 2 : 1;
            const nextIdx = Math.min(items.length - 1, currentIdx + cols);
            items[nextIdx].focus();
            items[nextIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      } else if (e.key === 'ArrowUp') {
        if (activeId.startsWith('country-opt-')) {
          const items = Array.from(document.querySelectorAll<HTMLElement>('.country-grid-item'));
          const currentIdx = items.indexOf(active!);
          const cols = window.innerWidth >= 768 ? 3 : window.innerWidth >= 640 ? 2 : 1;
          if (currentIdx < cols) {
            e.preventDefault();
            const allBtn = document.getElementById('btn-all-countries');
            if (allBtn) allBtn.focus();
          } else if (currentIdx >= cols) {
            e.preventDefault();
            const prevIdx = currentIdx - cols;
            items[prevIdx].focus();
            items[prevIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } else if (activeId === 'btn-all-countries') {
          e.preventDefault();
          const searchInput = document.getElementById('countrySearchInput');
          if (searchInput) searchInput.focus();
        }
      } else if (e.key === 'ArrowRight') {
        if (activeId === 'countrySearchInput') {
          const input = active as HTMLInputElement;
          if (input.selectionStart === input.value.length) {
            e.preventDefault();
            const allBtn = document.getElementById('btn-all-countries');
            if (allBtn) allBtn.focus();
          }
        } else if (activeId.startsWith('country-opt-')) {
          const items = Array.from(document.querySelectorAll<HTMLElement>('.country-grid-item'));
          const currentIdx = items.indexOf(active!);
          if (currentIdx !== -1 && currentIdx < items.length - 1) {
            e.preventDefault();
            items[currentIdx + 1].focus();
            items[currentIdx + 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeId === 'btn-all-countries') {
          e.preventDefault();
          const searchInput = document.getElementById('countrySearchInput');
          if (searchInput) searchInput.focus();
        } else if (activeId.startsWith('country-opt-')) {
          const items = Array.from(document.querySelectorAll<HTMLElement>('.country-grid-item'));
          const currentIdx = items.indexOf(active!);
          if (currentIdx > 0) {
            e.preventDefault();
            items[currentIdx - 1].focus();
            items[currentIdx - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="country-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="country-modal-content"
        ref={containerRef}
        className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#ff4757]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white m-0 leading-tight">
                Select Country
              </h2>
              <p className="text-xs text-[#8b949e] m-0 mt-0.5">
                Browse and watch channels by country
              </p>
            </div>
          </div>
          <button
            id="close-country-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & All Countries Reset */}
        <div className="p-4 border-b border-[#30363d] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="countrySearchInput"
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country (e.g. Bangladesh, India, USA)..."
              className="w-full p-2.5 pl-9 rounded-lg border border-[#30363d] bg-[#0d1117] text-white text-sm outline-none focus:border-[#ff4757] transition-colors"
            />
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b949e] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <button
            id="btn-all-countries"
            type="button"
            onClick={() => {
              onSelectCountry(null);
              onClose();
            }}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-colors cursor-pointer whitespace-nowrap ${
              selectedCountry === null
                ? 'bg-[#ff4757] border-[#ff4757] text-white'
                : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>All Countries (Global)</span>
          </button>
        </div>

        {/* Country Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {filteredCountries.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[#8b949e] text-sm">
              No countries found matching &quot;{search}&quot;
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected = selectedCountry?.code.toLowerCase() === c.code.toLowerCase();
              return (
                <button
                  key={c.code}
                  id={`country-opt-${c.code.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    onSelectCountry(c);
                    onClose();
                  }}
                  className={`country-grid-item p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#ff4757]/15 border-[#ff4757] text-[#ff4757]'
                      : 'bg-[#0d1117] border-[#30363d] text-[#f0f6fc] hover:bg-[#21262d] hover:border-[#8b949e]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0 leading-none" role="img" aria-label={c.name}>
                      {c.flag || '🌐'}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {c.name}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 flex-shrink-0 text-[#ff4757]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#0d1117] border-t border-[#30363d] text-xs text-[#8b949e] flex items-center justify-between">
          <span>Showing {filteredCountries.length} countries</span>
        </div>
      </div>
    </div>
  );
};
