// Reusable form component for both "Add" and "Edit" opportunity screens
// - Controlled inputs: all field values live in local React state (formData)
// - Parent component decides what happens on submit via onSubmit callback
import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import DocumentSelector from '../documents/DocumentSelector';
import { supportsDocuments, CAMPUS_MODE_FORM_OPTIONS } from '../../utils/opportunityHelpers';

// initialData: values to pre-fill the form in edit mode
// onSubmit: function passed from parent (Add / Edit page) to handle API call
// isEdit: boolean to toggle button label (Create vs Update)
// opportunityId: for linking documents (only in edit mode)
const OpportunityForm = ({ initialData = {}, onSubmit, isEdit = false, opportunityId = null }) => {
  // Single state object to store all input values
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    deadline: '',
    category: 'internship',
    status: 'applied',
    notes: '',
    campus_mode: '',
  });

  // Tracks validation error messages per field (e.g. errors.title)
  const [errors, setErrors] = useState({});

  // When initialData changes (Edit screen), pre-fill the form fields
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        link: initialData.link || '',
        deadline: initialData.deadline || '',
        category: initialData.category || 'internship',
        status: initialData.status || 'applied',
        notes: initialData.notes || '',
        campus_mode: initialData.campus_mode || '',
      });
    }
  }, [initialData]);

  // Runs on every keystroke / change in any input or select
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Keep previous values and only update the changed field
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this specific field when user starts typing again
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Basic client-side validation before allowing submit
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Save errors so we can show messages in the UI
    setErrors(newErrors);
    // Form is valid when no keys in newErrors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Only call parent onSubmit when validation passes
    if (validateForm()) {
      onSubmit({
        ...formData,
        campus_mode: formData.campus_mode || null,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
            }`}
          placeholder="e.g., React Intern at ABC Company"
        />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange} // Added missing onChange handler
          rows="3"
          className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="Brief description of the opportunity"
        />
      </div>

      {/* Link */}
      <div>
        <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Link
        </label>
        <input
          type="url"
          id="link"
          name="link"
          value={formData.link}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="https://example.com/apply"
        />
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Deadline <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          id="deadline"
          name="deadline"
          value={formData.deadline}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.deadline ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
            }`}
        />
        {errors.deadline && <p className="text-red-400 text-sm mt-1">{errors.deadline}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Category <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="category"
              value="internship"
              checked={formData.category === 'internship'}
              onChange={handleChange}
              className="mr-2 w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Internship</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="category"
              value="hackathon"
              checked={formData.category === 'hackathon'}
              onChange={handleChange}
              className="mr-2 w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Hackathon</span>
          </label>
        </div>
        {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
      </div>

      {/* Campus type (optional) */}
      <div>
        <label htmlFor="campus_mode" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Campus type (optional)
        </label>
        <select
          id="campus_mode"
          name="campus_mode"
          value={formData.campus_mode}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          {CAMPUS_MODE_FORM_OPTIONS.map((option) => (
            <option
              key={option.value || 'unset'}
              value={option.value}
              className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="applied" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Applied</option>
          <option value="shortlisted" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Shortlisted</option>
          <option value="interviewed" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Interviewed</option>
          <option value="selected" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Selected</option>
          <option value="rejected" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Rejected</option>
          <option value="ghosted" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Ghosted</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="Additional notes or preparation tasks"
        />
      </div>

      {/* Document Selector - only for categories that support documents in edit mode */}
      {isEdit && opportunityId && supportsDocuments(formData.category) && (
        <DocumentSelector
          opportunityId={opportunityId}
          category={formData.category}
        />
      )}

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
          {isEdit ? 'Update Opportunity' : 'Create Opportunity'}
        </Button>
      </div>
    </form>
  );
};

export default OpportunityForm;
