// Profile page - User profile management
// Allows users to view and edit their personal, academic, and professional information
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import SEO from '../components/seo/SEO';
import { profileService } from '../services/api';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile = () => {
    const { user, isSignedIn, isLoaded } = useUser();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        bio: '',
        avatar_url: '',
        college: '',
        degree: '',
        graduation_year: '',
        skills: '',
        github_url: '',
        linkedin_url: '',
        portfolio_url: ''
    });

    // Snapshot of formData for change detection
    const [initialFormData, setInitialFormData] = useState(null);

    // Derive hasChanges by comparing current formData to initial snapshot
    const hasChanges = initialFormData !== null && 
        JSON.stringify(formData) !== JSON.stringify(initialFormData);

    // Normalize profile data to empty string for form fields
    const normalizeFormData = (data) => ({
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
        college: data.college || '',
        degree: data.degree || '',
        graduation_year: data.graduation_year || '',
        skills: data.skills || '',
        github_url: data.github_url || '',
        linkedin_url: data.linkedin_url || '',
        portfolio_url: data.portfolio_url || ''
    });

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const data = await profileService.getProfile();
            setProfile(data);
            const normalized = normalizeFormData(data);
            setFormData(normalized);
            setInitialFormData(normalized);
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSignedIn) {
            fetchProfile();
        }
    }, [isSignedIn, fetchProfile]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Parse graduation_year to number if provided
        const submissionData = { ...formData };
        if (submissionData.graduation_year) {
            submissionData.graduation_year = parseInt(submissionData.graduation_year, 10);
        } else {
            submissionData.graduation_year = null;
        }

        try {
            setSaving(true);
            const updated = await profileService.updateProfile(submissionData);
            setProfile(updated);
            // Sync formData and initial snapshot from server response
            const serverFormData = normalizeFormData(updated);
            setFormData(serverFormData);
            setInitialFormData(serverFormData);
            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error || 
                               'Failed to update profile. Please try again.';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        if (profile) {
            const normalized = normalizeFormData(profile);
            setFormData(normalized);
            setInitialFormData(normalized);
        }
    };

    // Show loading while Clerk loads
    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6">
            <SEO
                title="Profile"
                description="Manage your profile information"
                noindex={true}
            />
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
                    <p className="text-sm sm:text-base text-gray-400">
                        Manage your personal, academic, and professional information
                    </p>
                </div>

                {/* Account Information (from Clerk - read-only) */}
                <div className="bg-[#0A0A0A] rounded-xl p-6 mb-6 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4 text-gray-200">Account Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                            <p className="text-white font-medium">
                                {user.fullName || user.firstName || 'Not set'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                            <p className="text-white font-medium">
                                {user.primaryEmailAddress?.emailAddress || 'Not set'}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                        Account settings are managed through Clerk. Your email and name are read-only here.
                    </p>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <div className="bg-[#0A0A0A] rounded-xl p-6 mb-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 text-gray-200">Basic Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-200 mb-1">
                                    Profile Picture URL
                                </label>
                                <input
                                    type="url"
                                    id="avatar_url"
                                    name="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={handleChange}
                                    placeholder="https://example.com/avatar.jpg"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-200 mb-1">
                                    Bio / About Me
                                </label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    maxLength={1000}
                                    placeholder="Tell us about yourself..."
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/1000 characters</p>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="bg-[#0A0A0A] rounded-xl p-6 mb-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 text-gray-200">Academic Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="college" className="block text-sm font-medium text-gray-200 mb-1">
                                    College / University
                                </label>
                                <input
                                    type="text"
                                    id="college"
                                    name="college"
                                    value={formData.college}
                                    onChange={handleChange}
                                    placeholder="Enter your college or university"
                                    maxLength={200}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="degree" className="block text-sm font-medium text-gray-200 mb-1">
                                    Degree
                                </label>
                                <input
                                    type="text"
                                    id="degree"
                                    name="degree"
                                    value={formData.degree}
                                    onChange={handleChange}
                                    placeholder="e.g., B.Sc. Computer Science"
                                    maxLength={200}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="graduation_year" className="block text-sm font-medium text-gray-200 mb-1">
                                    Graduation Year
                                </label>
                                <input
                                    type="number"
                                    id="graduation_year"
                                    name="graduation_year"
                                    value={formData.graduation_year}
                                    onChange={handleChange}
                                    placeholder="e.g., 2026"
                                    min="1950"
                                    max="2100"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="bg-[#0A0A0A] rounded-xl p-6 mb-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 text-gray-200">Professional Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="skills" className="block text-sm font-medium text-gray-200 mb-1">
                                    Skills
                                </label>
                                <textarea
                                    id="skills"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleChange}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="List your skills (comma-separated)"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
                            </div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="bg-[#0A0A0A] rounded-xl p-6 mb-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 text-gray-200">Social Links</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="github_url" className="block text-sm font-medium text-gray-200 mb-1">
                                    GitHub Profile
                                </label>
                                <input
                                    type="url"
                                    id="github_url"
                                    name="github_url"
                                    value={formData.github_url}
                                    onChange={handleChange}
                                    placeholder="https://github.com/username"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-200 mb-1">
                                    LinkedIn Profile
                                </label>
                                <input
                                    type="url"
                                    id="linkedin_url"
                                    name="linkedin_url"
                                    value={formData.linkedin_url}
                                    onChange={handleChange}
                                    placeholder="https://linkedin.com/in/username"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="portfolio_url" className="block text-sm font-medium text-gray-200 mb-1">
                                    Portfolio Website
                                </label>
                                <input
                                    type="url"
                                    id="portfolio_url"
                                    name="portfolio_url"
                                    value={formData.portfolio_url}
                                    onChange={handleChange}
                                    placeholder="https://yourportfolio.com"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        {hasChanges && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={saving || !hasChanges}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;