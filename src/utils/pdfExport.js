import jsPDF from 'jspdf';
import { formatDate } from './dateHelpers';
import { getCampusModeLabel, calculateCampusModeStats } from './opportunityHelpers';

/**
 * Generate PDF report from opportunities data
 * @param {Array} opportunities - Array of opportunity objects to include
 * @param {Object} statistics - Statistics object with counts
 * @param {string} exportType - Type of export: 'all', 'selected', or 'summary'
 * @param {Object|null} pipelineAnalytics - Interview pipeline rejection analytics
 * @param {Array} [statsOpportunities] - Opportunities used for campus mode summary counts
 */
export const generatePDF = (
  opportunities,
  statistics,
  exportType = 'all',
  pipelineAnalytics = null,
  statsOpportunities = opportunities
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  const rejectionByOpportunityId = new Map(
    (pipelineAnalytics?.rejections || []).map((item) => [item.opportunityId, item])
  );

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const writeWrappedText = (text, indent = 0, fontSize = 10) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin - indent);
    lines.forEach((line) => {
      checkPageBreak(6);
      doc.text(line, margin + indent, yPosition);
      yPosition += 5;
    });
  };

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FutureTracker Report', margin, yPosition);
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 15;

  // Summary Statistics Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const stats = [
    `Total Opportunities: ${statistics.total}`,
    `Applied: ${statistics.applied}`,
    `Shortlisted: ${statistics.shortlisted}`,
    `Interviewed: ${statistics.interviewed}`,
    `Selected: ${statistics.selected}`,
    `Rejected: ${statistics.rejected}`,
    `Ghosted: ${statistics.ghosted}`,
  ];

  stats.forEach((stat) => {
    doc.text(stat, margin + 5, yPosition);
    yPosition += 6;
  });

  const campusStats = calculateCampusModeStats(statsOpportunities);
  if (campusStats.on_campus > 0 || campusStats.off_campus > 0 || campusStats.unspecified > 0) {
    yPosition += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Campus Mode', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const campusLines = [
      `On-campus: ${campusStats.on_campus}`,
      `Off-campus: ${campusStats.off_campus}`,
      `Not specified: ${campusStats.unspecified}`,
    ];
    campusLines.forEach((line) => {
      doc.text(line, margin + 5, yPosition);
      yPosition += 6;
    });
  }

  yPosition += 10;

  // Interview pipeline rejection insights
  if (pipelineAnalytics?.rejectedCount > 0) {
    checkPageBreak(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Interview Pipeline — Where You Were Rejected', margin, yPosition);
    yPosition += 8;

    const pipelineLines = [
      `Rejected internships: ${pipelineAnalytics.rejectedCount}`,
      `Average round reached: ${pipelineAnalytics.averageRoundsBeforeRejection ?? 'N/A'}`,
      `Active in pipeline: ${pipelineAnalytics.activeInPipeline}`,
    ];

    pipelineLines.forEach((line) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(line, margin + 5, yPosition);
      yPosition += 6;
    });

    yPosition += 4;

    if (pipelineAnalytics.rejectionByRoundType?.length > 0) {
      checkPageBreak(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Rejections by stage type', margin, yPosition);
      yPosition += 7;

      pipelineAnalytics.rejectionByRoundType.forEach((item) => {
        writeWrappedText(`• ${item.label}: ${item.count}`, 5);
      });
      yPosition += 4;
    }

    if (pipelineAnalytics.rejections?.length > 0) {
      checkPageBreak(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Rejection log', margin, yPosition);
      yPosition += 7;

      pipelineAnalytics.rejections.forEach((item) => {
        writeWrappedText(
          `• ${item.title} — ${item.roundTypeLabel} (cleared ${item.clearedRoundsBeforeRejection} before)`,
          5
        );
      });
      yPosition += 6;
    }
  }

  // If summary only, stop here
  if (exportType === 'summary') {
    return doc;
  }

  // Opportunities Details Section
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Opportunities Details', margin, yPosition);
  yPosition += 10;

  // Iterate through opportunities
  opportunities.forEach((opp, index) => {
    checkPageBreak(50);

    // Opportunity number and title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${opp.title}`, margin, yPosition);
    yPosition += 7;

    // Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const details = [
      `Category: ${opp.category[0].toUpperCase() + opp.category.slice(1)}`,
      `Status: ${opp.status[0].toUpperCase() + opp.status.slice(1)}`,
    ];

    details.push(
      opp.category === 'hackathon'
        ? `Submission deadline: ${formatDate(opp.deadline)}`
        : `Applied on: ${formatDate(opp.applied_on)}`
    );

    const campusLabel = getCampusModeLabel(opp.campus_mode);
    if (campusLabel) {
      details.push(`Campus type: ${campusLabel}`);
    }

    if (opp.status === 'rejected') {
      const rejection = rejectionByOpportunityId.get(opp.id);
      if (rejection) {
        details.push(`Rejected at: ${rejection.roundTypeLabel}`);
        details.push(`Cleared rounds before rejection: ${rejection.clearedRoundsBeforeRejection}`);
      } else if (opp.rejected_round_number) {
        details.push(`Rejected at: Round ${opp.rejected_round_number}`);
      }
    } else if (opp.current_round_number) {
      details.push(`Current round: ${opp.current_round_number}`);
    }

    if (opp.description) {
      details.push(`Description: ${opp.description}`);
    }

    if (opp.link) {
      details.push(`Link: ${opp.link}`);
    }

    if (opp.notes) {
      details.push(`Notes: ${opp.notes}`);
    }

    details.forEach((detail) => {
      checkPageBreak(10);

      // Handle long text wrapping
      const lines = doc.splitTextToSize(detail, pageWidth - 2 * margin - 5);
      lines.forEach((line) => {
        checkPageBreak(6);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
    });

    yPosition += 8; // Space between opportunities
  });

  return doc;
};

/**
 * Download PDF with given filename
 * @param {jsPDF} doc - jsPDF document object
 * @param {string} filename - Name for the downloaded file
 */
export const downloadPDF = (doc, filename = 'futurestack-report.pdf') => {
  doc.save(filename);
};
