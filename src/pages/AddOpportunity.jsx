// Page for creating a brand new opportunity
// - Wraps the reusable OpportunityForm and wires it to the API service
// - On success, redirects user back to dashboard
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/seo/SEO';
import OpportunityForm from '../components/opportunities/OpportunityForm';
import { opportunityService } from '../services/api';

const AddOpportunity = () => {
  const navigate = useNavigate();

  // Called by OpportunityForm when user submits a VALID form
  // formData contains all fields: title, description, deadline, etc.
  const handleSubmit = async (formData) => { // formData received from OpportunityForm
    try {
      await opportunityService.create(formData);
      toast.success('Opportunity added successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating opportunity:', error);
      // Extract specific validation error message from server response
      if (error.response?.data?.details?.length > 0) {
        const errorMessages = error.response.data.details
          .map(detail => detail.message)
          .join('. ');
        toast.error(errorMessages);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to add opportunity. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    navigate(-1); // Navigate back to previous page
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO
        title="Add Opportunity"
        description="Add a new internship or hackathon opportunity to track."
        canonical="/add"
        noindex={true}
      />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Add New Opportunity
          </h2>

          <OpportunityForm onSubmit={handleSubmit} isEdit={false} />

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

export default AddOpportunity;
