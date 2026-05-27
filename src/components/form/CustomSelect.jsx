import { useEffect, useMemo, useRef, useState } from "react";

export default function CustomSelect({
  ariaLabel = "Избор",
  disabled = false,
  onChange,
  options = [],
  placeholder = "",
  searchPlaceholder = "Търси...",
  searchThreshold = 8,
  value = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selectRef = useRef(null);
  const shouldShowSearch = options.length >= searchThreshold;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value],
  );
  const buttonLabel = selectedOption?.label || placeholder;
  const visibleOptions = useMemo(
    () => (
      normalizedSearchQuery
        ? options.filter((option) => String(option.label || "").toLowerCase().includes(normalizedSearchQuery))
        : options
    ),
    [normalizedSearchQuery, options],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnOutsideClick(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function chooseOption(option) {
    if (disabled || option.disabled) {
      return;
    }

    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <div className={`custom-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`} ref={selectRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => {
          if (!isOpen) {
            setSearchQuery("");
          }

          setIsOpen((current) => !current);
        }}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span>{buttonLabel}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {shouldShowSearch && (
            <div className="custom-select-search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`${ariaLabel} - търсене`}
                autoFocus
              />
            </div>
          )}

          {visibleOptions.length > 0 ? visibleOptions.map((option) => (
            <button
              type="button"
              className={`custom-select-option${String(option.value) === String(value) && !option.disabled ? " is-selected" : ""}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              disabled={option.disabled}
              role="option"
              aria-selected={String(option.value) === String(value)}
            >
              {option.label}
            </button>
          )) : (
            <span className="custom-select-empty">Няма намерени резултати</span>
          )}
        </div>
      )}
    </div>
  );
}
