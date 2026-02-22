import { useState, useRef, useEffect } from 'react'
import { searchFood, type FoodItem } from '@/lib/foodDatabase'

interface Props {
  value: string
  onChange: (name: string) => void
  onSelect: (food: FoodItem) => void
  placeholder?: string
}

export function FoodSearch({ value, onChange, onSelect, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<FoodItem[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // Update suggestions whenever value changes
  useEffect(() => {
    const results = searchFood(value)
    setSuggestions(results)
    setOpen(results.length > 0 && value.length > 0)
    setActiveIndex(-1)
  }, [value])

  // Scroll active item into view when navigating with keyboard
  useEffect(() => {
    if (activeIndex >= 0) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && suggestions.length > 0) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? -1 : i - 1))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0) {
        e.preventDefault()
        pick(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function pick(food: FoodItem) {
    onSelect(food)
    setOpen(false)
    setActiveIndex(-1)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'Search food…'}
          className="w-full border rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((food, i) => (
            <li
              key={food.name}
              ref={(el) => { itemRefs.current[i] = el }}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); pick(food) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors ${
                i === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/60'
              }`}
            >
              <div className="min-w-0">
                <span className="font-medium">{food.name}</span>
                <span className="text-xs text-muted-foreground ml-2 truncate">{food.serving}</span>
              </div>
              <span className="text-xs font-semibold text-primary ml-4 shrink-0">
                {food.calories} kcal
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
