import React, { useState, useEffect } from 'react';
import { Sidebar, AppPageTab } from './components/Sidebar';
import { ReportGrievance } from './components/ReportGrievance';
import { CommandCenter } from './components/CommandCenter';
import { TrackStatus } from './components/TrackStatus';
import { HistoryPage } from './components/HistoryPage';
import { TestRunner } from './components/TestRunner';
import { INITIAL_COMPLAINTS } from './data/sampleComplaints';
import { ComplaintRecord } from './types';
import {
  Menu,
  Sparkles,
  ShieldAlert,
  Sun,
  Moon,
  ChevronRight,
  PlusCircle,
  Building2,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppPageTab>('command');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>('CMP-2026-081');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('civic_theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('civic_complaints');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_COMPLAINTS;
  });

  // Sync dark theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('civic_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('civic_theme', 'light');
    }
  }, [isDark]);

  // Persist complaints state
  useEffect(() => {
    localStorage.setItem('civic_complaints', JSON.stringify(complaints));
  }, [complaints]);

  const toggleDark = () => {
    setIsDark((prev) => !prev);
  };

  const handleUpdateComplaint = (updatedRecord: ComplaintRecord) => {
    setComplaints((prev) => {
      const exists = prev.find((c) => c.id === updatedRecord.id);
      if (exists) {
        return prev.map((c) => (c.id === updatedRecord.id ? updatedRecord : c));
      }
      return [updatedRecord, ...prev];
    });
  };

  const handleAddComplaint = (newRecord: ComplaintRecord) => {
    setComplaints((prev) => [newRecord, ...prev]);
    setSelectedComplaintId(newRecord.id);
  };

  // Cross-page navigation helpers
  const handleNavigateToTrack = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setActiveTab('track');
  };

  const handleNavigateToCommand = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setActiveTab('command');
  };

  const handleNavigateToHistory = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setActiveTab('history');
  };

  // Tab metadata
  const tabTitles: Record<AppPageTab, { title: string; subtitle: string }> = {
    report: {
      title: 'Report Grievance',
      subtitle: 'Citizen complaint intake & automated Gemini AI triage',
    },
    command: {
      title: 'Command Center',
      subtitle: 'Municipal authority operations, hotspot map, and AI review',
    },
    track: {
      title: 'Track Status',
      subtitle: 'Real-time grievance timeline and municipal dispatch status',
    },
    history: {
      title: 'Activity History',
      subtitle: 'Complete chronological audit log of all citizen reports',
    },
    tests: {
      title: 'Automated Test Runner',
      subtitle: 'End-to-end regression validation for all application features',
    },
  };

  const pendingCount = complaints.filter((c) => c.status === 'New').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex font-sans">
      {/* 1. Left Sidebar Navigation: Exactly 5 items */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        toggleDark={toggleDark}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        pendingCount={pendingCount}
        totalCount={complaints.length}
      />

      {/* 2. Main Content Container (offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top App Header / Bar */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Title */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hidden sm:inline">CivicPulse AI</span>
                <ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
                <span className="text-slate-900 dark:text-white font-semibold">
                  {tabTitles[activeTab].title}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2.5">
            {activeTab !== 'report' && (
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Grievance</span>
              </button>
            )}

            {/* Dark Theme Toggle on Header */}
            <button
              type="button"
              onClick={toggleDark}
              aria-label="Toggle visual theme"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* 3. Main Page Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Page 1: Report Grievance */}
          {activeTab === 'report' && (
            <ReportGrievance
              complaints={complaints}
              onAddComplaint={handleAddComplaint}
              onNavigateToTrack={handleNavigateToTrack}
              onNavigateToCommand={handleNavigateToCommand}
            />
          )}

          {/* Page 2: Command Center */}
          {activeTab === 'command' && (
            <CommandCenter
              complaints={complaints}
              onUpdateComplaint={handleUpdateComplaint}
              selectedComplaintId={selectedComplaintId}
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
              onNavigateToHistory={handleNavigateToHistory}
            />
          )}

          {/* Page 3: Track Status */}
          {activeTab === 'track' && (
            <TrackStatus
              complaints={complaints}
              initialComplaintId={selectedComplaintId}
              onNavigateToReport={() => setActiveTab('report')}
            />
          )}

          {/* Page 4: History */}
          {activeTab === 'history' && (
            <HistoryPage
              complaints={complaints}
              initialSelectedId={selectedComplaintId}
              onNavigateToCommand={handleNavigateToCommand}
              onNavigateToTrack={handleNavigateToTrack}
            />
          )}

          {/* Page 5: Test Runner */}
          {activeTab === 'tests' && <TestRunner complaints={complaints} />}
        </main>

        {/* 4. Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto py-5 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">CivicPulse AI</span>
              <span aria-hidden="true">·</span>
              <span>Municipal Incident Intelligence Platform</span>
            </div>
            <div className="flex items-center gap-4 text-3xs font-mono">
              <span>Formula: (0.4×U) + (0.3×I) + (0.2×S) + (0.1×D)</span>
              <span aria-hidden="true">·</span>
              <span>5 Standard Navigation Modules</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
