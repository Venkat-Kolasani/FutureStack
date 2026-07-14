// Page for editing an existing opportunity
// - Fetches existing record using id from URL
// - Pre-fills OpportunityForm via initialData
// - On submit, calls update API and navigates back
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/seo/SEO';
import OpportunityForm from '../components/opportunities/OpportunityForm';
import { opportunityService } from '../services/api';

const EditOpportunity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first render (and when id changes), load data for this opportunity
  useEffect(() => { // Fetch opportunity data 
    const fetchOpportunity = async () => {
      try {
        const data = await opportunityService.getById(id);
        setOpportunity(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching opportunity:', error);
        toast.error('Failed to load opportunity. Please try again.');
        setLoading(false);
        navigate(-1);
      }
    };

    fetchOpportunity();
  }, [id, navigate]);

  // Called by OpportunityForm when user submits VALID data in edit mode
  const handleSubmit = async (formData) => {
    try {
      await opportunityService.update(id, formData);
      toast.success('Opportunity updated successfully!');
      navigate(-1); // Navigate back to previous page
    } catch (error) {
      console.error('Error updating opportunity:', error);
      // Extract specific validation error message from server response
      if (error.response?.data?.details?.length > 0) {
        const errorMessages = error.response.data.details
          .map(detail => detail.message)
          .join('. ');
        toast.error(errorMessages);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update opportunity. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    navigate(-1); // Navigate back to previous page
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-900 dark:text-white text-lg">Loading opportunity...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO
        title="Edit Opportunity"
        description="Edit your opportunity details."
        noindex={true}
      />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Edit Opportunity
          </h2>

          <OpportunityForm
            initialData={opportunity}
            onSubmit={handleSubmit}
            isEdit={true}
            opportunityId={id}
          />

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOpportunity;
