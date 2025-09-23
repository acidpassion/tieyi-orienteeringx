import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const StudentAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Search for a student...",
  required = false,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize selected student from value prop
  useEffect(() => {
    if (value && value.name && value.studentId) {
      setSelectedStudent(value);
      setSearchTerm(value.name);
    } else {
      setSelectedStudent(null);
      setSearchTerm('');
    }
  }, [value]);

  // Search students when search term changes
  useEffect(() => {
    const searchStudents = async () => {
      if (searchTerm.trim().length < 1) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/students/search?name=${encodeURIComponent(searchTerm)}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        } else {
          console.error('Failed to search students');
          setStudents([]);
        }
      } catch (error) {
        console.error('Error searching students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // If user is typing and it doesn't match selected student, clear selection
    if (selectedStudent && newValue !== selectedStudent.name) {
      setSelectedStudent(null);
      onChange({ studentId: '', name: '' });
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchTerm(student.name);
    setIsOpen(false);
    onChange({ 
      studentId: student._id, 
      name: student.name 
    });
  };

  const handleClear = () => {
    setSelectedStudent(null);
    setSearchTerm('');
    setStudents([]);
    setIsOpen(false);
    onChange({ studentId: '', name: '' });
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedStudent ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-1">
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              )}
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (searchTerm.length >= 1 || students.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Searching...
            </div>
          ) : students.length > 0 ? (
            students.map((student) => (
              <button
                key={student._id}
                type="button"
                onClick={() => handleStudentSelect(student)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{student.name}</span>
                  <span className="text-sm text-gray-500">
                    {student.class ? `${student.grade}${student.class}班` : student.grade}
                  </span>
                </div>
              </button>
            ))
          ) : searchTerm.length >= 1 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No students found matching "{searchTerm}"
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Type at least 1 character to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAutocomplete;