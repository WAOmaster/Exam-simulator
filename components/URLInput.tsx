'use client';

import { useState } from 'react';
import { Link, Plus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface URLInputProps {
  onContentFetched: (content: string, urls: string[]) => void;
}

export default function URLInput({ onContentFetched }: URLInputProps) {
  const [urls, setUrls] = useState<string[]>(['']);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedStatus, setScrapedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const handleScrape = async () => {
    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim().length > 0);

    if (validUrls.length === 0) {
      setErrorMessage('Please enter at least one URL');
      setScrapedStatus('error');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/i;
    const invalidUrls = validUrls.filter(url => !urlPattern.test(url));
    if (invalidUrls.length > 0) {
      setErrorMessage('Please enter valid URLs starting with http:// or https://');
      setScrapedStatus('error');
      return;
    }

    setIsScraping(true);
    setScrapedStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls.length === 1 ? validUrls[0] : validUrls }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to scrape URLs');
      }

      setScrapedStatus('success');
      onContentFetched(data.content, validUrls);
    } catch (error: any) {
      setScrapedStatus('error');
      setErrorMessage(error.message || 'Failed to scrape URLs');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      {urls.map((url, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="https://example.com/documentation"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isScraping}
            />
          </div>

          {urls.length > 1 && (
            <button
              onClick={() => removeUrlField(index)}
              disabled={isScraping}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-3">
        <button
          onClick={addUrlField}
          disabled={isScraping}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Another URL
        </button>

        <button
          onClick={handleScrape}
          disabled={isScraping}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              Fetch Content
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {scrapedStatus === 'success' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Content fetched successfully! You can now generate questions.
          </p>
        </div>
      )}

      {scrapedStatus === 'error' && errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> You can add multiple URLs to combine content from different sources. The scraper will extract the main content and remove navigation, ads, and other clutter.
        </p>
      </div>
    </div>
  );
}
