'use client';

import React from 'react';
import { Calendar, BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useBranding } from '@/lib/BrandingContext';
import { useCdr } from '@/contexts/CdrContext';

interface ProgressState {
  phase: 'initial' | 'background' | 'complete';
  currentBatch: number;
  totalBatches: number;
  recordsLoaded: number;
  estimatedTotal: number;
  isComplete: boolean;
}

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isLoading?: boolean;
  progress?: ProgressState;
}

// Simple date formatting function
const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};



export function DateSelector({ 
  selectedDate, 
  onDateChange, 
  isLoading = false,
  progress
}: DateSelectorProps) {
  const { settings } = useBranding();
  const { loadMetrics, hasDataLoaded, kpis } = useCdr();
  
  // Provide fallback colors if branding is not available
  const primaryColor = settings?.primaryColor || '#3b82f6';
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  const isToday = selectedDate.toDateString() === today.toDateString();
  const isYesterday = selectedDate.toDateString() === yesterday.toDateString();
  const isCustomDate = !isToday && !isYesterday;

  const handleTodayClick = () => {
    onDateChange(today);
  };

  const handleYesterdayClick = () => {
    onDateChange(yesterday);
  };

  const handleLoadMetrics = () => {
    loadMetrics();
  };

  const showProgress = isLoading || !!progress;

  return (
    <div className="space-y-3">
      {/* Date Selector and Load Metrics Buttons - All in one line */}
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            disabled={isLoading}
            className="gap-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:border-blue-700"
            style={{ 
              backgroundColor: isToday ? `${primaryColor}20` : undefined,
              borderColor: isToday ? primaryColor : undefined,
              color: isToday ? primaryColor : undefined
            }}
          >
            <Calendar className="h-3 w-3" />
            Today
          </Button>

          {/* Yesterday Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleYesterdayClick}
            disabled={isLoading}
            className="gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950 dark:hover:border-orange-700"
            style={{ 
              backgroundColor: isYesterday ? `${primaryColor}20` : undefined,
              borderColor: isYesterday ? primaryColor : undefined,
              color: isYesterday ? primaryColor : undefined
            }}
          >
            <Calendar className="h-3 w-3" />
            Yesterday
          </Button>

          {/* Custom Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="gap-2 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950 dark:hover:border-purple-700"
                style={{ 
                  backgroundColor: isCustomDate ? `${primaryColor}20` : undefined,
                  borderColor: isCustomDate ? primaryColor : undefined,
                  color: isCustomDate ? primaryColor : undefined
                }}
              >
                <Calendar className="h-3 w-3" />
                {isCustomDate ? formatDate(selectedDate) : 'Pick Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                disabled={(date) => date > today || date < new Date("2020-01-01")}
                initialFocus
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>

          {/* Separator */}
          <div className="w-px h-6 bg-border mx-1"></div>

          {/* Load Metrics Button */}
          <Button
            onClick={handleLoadMetrics}
            disabled={isLoading}
            size="sm"
            className="gap-2"
            style={{ 
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: 'white'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : hasDataLoaded ? (
              <>
                <RefreshCw className="h-3 w-3" />
                Refresh
              </>
            ) : (
              <>
                <BarChart3 className="h-3 w-3" />
                Load
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Compact Data Status */}
      {hasDataLoaded && !isLoading && (
        <div className="flex justify-center">
          <Badge variant="outline" className="gap-1 text-xs px-2 py-1">
            <TrendingUp className="h-3 w-3" />
            {kpis?.totalCalls || 0} calls
          </Badge>
        </div>
      )}

      {/* Compact Progress Indicator */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>
                {progress ? (
                  `${progress.phase === 'initial' ? 'Loading' : 'Background'} • ${progress.recordsLoaded.toLocaleString()}`
                ) : (
                  'Loading...'
                )}
              </span>
            </div>
          </div>
          
          {progress && (
            <div className="px-6">
              <div className="w-full bg-muted/50 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: progress.totalBatches > 0 
                      ? `${Math.min((progress.currentBatch / progress.totalBatches) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 