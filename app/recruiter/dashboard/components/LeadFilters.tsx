'use client';

import { useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, Upload } from 'lucide-react';

interface LeadFiltersProps {
  filterStatus: string;
  filterPriority: string;
  searchTerm: string;
  sortBy: 'date' | 'score';
  sortOrder: 'asc' | 'desc';
  selectedCount: number;
  bulkLoading: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onSearchChange: (term: string) => void;
  onSortByChange: (sort: 'date' | 'score') => void;
  onSortOrderChange: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  onBulkWhatsApp: () => void;
  onBulkEmail: () => void;
  onBulkStatusChange: (status: string) => void;
  onClearSelection: () => void;
}

export default function LeadFilters({
  filterStatus,
  filterPriority,
  searchTerm,
  sortBy,
  sortOrder,
  selectedCount,
  bulkLoading,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
  onSortByChange,
  onSortOrderChange,
  onRefresh,
  onUpload,
  onBulkWhatsApp,
  onBulkEmail,
  onBulkStatusChange,
  onClearSelection,
}: LeadFiltersProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search leads"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'date' | 'score')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Sort by"
          >
            <option value="date">Sort by Date</option>
            <option value="score">Sort by Score</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={onSortOrderChange}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            aria-label="Toggle sort order"
          >
            {sortOrder === 'asc' ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Refresh leads"
            aria-label="Refresh"
          >
            <RefreshCw size={18} />
          </button>

          {/* Upload */}
          <button
            onClick={onUpload}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Import leads from file"
          >
            <Upload size={16} /> Import
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-sm font-medium text-blue-900">
            {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBulkWhatsApp}
              disabled={bulkLoading}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              WhatsApp
            </button>
            <button
              onClick={onBulkEmail}
              disabled={bulkLoading}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Email
            </button>
            <select
              onChange={(e) => {
                if (e.target.value) onBulkStatusChange(e.target.value);
                e.target.value = '';
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">Mark as...</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
            <button
              onClick={onClearSelection}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
