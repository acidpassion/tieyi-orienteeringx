import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Calendar,
  Trophy,
  Users,
  Target,
  Building
} from 'lucide-react';
import axios from '../config/axiosConfig';
import { createApiUrl } from '../config/api';
import DifficultyGradeDialog from '../components/DifficultyGradeDialog';

const ConfigurationManagement = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('eventTypes');
  const [configurations, setConfigurations] = useState({
    eventTypes: [],
    gameTypes: [],
    classes: [],
    difficultyGrades: [],
    orgs: []
  });
  const [editingSection, setEditingSection] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [difficultyDialog, setDifficultyDialog] = useState({
    isOpen: false,
    mode: 'create',
    data: null
  });

  // Check if user is coach
  if (user?.role !== 'coach' && user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">访问受限</h3>
          <p className="text-gray-600 dark:text-gray-400">只有教练和管理员可以访问系统配置</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/configurations'));
      setConfigurations(response.data);
    } catch (error) {
      console.error('获取配置失败:', error);
      toast.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section, data) => {
    try {
      setSaving(true);
      await axios.put(createApiUrl(`/api/configurations/${section}`), { data });
      
      setConfigurations(prev => ({
        ...prev,
        [section]: data
      }));
      
      setEditingSection(null);
      setNewItem('');
      toast.success('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error(error.response?.data?.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (section) => {
    if (!newItem.trim()) {
      toast.error('请输入内容');
      return;
    }
    
    // Check for duplicates (case-insensitive)
    const trimmedItem = newItem.trim();
    const exists = configurations[section].some(item => 
      item.toLowerCase() === trimmedItem.toLowerCase()
    );
    
    if (exists) {
      toast.error('该项目已存在，请勿重复添加');
      return;
    }
    
    const updatedData = [...configurations[section], trimmedItem];
    saveSection(section, updatedData);
  };

  const removeItem = (section, index) => {
    const updatedData = configurations[section].filter((_, i) => i !== index);
    saveSection(section, updatedData);
  };

  const updateItem = (section, index, value) => {
    const trimmedValue = value.trim();
    
    // Check for duplicates (case-insensitive), excluding current item
    const exists = configurations[section].some((item, i) => 
      i !== index && item.toLowerCase() === trimmedValue.toLowerCase()
    );
    
    if (exists) {
      toast.error('该项目已存在，请勿重复添加');
      return;
    }
    
    const updatedData = [...configurations[section]];
    updatedData[index] = trimmedValue;
    saveSection(section, updatedData);
  };

  const handleDifficultyGradeSubmit = (gradeData) => {
    // Check for duplicate level names (case-insensitive)
    const currentIndex = difficultyDialog.data?.index;
    const levelExists = configurations.difficultyGrades.some((grade, index) => 
      (difficultyDialog.mode === 'create' || index !== currentIndex) &&
      grade.level.toLowerCase() === gradeData.level.toLowerCase()
    );
    
    if (levelExists) {
      toast.error('该等级名称已存在，请使用不同的名称');
      return;
    }

    // Check for duplicate numbers
    const numberExists = configurations.difficultyGrades.some((grade, index) => 
      (difficultyDialog.mode === 'create' || index !== currentIndex) &&
      grade.number === gradeData.number
    );
    
    if (numberExists) {
      toast.error('该等级编号已存在，请使用不同的编号');
      return;
    }
    
    const updatedGrades = difficultyDialog.mode === 'create'
      ? [...configurations.difficultyGrades, gradeData]
      : configurations.difficultyGrades.map((grade, index) => 
          index === difficultyDialog.data?.index ? gradeData : grade
        );
    
    saveSection('difficultyGrades', updatedGrades);
    setDifficultyDialog({ isOpen: false, mode: 'create', data: null });
  };

  const tabs = [
    { id: 'eventTypes', label: '赛事类型', icon: Calendar },
    { id: 'gameTypes', label: '比赛项目', icon: Trophy },
    { id: 'classes', label: '参赛组别', icon: Users },
    { id: 'difficultyGrades', label: '难度等级', icon: Target },
    { id: 'orgs', label: '主办方', icon: Building }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              系统配置管理
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            管理系统的基础配置数据，包括赛事类型、比赛项目、参赛组别等
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    {configurations[tab.id]?.length || 0}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
          {activeTab === 'difficultyGrades' ? (
            <DifficultyGradesSection 
              grades={configurations.difficultyGrades}
              onEdit={(grade, index) => setDifficultyDialog({ 
                isOpen: true, 
                mode: 'edit', 
                data: { ...grade, index } 
              })}
              onDelete={(index) => {
                const updatedGrades = configurations.difficultyGrades.filter((_, i) => i !== index);
                saveSection('difficultyGrades', updatedGrades);
              }}
              onAdd={() => setDifficultyDialog({ 
                isOpen: true, 
                mode: 'create', 
                data: null 
              })}
              isDarkMode={isDarkMode}
              saving={saving}
            />
          ) : (
            <SimpleListSection
              section={activeTab}
              title={tabs.find(t => t.id === activeTab)?.label}
              items={configurations[activeTab]}
              editingSection={editingSection}
              newItem={newItem}
              onStartEdit={() => setEditingSection(activeTab)}
              onCancelEdit={() => {
                setEditingSection(null);
                setNewItem('');
              }}
              onNewItemChange={setNewItem}
              onAddItem={() => addItem(activeTab)}
              onUpdateItem={(index, value) => updateItem(activeTab, index, value)}
              onRemoveItem={(index) => removeItem(activeTab, index)}
              isDarkMode={isDarkMode}
              saving={saving}
            />
          )}
        </div>

        {/* Difficulty Grade Dialog */}
        <DifficultyGradeDialog
          isOpen={difficultyDialog.isOpen}
          mode={difficultyDialog.mode}
          data={difficultyDialog.data}
          onSubmit={handleDifficultyGradeSubmit}
          onClose={() => setDifficultyDialog({ isOpen: false, mode: 'create', data: null })}
          isDarkMode={isDarkMode}
          existingGrades={configurations.difficultyGrades}
        />
      </div>
    </div>
  );
};

// Simple list section component for basic arrays
const SimpleListSection = ({ 
  section, 
  title, 
  items, 
  editingSection, 
  newItem, 
  onStartEdit, 
  onCancelEdit, 
  onNewItemChange, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem, 
  isDarkMode, 
  saving 
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newItemError, setNewItemError] = useState('');
  const [editError, setEditError] = useState('');

  const startEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
    setEditError('');
  };

  const handleNewItemChange = (value) => {
    onNewItemChange(value);
    
    // Check for duplicates in real-time
    if (value.trim()) {
      const exists = items.some(item => 
        item.toLowerCase() === value.trim().toLowerCase()
      );
      setNewItemError(exists ? '该项目已存在' : '');
    } else {
      setNewItemError('');
    }
  };

  const handleEditValueChange = (value) => {
    setEditValue(value);
    
    // Check for duplicates in real-time
    if (value.trim()) {
      const exists = items.some((item, i) => 
        i !== editingIndex && item.toLowerCase() === value.trim().toLowerCase()
      );
      setEditError(exists ? '该项目已存在' : '');
    } else {
      setEditError('');
    }
  };

  const saveEdit = () => {
    if (editValue.trim() && !editError) {
      onUpdateItem(editingIndex, editValue);
      setEditingIndex(null);
      setEditValue('');
      setEditError('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
    setEditError('');
  };

  const handleAddItem = () => {
    if (!newItemError) {
      onAddItem();
      setNewItemError('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title} ({items.length})
        </h2>
        <button
          onClick={onStartEdit}
          disabled={editingSection === section || saving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>添加新项</span>
        </button>
      </div>

      {/* Add new item */}
      {editingSection === section && (
        <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={newItem}
                onChange={(e) => handleNewItemChange(e.target.value)}
                placeholder={`输入新的${title}`}
                className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  newItemError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              />
              <button
                onClick={handleAddItem}
                disabled={saving || !newItem.trim() || newItemError}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {newItemError && (
              <p className="text-sm text-red-600 dark:text-red-400 ml-1">{newItemError}</p>
            )}
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 border rounded-lg ${
              isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {editingIndex === index ? (
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => handleEditValueChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      editError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editValue.trim() || editError}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {editError && (
                  <p className="text-sm text-red-600 dark:text-red-400 ml-1">{editError}</p>
                )}
              </div>
            ) : (
              <>
                <span className="text-gray-900 dark:text-white">{item}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(index, item)}
                    disabled={saving}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(index)}
                    disabled={saving}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">暂无数据</div>
            <button
              onClick={onStartEdit}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              添加第一个项目
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Difficulty grades section component
const DifficultyGradesSection = ({ grades, onEdit, onDelete, onAdd, isDarkMode, saving }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          难度等级 ({grades.length})
        </h2>
        <button
          onClick={onAdd}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>添加等级</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grades.map((grade, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: grade.color }}
                ></div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    等级 {grade.number}
                  </span>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {grade.level}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onEdit(grade, index)}
                  disabled={saving}
                  className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(index)}
                  disabled={saving}
                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">匹配赛事:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {grade.matchingEventType || '未设置'}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">技能要求:</span>
                <ul className="mt-1 ml-4 text-gray-600 dark:text-gray-400 text-xs">
                  {grade.skill.slice(0, 2).map((skill, skillIndex) => (
                    <li key={skillIndex} className="list-disc">
                      {skill}
                    </li>
                  ))}
                  {grade.skill.length > 2 && (
                    <li className="text-blue-600 dark:text-blue-400">
                      +{grade.skill.length - 2} 更多...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))}
        
        {grades.length === 0 && (
          <div className="col-span-full text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-gray-400 mb-2">暂无难度等级配置</div>
            <button
              onClick={onAdd}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              添加第一个等级
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationManagement;