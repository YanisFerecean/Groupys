"use client";

import { useState, useRef, useEffect } from "react";
import { COUNTRIES } from "@/lib/countries";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get selected country info
  const selectedCountry = COUNTRIES.find((c) => c.name === value);

  // Filter countries based on search
  const filteredCountries = searchQuery.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COUNTRIES;

  const handleSelect = (countryName: string) => {
    onChange(countryName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <span className="text-base">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-on-surface-variant">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={handleClear}
              className="material-symbols-outlined text-base text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              close
            </span>
          )}
          <span
            className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-surface-container-high bg-surface shadow-md overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-container-high">
            <span className="material-symbols-outlined text-base text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-on-surface-variant"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="material-symbols-outlined text-base text-on-surface-variant hover:text-on-surface"
              >
                close
              </button>
            )}
          </div>

          {/* Country list */}
          <div className="max-h-60 overflow-y-auto">
            {/* No country option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors flex items-center gap-2 ${
                !value ? "bg-primary/5 text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-base">clear</span>
              No country
            </button>

            {/* Country options */}
            {filteredCountries.map((country, index) => (
              <button
                key={country.name}
                type="button"
                onClick={() => handleSelect(country.name)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors flex items-center gap-2 ${
                  index > 0 ? "border-t border-surface-container-high" : ""
                } ${value === country.name ? "bg-primary/5 text-primary" : ""}`}
              >
                <span className="text-base">{country.flag}</span>
                <span>{country.name}</span>
                {value === country.name && (
                  <span className="material-symbols-outlined text-base ml-auto">
                    check
                  </span>
                )}
              </button>
            ))}

            {/* No results */}
            {filteredCountries.length === 0 && (
              <div className="px-4 py-3 text-sm text-on-surface-variant text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
