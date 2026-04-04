'use client';

import { useState } from 'react';
import { X, FileJson, FileSpreadsheet, FileText, Download, CheckCircle, File } from 'lucide-react';
import { QuestionSet } from '@/lib/types';
import {
  exportToJSON,
  exportToCSV,
  exportToPDF,
  exportQuestionsOnlyToPDF,
  exportToMarkdown,
  ExportOptions
} from '@/lib/exportUtils';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questionSet: QuestionSet;
}

type ExportFormat = 'json' | 'csv' | 'markdown' | 'pdf-full' | 'pdf-questions';

export default function ExportDialog({ isOpen, onClose, questionSet }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf-full');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeAnswers: true,
    includeExplanations: true,
    includeMetadata: true,
  });

  if (!isOpen) return null;

  const formats = [
    {
      id: 'json' as ExportFormat,
      label: 'JSON',
      description: 'Export as JSON file - Perfect for importing into other apps',
      icon: FileJson,
      color: 'blue',
    },
    {
      id: 'csv' as ExportFormat,
      label: 'CSV',
      description: 'Export as CSV file - Open in Excel, Google Sheets, etc.',
      icon: FileSpreadsheet,
      color: 'green',
    },
    {
      id: 'markdown' as ExportFormat,
      label: 'Markdown',
      description: 'Readable text format with formatting - Perfect for documentation',
      icon: File,
      color: 'purple',
    },
    {
      id: 'pdf-full' as ExportFormat,
      label: 'PDF (Full)',
      description: 'Complete PDF with questions, answers, and explanations',
      icon: FileText,
      color: 'red',
    },
    {
      id: 'pdf-questions' as ExportFormat,
      label: 'PDF (Questions Only)',
      description: 'PDF with questions only - Perfect for printing actual exams',
      icon: FileText,
      color: 'orange',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      // Simulate slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      switch (selectedFormat) {
        case 'json':
          exportToJSON(questionSet, options);
          break;
        case 'csv':
          exportToCSV(questionSet, options);
          break;
        case 'markdown':
          exportToMarkdown(questionSet, options);
          break;
        case 'pdf-full':
          exportToPDF(questionSet);
          break;
        case 'pdf-questions':
          exportQuestionsOnlyToPDF(questionSet);
          break;
      }

      setExportComplete(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setExportComplete(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Export Question Set
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {questionSet.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Export Format
            </h3>
            <div className="space-y-3">
              {formats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;

                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          format.color === 'blue'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : format.color === 'green'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : format.color === 'purple'
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : format.color === 'red'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-orange-100 dark:bg-orange-900/30'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            format.color === 'blue'
                              ? 'text-blue-600 dark:text-blue-400'
                              : format.color === 'green'
                              ? 'text-green-600 dark:text-green-400'
                              : format.color === 'purple'
                              ? 'text-purple-600 dark:text-purple-400'
                              : format.color === 'red'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {format.label}
                          </h4>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Options - Only show for formats that support options */}
          {['json', 'csv', 'markdown'].includes(selectedFormat) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Export Options
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeAnswers}
                    onChange={(e) =>
                      setOptions({ ...options, includeAnswers: e.target.checked })
                    }
                    className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      Include Answers
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Show correct answers for each question
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeExplanations}
                    onChange={(e) =>
                      setOptions({ ...options, includeExplanations: e.target.checked })
                    }
                    className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      Include Explanations
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Include detailed explanations for answers
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={options.includeMetadata}
                    onChange={(e) =>
                      setOptions({ ...options, includeMetadata: e.target.checked })
                    }
                    className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      Include Metadata
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Include title, description, and statistics
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> The export will include {questionSet.questions.length} questions.
              {selectedFormat === 'pdf-questions' &&
                ' The PDF will only contain questions (no answers or explanations).'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || exportComplete}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exportComplete ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Exported!
              </>
            ) : isExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
