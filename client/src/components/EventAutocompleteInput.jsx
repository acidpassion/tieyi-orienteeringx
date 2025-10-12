import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const EventAutocompleteInput = ({ 
  value, 
  onChange, 
  placeholder = "搜索比赛名称", 
  className = '',
  events = [],
  required = false,
  disabled = false
}) => {
  const { isDarkMode } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [displayCount, setDisplayCount] = useState(10); // Number of items to display
  const [allFilteredEvents, setAllFilteredEvents] = useState([]); // Store all filtered events
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Filter events to show only those starting within this year
  const filterEventsByYear = (events) => {
    const currentYear = new Date().getFullYear();
    return events.filter(event => {
      const eventYear = new Date(event.startDate).getFullYear();
      return eventYear === currentYear;
    });
  };

  // Helper function to get event status with consistent date handling
  const getEventStatus = (startDate, endDate, referenceDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (referenceDate < start) return 'future';
    if (referenceDate > end) return 'past';
    return 'current';
  };

  // Sort events by date proximity to today (current/closest first, then future, then past)
  const sortEventsByDateProximity = (events) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return [...events].sort((a, b) => {
      const statusA = getEventStatus(a.startDate, a.endDate, today);
      const statusB = getEventStatus(b.startDate, b.endDate, today);
      
      // Priority order: current > future > past
      const statusPriority = { current: 0, future: 1, past: 2 };
      const priorityA = statusPriority[statusA];
      const priorityB = statusPriority[statusB];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same status, sort by date proximity to today
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      
      if (statusA === 'current') {
        // For current events, sort by start date ascending (started earliest first)
        return dateA - dateB;
      } else if (statusA === 'future') {
        // For future events, sort by start date ascending (closest to today first)
        return dateA - dateB;
      } else {
        // For past events, sort by end date descending (most recently ended first)
        const endDateA = new Date(a.endDate);
        const endDateB = new Date(b.endDate);
        return endDateB - endDateA;
      }
    });
  };

  // Filter and sort all events, store in state
  const filterAndSortEvents = (searchTerm, count = displayCount) => {
    // First filter by current year
    const currentYearEvents = filterEventsByYear(events);
    
    let filtered;
    if (!searchTerm || searchTerm.trim().length === 0) {
      // Show all events from this year sorted by date proximity to today
      filtered = sortEventsByDateProximity(currentYearEvents);
    } else {
      const searchFiltered = currentYearEvents.filter(event => {
        // Use 'eventName' property as that's what the API returns
        const eventName = event.eventName || event.name || event.title || '';
        const organization = event.organization || '';
        
        // Search in both event name and organization
        return (eventName && eventName.toLowerCase().includes(searchTerm.toLowerCase())) ||
               (organization && organization.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      
      filtered = sortEventsByDateProximity(searchFiltered);
    }
    
    console.log('Filtered events:', filtered.map(e => ({
      name: e.eventName,
      org: e.organization,
      start: e.startDate,
      end: e.endDate,
      status: getDateStatus(e.startDate, e.endDate)
    })));
    
    setAllFilteredEvents(filtered);
    return filtered.slice(0, count);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Reset display count and update suggestions
    const newDisplayCount = 10;
    setDisplayCount(newDisplayCount);
    const filteredEvents = filterAndSortEvents(newValue, newDisplayCount);
    setSuggestions(filteredEvents);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleInputFocus = () => {
    const newDisplayCount = 10;
    setDisplayCount(newDisplayCount);
    setSelectedIndex(-1);
    const filteredEvents = filterAndSortEvents(inputValue, newDisplayCount);
    setSuggestions(filteredEvents);
    setShowSuggestions(true);
  };

  // Handle scroll to load more items
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    if (isNearBottom && suggestions.length < allFilteredEvents.length) {
      const newDisplayCount = Math.min(displayCount + 10, allFilteredEvents.length);
      setDisplayCount(newDisplayCount);
      setSuggestions(allFilteredEvents.slice(0, newDisplayCount));
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (event) => {
    const eventName = event.eventName || event.name || event.title || '';
    setInputValue(eventName);
    onChange(eventName);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // Handle clear button click
  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear input and reset states
    setInputValue('');
    onChange('');
    setSelectedIndex(-1);
    
    // Reset display count and get fresh events
    const newDisplayCount = 10;
    setDisplayCount(newDisplayCount);
    
    // Force refresh of all events by calling filterAndSortEvents with empty string and new count
    console.log('Clearing input, total events:', events.length);
    const allEvents = filterAndSortEvents('', newDisplayCount);
    console.log('After clear, filtered events:', allEvents.length);
    setSuggestions(allEvents);
    setShowSuggestions(true);
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Select current highlighted suggestion
  const selectCurrentSuggestion = () => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      handleSuggestionClick(suggestions[selectedIndex]);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(nextIndex);
        
        // Auto-load more items if navigating near the end
        if (nextIndex >= suggestions.length - 3 && suggestions.length < allFilteredEvents.length) {
          const newDisplayCount = Math.min(displayCount + 10, allFilteredEvents.length);
          setDisplayCount(newDisplayCount);
          setSuggestions(allFilteredEvents.slice(0, newDisplayCount));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        selectCurrentSuggestion();
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Update suggestions when events change
  useEffect(() => {
    if (showSuggestions) {
      const newDisplayCount = 10;
      setDisplayCount(newDisplayCount);
      const filteredEvents = filterAndSortEvents(inputValue, newDisplayCount);
      setSuggestions(filteredEvents);
    }
  }, [events]);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // Get date status (past, current, future)
  const getDateStatus = (startDate, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getEventStatus(startDate, endDate, today);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-10 ${inputValue ? 'pr-10' : 'pr-3'} ${className}`}
          required={required}
          disabled={disabled}
        />
        {/* Clear button - only show when there's text */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          onScroll={handleScroll}
          className={`absolute z-10 w-full mt-1 ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          } border rounded-md shadow-lg max-h-60 overflow-y-auto`}
        >
          {suggestions.map((event, index) => {
            const isSelected = index === selectedIndex;
            const dateStatus = getDateStatus(event.startDate, event.endDate);
            
            return (
              <div
                key={event._id}
                onClick={() => handleSuggestionClick(event)}
                className={`px-4 py-3 cursor-pointer border-b last:border-b-0 ${
                  isSelected 
                    ? (isDarkMode ? 'bg-blue-700' : 'bg-blue-100') 
                    : (isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-gray-100 border-gray-100')
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {event.eventName || event.name || event.title || 'Unnamed Event'}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {event.organization && (
                        <span className="font-medium">{event.organization} • </span>
                      )}
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </div>
                    {event.location && (
                      <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                  <div className="ml-2">
                    {dateStatus === 'current' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        进行中
                      </span>
                    )}
                    {dateStatus === 'future' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        未开始
                      </span>
                    )}
                    {dateStatus === 'past' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        已结束
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Load more indicator */}
          {suggestions.length < allFilteredEvents.length && (
            <div className={`px-4 py-2 text-center text-sm ${
              isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
            } border-t`}>
              向下滚动加载更多... ({suggestions.length}/{allFilteredEvents.length})
            </div>
          )}
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && Array.isArray(suggestions) && suggestions.length === 0 && inputValue.trim() && (
        <div 
          ref={suggestionsRef}
          className={`absolute z-10 w-full mt-1 ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          } border rounded-md shadow-lg`}
        >
          <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            未找到匹配的比赛
          </div>
        </div>
      )}
    </div>
  );
};

export default EventAutocompleteInput;