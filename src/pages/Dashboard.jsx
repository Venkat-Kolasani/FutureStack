import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaClipboardList, FaStar, FaCheckCircle, FaPlus, FaList, FaTrash } from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import StatsCard from '../components/dashboard/StatsCard';
import DeadlineWidget from '../components/dashboard/DeadlineWidget';
import UpcomingInterviewsWidget from '../components/dashboard/UpcomingInterviewsWidget';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ShareProgressModal from '../components/sharing/ShareProgressModal';
import ManageSharesPanel from '../components/sharing/ManageSharesPanel';
import { opportunityService, roundService } from '../services/api';
import { isOverdue, getDaysRemaining } from '../utils/dateHelpers';

const Dashboard = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharesRefreshKey, setSharesRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOpportunities();
    fetchUpcomingInterviews();
  }, []);

  const fetchUpcomingInterviews = async () => {
    try {
      setInterviewsLoading(true);
      const today = new Date();
      const to = new Date(today);
      to.setDate(to.getDate() + 30);
      const fromStr = today.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const rounds = await roundService.listUpcoming({ from: fromStr, to: toStr });
      setUpcomingInterviews(rounds);
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
    } finally {
      setInterviewsLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const data = await opportunityService.getAll();
      setOpportunities(data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      const apiMessage = error?.response?.data?.message;
      if (!apiMessage) {
        toast.error('Failed to load opportunities');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setOpportunityToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!opportunityToDelete) return;

    try {
      await opportunityService.delete(opportunityToDelete);
      setOpportunities((prev) =>
        prev.filter((opp) => opp.id !== opportunityToDelete)
      );
      toast.success('Opportunity deleted successfully!');
      setDeleteModalOpen(false);
      setOpportunityToDelete(null);
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast.error('Failed to delete opportunity. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setOpportunityToDelete(null);
  };

  const handleShareCreated = () => {
    setSharesRefreshKey((current) => current + 1);
  };


  // Calculate statistics
  const internshipsCount = opportunities.filter(opp => opp.category === 'internship').length;
  const hackathonsCount = opportunities.filter(opp => opp.category === 'hackathon').length;
  const shortlistedCount = opportunities.filter(opp => opp.status === 'shortlisted').length;
  const selectedCount = opportunities.filter(opp => opp.status === 'selected').length;

  // Final statuses where deadline no longer matters
  const finalStatuses = ['rejected', 'selected'];

  // Get upcoming deadlines (next 3, not overdue, not rejected/selected, sorted chronologically)
  const upcomingDeadlines = opportunities
    .filter(opp => !isOverdue(opp.deadline) && !finalStatuses.includes(opp.status))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);

  // Get overdue items (only for active applications, not rejected/selected)
  const overdueItems = opportunities.filter(
    opp => isOverdue(opp.deadline) && !finalStatuses.includes(opp.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-900 dark:text-white text-lg">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO 
        title="Dashboard"
        description="View your opportunity tracking dashboard. See statistics, upcoming deadlines, and manage your internship and hackathon applications."
        canonical="/dashboard"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Track your opportunities and upcoming deadlines</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatsCard
            title="Internships"
            value={internshipsCount}
            icon={FaClipboardList}
            color="blue"
          />
          <StatsCard
            title="Hackathons"
            value={hackathonsCount}
            icon={FaClipboardList}
            color="orange"
          />
          <StatsCard
            title="Shortlisted"
            value={shortlistedCount}
            icon={FaStar}
            color="yellow"
          />
          <StatsCard
            title="Selected"
            value={selectedCount}
            icon={FaCheckCircle}
            color="green"
          />
        </div>

        {/* Overdue Items Alert */}
        {overdueItems.length > 0 && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-red-900 bg-opacity-20 border-l-4 border-red-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-red-400">
                  {overdueItems.length} Overdue {overdueItems.length === 1 ? 'Item' : 'Items'}
                </h3>
                <div className="mt-2 text-sm text-red-300">
                  <ul className="space-y-2">
                    {overdueItems.slice(0, 3).map(item => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span>
                          {item.title} - {Math.abs(getDaysRemaining(item.deadline))} days overdue
                        </span>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="ml-3 text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-900 hover:bg-opacity-30"
                          aria-label="Delete opportunity"
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))}
                    {overdueItems.length > 3 && (
                      <li className="text-red-400 font-medium">
                        and {overdueItems.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Upcoming deadlines & interviews */}
        <div className="mb-6 sm:mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeadlineWidget deadlines={upcomingDeadlines} onDelete={handleDeleteClick} />
          <UpcomingInterviewsWidget interviews={upcomingInterviews} loading={interviewsLoading} />
        </div>

        {/* Quick Actions */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Button
              onClick={() => navigate('/add')}
              className="flex items-center"
            >
              <FaPlus className="mr-2" />
              Add New Opportunity
            </Button>
            <Button
              onClick={() => navigate('/internships')}
              variant="secondary"
              className="flex items-center"
            >
              <FaList className="mr-2" />
              View All Internships
            </Button>
            <Button
              onClick={() => navigate('/hackathons')}
              variant="secondary"
              className="flex items-center"
            >
              <FaList className="mr-2" />
              View All Hackathons
            </Button>
          </div>
        </Card>

        <div className="mt-6 sm:mt-8">
          <ManageSharesPanel
            refreshKey={sharesRefreshKey}
            onCreateShare={() => setShareModalOpen(true)}
          />
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          title="Confirm Delete"
        >
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this opportunity? This action cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        <ShareProgressModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          opportunities={opportunities}
          onShareCreated={handleShareCreated}
        />
      </div>
    </div>
  );
};

export default Dashboard;
