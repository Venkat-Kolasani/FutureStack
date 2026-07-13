/**
 * HackathonList - Page showing hackathon-type opportunities
 * 
 * Features:
 * - Loads all opportunities from API and filters by category === 'hackathon'
 * - Client-side search and status filtering
 * - OpportunityDetailModal for viewing full details
 * - Delete confirmation modal
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSearch, FaPlus, FaChevronDown } from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import OpportunityList from '../components/opportunities/OpportunityList';
import OpportunityDetailModal from '../components/opportunities/OpportunityDetailModal';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import CampusModeSelect from '../components/opportunities/CampusModeSelect';
import { opportunityService } from '../services/api';
import { useCampusModeFilter } from '../hooks/useCampusModeFilter';

const HackathonList = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const {
    campusModeFilter,
    setCampusModeFilter,
    resetCampusModeFilter,
    isCampusFilterActive,
    applyCampusModeFilter,
  } = useCampusModeFilter();
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState(null);

  // Fetch opportunities on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, campusModeFilter, opportunities, applyCampusModeFilter]);

  /**
   * Fetch all opportunities and filter for hackathons only
   */
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await opportunityService.getAll();
      const hackathons = response.filter(opp => opp.category === 'hackathon');
      setOpportunities(hackathons);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Failed to load hackathons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search and status filters
   */
  const applyFilters = () => {
    let filtered = [...opportunities];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        opp =>
          opp.title.toLowerCase().includes(query) ||
          (opp.description && opp.description.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(opp => opp.status === statusFilter);
    }

    if (campusModeFilter !== 'all') {
      filtered = applyCampusModeFilter(filtered);
    }

    setFilteredOpportunities(filtered);
  };

  // View handlers
  const handleView = (opportunity) => {
    setSelectedOpportunity(opportunity);
  };

  const handleCloseDetail = () => {
    setSelectedOpportunity(null);
  };

  // Edit handler
  const handleEdit = (id) => {
    setSelectedOpportunity(null);
    navigate(`/edit/${id}`);
  };

  // Manage team handler - navigates to hackathon detail page
  const handleManage = (id) => {
    setSelectedOpportunity(null);
    navigate(`/hackathons/${id}`);
  };

  // Delete handlers
  const handleDeleteClick = (id) => {
    setSelectedOpportunity(null);
    setOpportunityToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!opportunityToDelete) return;

    try {
      await opportunityService.delete(opportunityToDelete);
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityToDelete));
      toast.success('Hackathon deleted successfully!');
      setDeleteModalOpen(false);
      setOpportunityToDelete(null);
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast.error('Failed to delete hackathon. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setOpportunityToDelete(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    resetCampusModeFilter();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-4 sm:p-6">
      <SEO
        title="Hackathons"
        description="Track and manage your hackathon applications. Never miss a deadline with our hackathon management tools."
        canonical="/hackathons"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Hackathons</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Manage and track your hackathon applications
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/add')}
            className="flex items-center w-full sm:w-auto justify-center"
          >
            <FaPlus className="mr-2" />
            Add New
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-4 mb-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-10 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-3 flex-col sm:flex-row w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-40 h-10 pl-3 pr-8 appearance-none bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  <option value="all" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">All Statuses</option>
                  <option value="applied" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Applied</option>
                  <option value="shortlisted" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Shortlisted</option>
                  <option value="interviewed" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Interviewed</option>
                  <option value="selected" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Selected</option>
                  <option value="rejected" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Rejected</option>
                  <option value="ghosted" className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white">Ghosted</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 dark:text-gray-400">
                  <FaChevronDown className="text-xs" />
                </div>
              </div>

              <CampusModeSelect
                value={campusModeFilter}
                onChange={(e) => setCampusModeFilter(e.target.value)}
              />

              {(searchQuery || statusFilter !== 'all' || isCampusFilterActive) && (
                <button
                  onClick={clearFilters}
                  className="h-10 px-4 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm font-medium transition-all w-full sm:w-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Showing {filteredOpportunities.length} of {opportunities.length} hackathons
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading hackathons...</p>
          </div>
        ) : (
          <OpportunityList
            opportunities={filteredOpportunities}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        )}

        {/* Opportunity Detail Modal */}
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          isOpen={!!selectedOpportunity}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onManage={handleManage}
        />

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          title="Confirm Delete"
        >
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this hackathon? This action cannot be undone.
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
      </div>
    </div>
  );
};

export default HackathonList;
