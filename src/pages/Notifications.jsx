import { useCallback, useEffect, useState } from 'react';
import { FaBell, FaCheck, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SEO from '../components/seo/SEO';
import { notificationPreferenceService, notificationService } from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [deadlineEmailEnabled, setDeadlineEmailEnabled] = useState(false);
  const [emailDeliveryAvailable, setEmailDeliveryAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPreference, setIsSavingPreference] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const [notificationItems, preference] = await Promise.all([
        notificationService.list({ limit: 50 }),
        notificationPreferenceService.get(),
      ]);
      setNotifications(notificationItems);
      setDeadlineEmailEnabled(preference.deadlineEmailEnabled);
      setEmailDeliveryAvailable(preference.emailDeliveryAvailable);
    } catch (error) {
      console.error('Unable to load notification settings:', error);
      toast.error('Unable to load notification settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const updateEmailPreference = async (event) => {
    const nextValue = event.target.checked;
    try {
      setIsSavingPreference(true);
      const preference = await notificationPreferenceService.update({
        deadlineEmailEnabled: nextValue,
      });
      setDeadlineEmailEnabled(preference.deadlineEmailEnabled);
      setEmailDeliveryAvailable(preference.emailDeliveryAvailable);
      toast.success(nextValue ? 'Email deadline reminders enabled.' : 'Email deadline reminders disabled.');
    } catch (error) {
      console.error('Unable to update email preference:', error);
      toast.error('Unable to update your email preference. Please try again.');
    } finally {
      setIsSavingPreference(false);
    }
  };

  const markRead = async (notificationId) => {
    try {
      const updated = await notificationService.markRead(notificationId);
      setNotifications((previous) => previous.map((notification) => (
        notification.id === notificationId ? { ...notification, ...updated } : notification
      )));
    } catch (error) {
      console.error('Unable to mark notification as read:', error);
      toast.error('Unable to update the notification. Please try again.');
    }
  };

  return (
    <>
      <SEO
        title="Notifications"
        description="Manage FutureTracker.online reminder notifications and email preferences."
        noindex={true}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-black px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <FaBell className="text-blue-500" aria-hidden="true" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Review deadline reminders in FutureTracker and choose whether you also want an email copy.
            </p>
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <FaEnvelope className="mt-1 text-blue-500" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Email deadline reminders</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Send a copy of future hackathon submission reminders to the primary email on your signed-in account.
                  </p>
                  {!emailDeliveryAvailable && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      Your preference will be saved. Email delivery will begin once this FutureTracker deployment has been configured.
                    </p>
                  )}
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3 self-start sm:self-auto">
                <span className="sr-only">Enable email deadline reminders</span>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={deadlineEmailEnabled}
                  onChange={updateEmailPreference}
                  disabled={isSavingPreference || isLoading}
                  aria-label="Enable email deadline reminders"
                />
                <span
                  aria-hidden="true"
                  className="relative h-7 w-12 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 dark:bg-gray-700"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {deadlineEmailEnabled ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </Card>

          <section aria-labelledby="recent-notifications-heading">
            <h2 id="recent-notifications-heading" className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Recent in-app notifications
            </h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={FaBell}
                title="No notifications yet"
                description="When a reminder is due, it will appear here."
              />
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const isRead = Boolean(notification.read_at);
                  return (
                    <Card key={notification.id} className={`p-5 ${isRead ? 'opacity-80' : 'border-blue-300 dark:border-blue-500/40'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />}
                            <h3 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h3>
                          </div>
                          <p className="mt-1 text-gray-600 dark:text-gray-300">{notification.body}</p>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            <FaCheck aria-hidden="true" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default Notifications;
