import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Palette } from 'lucide-react';

const DifficultyGradeDialog = ({ isOpen, mode, data, onSubmit, onClose, isDarkMode, existingGrades = [] }) => {
  const [formData, setFormData] = useState({
    number: '',
    color: '#3B82F6',
    level: '',
    skill: [''],
    matchingEventType: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          number: data.number || '',
          color: data.color || '#3B82F6',
          level: data.level || '',
          skill: data.skill && data.skill.length > 0 ? [...data.skill] : [''],
          matchingEventType: data.matchingEventType || ''
        });
      } else {
        setFormData({
          number: '',
          color: '#3B82F6',
          level: '',
          skill: [''],
          matchingEventType: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, data]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.number || formData.number < 1) {
      newErrors.number = '等级编号必须大于0';
    } else {
      // Check for duplicate numbers
      const currentIndex = data?.index;
      const numberExists = existingGrades.some((grade, index) => 
        (mode === 'create' || index !== currentIndex) &&
        grade.number === parseInt(formData.number)
      );
      
      if (numberExists) {
        newErrors.number = '该等级编号已存在';
      }
    }

    if (!formData.level.trim()) {
      newErrors.level = '等级名称不能为空';
    } else {
      // Check for duplicate level names (case-insensitive)
      const currentIndex = data?.index;
      const levelExists = existingGrades.some((grade, index) => 
        (mode === 'create' || index !== currentIndex) &&
        grade.level.toLowerCase() === formData.level.trim().toLowerCase()
      );
      
      if (levelExists) {
        newErrors.level = '该等级名称已存在';
      }
    }

    if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = '请选择有效的颜色';
    }

    const validSkills = formData.skill.filter(skill => skill.trim());
    if (validSkills.length === 0) {
      newErrors.skill = '至少需要一个技能要求';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      number: parseInt(formData.number),
      skill: formData.skill.filter(skill => skill.trim()),
      level: formData.level.trim(),
      matchingEventType: formData.matchingEventType.trim()
    };

    onSubmit(submitData);
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skill: [...prev.skill, '']
    }));
  };

  const updateSkill = (index, value) => {
    setFormData(prev => ({
      ...prev,
      skill: prev.skill.map((skill, i) => i === index ? value : skill)
    }));
  };

  const removeSkill = (index) => {
    if (formData.skill.length > 1) {
      setFormData(prev => ({
        ...prev,
        skill: prev.skill.filter((_, i) => i !== index)
      }));
    }
  };

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? '添加难度等级' : '编辑难度等级'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Grade Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              等级编号 *
            </label>
            <input
              type="number"
              min="1"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.number 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="输入等级编号"
            />
            {errors.number && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.number}</p>
            )}
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              等级名称 *
            </label>
            <input
              type="text"
              value={formData.level}
              onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.level 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="例如：初级、中级、高级"
            />
            {errors.level && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.level}</p>
            )}
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              等级颜色 *
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: formData.color }}
                ></div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="#3B82F6"
                />
              </div>
              
              {/* Predefined Colors */}
              <div className="flex flex-wrap gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.color === color 
                        ? 'border-gray-800 dark:border-white' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {errors.color && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.color}</p>
            )}
          </div>

          {/* Matching Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              匹配赛事类型
            </label>
            <input
              type="text"
              value={formData.matchingEventType}
              onChange={(e) => setFormData(prev => ({ ...prev, matchingEventType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例如：速度攀岩、难度攀岩"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              技能要求 *
            </label>
            <div className="space-y-2">
              {formData.skill.map((skill, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入技能要求"
                  />
                  {formData.skill.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus className="h-4 w-4" />
                <span>添加技能要求</span>
              </button>
            </div>
            {errors.skill && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.skill}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {mode === 'create' ? '添加' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DifficultyGradeDialog;