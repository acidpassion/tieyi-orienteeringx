import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Eye, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from '../config/axiosConfig';
import { createApiUrl } from '../config/api';

const FileUpload = ({ registrationId, onUploadSuccess, existingDocuments = [], maxFiles = 5, maxFileSize = 5 * 1024 * 1024, confirmDialog }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (mimeType.includes('word')) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(`不支持的文件类型: ${file.name}`);
      return false;
    }
    if (file.size > maxFileSize) {
      toast.error(`文件大小超过限制 (5MB): ${file.name}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter(validateFile);
    
    if (files.length + validFiles.length + existingDocuments.length > maxFiles) {
      toast.error(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    const newFiles = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      description: ''
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateDescription = (fileId, description) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, description } : f
    ));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }

    if (!registrationId) {
      toast.error('报名记录ID不存在，无法上传文件');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      const descriptions = [];

      files.forEach((fileItem, index) => {
        formData.append('files', fileItem.file);
        descriptions.push(fileItem.description);
      });

      formData.append('descriptions', JSON.stringify(descriptions));

      const token = localStorage.getItem('token');
      const response = await axios.post(
        createApiUrl(`/api/documents/upload/${registrationId}`),
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success('文件上传成功');
      setFiles([]);
      if (onUploadSuccess) {
        onUploadSuccess(response.data.documents);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      toast.error(error.response?.data?.message || '文件上传失败');
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (documentId, filename, mimeType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        createApiUrl(`/api/documents/${documentId}`),
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      
      // Check if popup was blocked
      if (!newWindow) {
        toast.error('弹出窗口被阻止，请允许弹出窗口后重试');
        window.URL.revokeObjectURL(url);
        return;
      }
      
      // Clean up the URL after the new window loads
      newWindow.onload = () => {
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      };
      
      // Fallback cleanup in case onload doesn't fire
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('查看文件失败:', error);
      toast.error('查看文件失败');
    }
  };

  const downloadDocument = async (documentId, filename, mimeType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        createApiUrl(`/api/documents/${documentId}`),
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('文件下载成功');
    } catch (error) {
      console.error('下载文件失败:', error);
      toast.error('下载文件失败');
    }
  };

  const deleteDocument = async (documentId, filename) => {
    try {
      // Use the confirmation dialog component if available, otherwise fallback to browser confirm
      let confirmed = false;
      if (confirmDialog) {
        confirmed = await confirmDialog({
          titleCn: '删除文件',
          messageCn: `确定要删除文件 "${filename}" 吗？此操作无法撤销。`,
          titleEn: 'Delete File',
          messageEn: `Are you sure you want to delete "${filename}"? This action cannot be undone.`
        });
      } else {
        confirmed = window.confirm(`确定要删除文件 "${filename}" 吗？此操作无法撤销。`);
      }
      
      if (!confirmed) {
        return;
      }
      const token = localStorage.getItem('token');
      await axios.delete(
        createApiUrl(`/api/documents/${documentId}`),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      toast.success('文件删除成功');
      if (onUploadSuccess) {
        onUploadSuccess(); // Refresh the document list
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      toast.error(error.response?.data?.message || '删除文件失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          拖拽文件到此处或点击选择文件
        </p>
        <p className="text-sm text-gray-500 mb-4">
          支持图片、PDF、Word文档，单个文件最大5MB，最多{maxFiles}个文件
        </p>
        <p className="text-xs text-gray-400">
          支持格式: JPG, PNG, GIF, WebP, PDF, DOC, DOCX
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">待上传文件 ({files.length})</h4>
          {files.map((fileItem) => (
            <div key={fileItem.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {getFileIcon(fileItem.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileItem.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(fileItem.file.size)}
                </p>
                <input
                  type="text"
                  placeholder="添加文件描述（可选）"
                  value={fileItem.description}
                  onChange={(e) => updateDescription(fileItem.id, e.target.value)}
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFile(fileItem.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUpload();
            }}
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
          </button>
        </div>
      )}

      {/* Existing Documents */}
      {existingDocuments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">已上传文件 ({existingDocuments.length})</h4>
          {existingDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              {getFileIcon(doc.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('zh-CN')}
                </p>
                {doc.description && doc.description.trim() && (
                  <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    viewDocument(doc.id, doc.originalName, doc.mimeType);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="查看"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadDocument(doc.id, doc.originalName, doc.mimeType);
                  }}
                  className="text-green-500 hover:text-green-700"
                  title="下载"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteDocument(doc.id, doc.originalName);
                  }}
                  className="text-red-500 hover:text-red-700"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">文件上传说明</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 请上传保险单据和责任告知书</li>
          <li>• 支持图片格式 (JPG, PNG, GIF, WebP)</li>
          <li>• 支持文档格式 (PDF, DOC, DOCX)</li>
          <li>• 单个文件最大 5MB</li>
          <li>• 每个报名记录最多上传 {maxFiles} 个文件</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;