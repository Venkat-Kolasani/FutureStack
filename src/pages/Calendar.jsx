import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';
import SEO from '../components/seo/SEO';
import { opportunityService, roundService } from '../services/api';
import { getDaysRemaining } from '../utils/dateHelpers';
import { getRoundTypeLabel } from '../utils/roundHelpers';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FaBriefcase, FaCode, FaCalendarAlt, FaClock, FaLayerGroup } from 'react-icons/fa';

const CalendarPage = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [upcomingRounds, setUpcomingRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDateOpportunities, setSelectedDateOpportunities] = useState([]);
  const [selectedDateRounds, setSelectedDateRounds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 3, 0);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      const [opps, rounds] = await Promise.all([
        opportunityService.getAll(),
        roundService.listUpcoming({ from: fromStr, to: toStr }),
      ]);
      setOpportunities(opps);
      setUpcomingRounds(rounds);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  // Parse deadline dates and create a map of dates with opportunities
  const deadlineMap = {};
  opportunities.forEach(opp => {
    if (opp.deadline) {
      const dateKey = new Date(opp.deadline).toDateString();
      if (!deadlineMap[dateKey]) {
        deadlineMap[dateKey] = [];
      }
      deadlineMap[dateKey].push(opp);
    }
  });

  const interviewMap = {};
  upcomingRounds.forEach((round) => {
    if (round.scheduledDate) {
      const dateKey = new Date(`${round.scheduledDate}T12:00:00`).toDateString();
      if (!interviewMap[dateKey]) {
        interviewMap[dateKey] = [];
      }
      interviewMap[dateKey].push(round);
    }
  });

  // Function to mark dates with deadlines and interviews
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = date.toDateString();
      const oppsOnDate = deadlineMap[dateKey];
      const roundsOnDate = interviewMap[dateKey];

      if ((oppsOnDate && oppsOnDate.length > 0) || (roundsOnDate && roundsOnDate.length > 0)) {
        const internships = oppsOnDate
          ? oppsOnDate.filter((opp) => opp.category === 'internship').length
          : 0;
        const hackathons = oppsOnDate
          ? oppsOnDate.filter((opp) => opp.category === 'hackathon').length
          : 0;
        const interviews = roundsOnDate ? roundsOnDate.length : 0;

        return (
          <div className="flex justify-center items-center gap-1 mt-1">
            {internships > 0 && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" title={`${internships} internship deadline(s)`} />
            )}
            {hackathons > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title={`${hackathons} hackathon deadline(s)`} />
            )}
            {interviews > 0 && (
              <div className="w-2 h-2 bg-purple-500 rounded-full" title={`${interviews} interview round(s)`} />
            )}
          </div>
        );
      }
    }
    return null;
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateKey = date.toDateString();
    const oppsOnDate = deadlineMap[dateKey] || [];
    const roundsOnDate = interviewMap[dateKey] || [];

    if (oppsOnDate.length > 0 || roundsOnDate.length > 0) {
      setSelectedDateOpportunities(oppsOnDate);
      setSelectedDateRounds(roundsOnDate);
      setShowModal(true);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      applied: 'bg-blue-500',
      shortlisted: 'bg-yellow-500',
      interviewed: 'bg-purple-500',
      selected: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-900 dark:text-white text-lg">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO 
        title="Calendar"
        description="View all your opportunity deadlines in a calendar format. Never miss an important date."
        canonical="/calendar"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Calendar</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">View all your deadlines in calendar format</p>
        </div>

        {/* Legend */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">Internship Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">Hackathon Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">Interview Round</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">Click on a date to view opportunities</span>
            </div>
          </div>
        </Card>

        {/* Calendar */}
        <Card className="p-6">
          <div className="calendar-container">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              tileContent={tileContent}
              className="custom-calendar"
            />
          </div>
        </Card>

        {/* Summary Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaCalendarAlt className="text-blue-400 text-2xl" />
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Deadlines</p>
                <p className="text-gray-900 dark:text-white text-2xl font-bold">{opportunities.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaBriefcase className="text-blue-400 text-2xl" />
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Internship Deadlines</p>
                <p className="text-gray-900 dark:text-white text-2xl font-bold">
                  {opportunities.filter(opp => opp.category === 'internship').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaCode className="text-green-400 text-2xl" />
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Hackathon Deadlines</p>
                <p className="text-gray-900 dark:text-white text-2xl font-bold">
                  {opportunities.filter(opp => opp.category === 'hackathon').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Modal for selected date opportunities */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Events on ${selectedDate.toLocaleDateString()}`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            {selectedDateRounds.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <FaLayerGroup />
                  Interview rounds
                </h4>
                {selectedDateRounds.map((round) => (
                  <div
                    key={round.id}
                    className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30"
                  >
                    <p className="text-gray-900 dark:text-white font-medium">{round.opportunityTitle}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      Round {round.roundNumber} · {getRoundTypeLabel(round.roundType)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedDateOpportunities.map(opp => (
              <div
                key={opp.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{opp.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium text-gray-900 dark:text-white ${opp.category === 'internship' ? 'bg-blue-600' : 'bg-green-600'
                          }`}
                      >
                        {opp.category === 'internship' ? (
                          <span className="flex items-center gap-1">
                            <FaBriefcase size={10} />
                            Internship
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FaCode size={10} />
                            Hackathon
                          </span>
                        )}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium text-gray-900 dark:text-white ${getStatusColor(
                          opp.status
                        )}`}
                      >
                        {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 text-sm">
                    <FaClock size={12} />
                    <span>{getDaysRemaining(opp.deadline)} days</span>
                  </div>
                </div>

                {opp.description && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{opp.description}</p>
                )}

                {opp.link && (
                  <a
                    href={opp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    View Opportunity →
                  </a>
                )}

                {opp.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      <span className="font-semibold">Notes:</span> {opp.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setShowModal(false)} variant="secondary">
              Close
            </Button>
          </div>
        </Modal>
      </div>


    </div>
  );
};

export default CalendarPage;
