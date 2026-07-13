import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaDownload,
  FaFileAlt,
  FaCheckSquare,
  FaSquare,
  FaLayerGroup,
  FaListUl,
} from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import InterviewRejectionInsights from '../components/analytics/InterviewRejectionInsights';
import InterviewFunnelChart from '../components/analytics/InterviewFunnelChart';
import StatusIndicator from '../components/common/StatusIndicator';
import { opportunityService, analyticsService } from '../services/api';
import { generatePDF, downloadPDF } from '../utils/pdfExport';
import { formatDate } from '../utils/dateHelpers';
import { getRejectionStageForOpportunity, filterPipelineAnalyticsForOpportunities } from '../utils/roundHelpers';
import {
  calculateCampusModeStats,
  getCampusModeLabel,
  CAMPUS_MODE_BADGE_STYLES,
} from '../utils/opportunityHelpers';

const STATUS_STYLES = {
  applied: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  shortlisted: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  interviewed: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  selected: 'bg-green-500/15 text-green-300 border-green-500/25',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/25',
  ghosted: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
};

const EXPORT_OPTIONS = [
  {
    value: 'all',
    label: 'All opportunities',
    description: 'Every row plus summary and pipeline insights',
  },
  {
    value: 'selected',
    label: 'Selected only',
    description: 'Choose specific internships to include',
  },
  {
    value: 'summary',
    label: 'Summary only',
    description: 'Statistics and rejection breakdown — no detail rows',
  },
];

const calculateStatistics = (opps) => ({
  total: opps.length,
  applied: opps.filter((opp) => opp.status === 'applied').length,
  shortlisted: opps.filter((opp) => opp.status === 'shortlisted').length,
  interviewed: opps.filter((opp) => opp.status === 'interviewed').length,
  selected: opps.filter((opp) => opp.status === 'selected').length,
  rejected: opps.filter((opp) => opp.status === 'rejected').length,
  ghosted: opps.filter((opp) => opp.status === 'ghosted').length,
});

const Reports = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [pipelineAnalytics, setPipelineAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opportunitiesData, analyticsData] = await Promise.all([
        opportunityService.getAll(),
        analyticsService.getAnalytics(),
      ]);
      setOpportunities(opportunitiesData);
      setPipelineAnalytics(analyticsData.pipelineAnalytics ?? null);
      setSelectedIds(opportunitiesData.map((opp) => opp.id));
    } catch (error) {
      console.error('Error loading reports data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const previewOpportunities = useMemo(() => {
    if (exportType === 'all') return opportunities;
    if (exportType === 'selected') {
      return opportunities.filter((opp) => selectedIds.includes(opp.id));
    }
    return [];
  }, [exportType, opportunities, selectedIds]);

  const statistics = useMemo(
    () =>
      calculateStatistics(
        exportType === 'selected' ? previewOpportunities : opportunities
      ),
    [exportType, previewOpportunities, opportunities]
  );

  const campusModeStats = useMemo(
    () => calculateCampusModeStats(
      exportType === 'selected' ? previewOpportunities : opportunities
    ),
    [exportType, previewOpportunities, opportunities]
  );

  const displayPipeline = useMemo(() => {
    if (!pipelineAnalytics) return null;
    if (exportType === 'selected' && previewOpportunities.length > 0) {
      return filterPipelineAnalyticsForOpportunities(
        pipelineAnalytics,
        previewOpportunities
      );
    }
    return pipelineAnalytics;
  }, [pipelineAnalytics, exportType, previewOpportunities]);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === opportunities.length ? [] : opportunities.map((opp) => opp.id)
    );
  }, [opportunities]);

  const handleDownloadPDF = () => {
    try {
      let oppsToExport = [];
      let stats;

      if (exportType === 'all') {
        oppsToExport = opportunities;
        stats = calculateStatistics(opportunities);
      } else if (exportType === 'selected') {
        oppsToExport = previewOpportunities;
        stats = calculateStatistics(oppsToExport);
      } else {
        stats = calculateStatistics(opportunities);
      }

      const pipelineForExport =
        exportType === 'selected'
          ? filterPipelineAnalyticsForOpportunities(pipelineAnalytics, oppsToExport)
          : pipelineAnalytics;

      const statsScope = exportType === 'selected' ? oppsToExport : opportunities;
      const doc = generatePDF(oppsToExport, stats, exportType, pipelineForExport, statsScope);
      downloadPDF(doc, `futurestack-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const canDownload = exportType !== 'selected' || selectedIds.length > 0;
  const showPipelineSection = displayPipeline?.rejectedCount > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4" />
            <p className="text-gray-900 dark:text-white text-lg">Loading report data…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO
        title="Reports"
        description="Generate and download PDF reports of your opportunities. Export your application data for record keeping."
        canonical="/reports"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header + primary action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Reports & Export</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Preview your data, see where rejections happened, and download a PDF
            </p>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={!canDownload}
            className="w-full sm:w-auto shrink-0"
          >
            <FaDownload className="mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Overview stats — full width */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { key: 'total', label: 'Total', value: statistics.total, className: 'text-gray-900 dark:text-white' },
            { key: 'applied', label: 'Applied', value: statistics.applied, className: 'text-blue-300' },
            { key: 'shortlisted', label: 'Shortlisted', value: statistics.shortlisted, className: 'text-amber-300' },
            { key: 'interviewed', label: 'Interviewed', value: statistics.interviewed, className: 'text-purple-300' },
            { key: 'selected', label: 'Selected', value: statistics.selected, className: 'text-green-300' },
            { key: 'rejected', label: 'Rejected', value: statistics.rejected, className: 'text-red-300' },
            { key: 'ghosted', label: 'Ghosted', value: statistics.ghosted, className: 'text-slate-300' },
          ].map((stat) => (
            <Card key={stat.key} className="p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-1">
                {stat.label}
              </p>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${stat.className}`}>
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        {showPipelineSection && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-4 bg-red-500/5 border-red-500/15">
              <p className="text-xs text-gray-600 dark:text-gray-400">Avg round at rejection</p>
              <p className="text-2xl font-bold text-red-300 tabular-nums">
                {displayPipeline.averageRoundsBeforeRejection ?? '—'}
              </p>
            </Card>
            <Card className="p-4 bg-purple-500/5 border-purple-500/15">
              <p className="text-xs text-gray-600 dark:text-gray-400">Active in pipeline</p>
              <p className="text-2xl font-bold text-purple-200 tabular-nums">
                {displayPipeline.activeInPipeline}
              </p>
            </Card>
            <Card className="p-4 bg-indigo-500/5 border-indigo-500/15 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">With rounds logged</p>
              <p className="text-2xl font-bold text-indigo-200 tabular-nums">
                {displayPipeline.trackedWithRounds}
              </p>
            </Card>
          </div>
        )}

        {/* Export + preview workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-6 items-start">
          {/* Sticky export sidebar */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaFileAlt className="text-blue-400" />
                Export scope
              </h2>
              <div className="space-y-2 mb-5">
                {EXPORT_OPTIONS.map((option) => {
                  const selected = exportType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setExportType(option.value)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? 'border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30'
                          : 'border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 hover:bg-black/10 dark:hover:bg-white/[0.07]'
                      }`}
                    >
                      <p className={`text-sm font-medium ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{option.description}</p>
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleDownloadPDF}
                className="w-full"
                disabled={!canDownload}
              >
                <FaDownload className="mr-2" />
                Download PDF
              </Button>

              {!canDownload && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Select at least one opportunity
                </p>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center">
                {exportType === 'summary'
                  ? 'PDF: stats + pipeline only'
                  : `PDF: ${previewOpportunities.length} opportunit${previewOpportunities.length === 1 ? 'y' : 'ies'}`}
              </p>
            </Card>
          </div>

          {/* Preview panel */}
          <Card className="p-5 sm:p-6 min-h-[320px]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FaListUl className="text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
                {exportType !== 'summary' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-700 dark:text-gray-300">
                    {previewOpportunities.length}
                  </span>
                )}
              </div>
              {exportType === 'selected' && opportunities.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                >
                  {selectedIds.length === opportunities.length ? (
                    <>
                      <FaCheckSquare />
                      Deselect all
                    </>
                  ) : (
                    <>
                      <FaSquare />
                      Select all
                    </>
                  )}
                </button>
              )}
            </div>

            {exportType === 'summary' ? (
              <div className="space-y-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your PDF will include the overview statistics above
                  {showPipelineSection && ' and the interview pipeline section below'}.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(statistics)
                    .filter(([key]) => key !== 'total')
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2"
                      >
                        <p className="text-xs text-gray-500 capitalize">{key}</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
                      </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'on_campus', label: 'On-campus' },
                    { key: 'off_campus', label: 'Off-campus' },
                    { key: 'unspecified', label: 'Not specified' },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2"
                    >
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                        {campusModeStats[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : previewOpportunities.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-16">No opportunities to preview</p>
            ) : (
              <div className="space-y-3 max-h-[min(70vh,640px)] overflow-y-auto pr-1 -mr-1">
                {previewOpportunities.map((opp) => {
                  const isSelected = selectedIds.includes(opp.id);
                  const rejectionStage = getRejectionStageForOpportunity(
                    opp.id,
                    displayPipeline
                  );
                  const statusClass =
                    STATUS_STYLES[opp.status] || 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/25';
                  const campusLabel = getCampusModeLabel(opp.campus_mode);

                  return (
                    <div
                      key={opp.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        exportType === 'selected' && isSelected
                          ? 'border-blue-500/40 bg-blue-500/10'
                          : 'border-gray-200 dark:border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {exportType === 'selected' && (
                          <button
                            type="button"
                            onClick={() => toggleSelection(opp.id)}
                            className="mt-0.5 text-blue-400 hover:text-blue-300 shrink-0"
                            aria-label={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? <FaCheckSquare size={18} /> : <FaSquare size={18} />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{opp.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {campusLabel && (
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CAMPUS_MODE_BADGE_STYLES[opp.campus_mode]}`}
                                >
                                  {campusLabel}
                                </span>
                              )}
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${statusClass}`}
                              >
                                {opp.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <span>
                              <span className="text-gray-500">Category · </span>
                              <span className="text-gray-700 dark:text-gray-300 capitalize">{opp.category}</span>
                            </span>
                            <span>
                              <span className="text-gray-500">Deadline · </span>
                              <span className="text-gray-700 dark:text-gray-300">{formatDate(opp.deadline)}</span>
                            </span>
                          </div>

                          {opp.status === 'rejected' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 mb-2">
                              <FaLayerGroup className="shrink-0" />
                              Rejected at{' '}
                              {rejectionStage ||
                                (opp.rejected_round_number
                                  ? `Round ${opp.rejected_round_number}`
                                  : 'Not recorded')}
                            </div>
                          )}

                          {opp.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">{opp.description}</p>
                          )}
                          {opp.notes && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              <span className="text-gray-600 dark:text-gray-400">Notes · </span>
                              {opp.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Pipeline insights — full width below workspace */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaLayerGroup className="text-red-400" />
              Where you were rejected
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {exportType === 'selected' && previewOpportunities.length > 0
                ? 'Filtered to your current export selection'
                : 'Across all internships with interview rounds'}
            </p>
          </div>
          <InterviewRejectionInsights
            pipeline={displayPipeline}
            showMetrics={false}
            showCharts={showPipelineSection}
          />
          {showPipelineSection && (
            <InterviewFunnelChart pipeline={displayPipeline} compact />
          )}
        </section>

        <div className="flex justify-end pt-2">
          <StatusIndicator className="text-gray-600 hover:text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default Reports;
