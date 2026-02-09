import { useState, useEffect } from 'react';
import api from '../utils/api.js';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, violationsRes, analyticsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/violations'),
        api.get('/api/admin/analytics')
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setViolations(violationsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (clerkUserId) => {
    try {
      const res = await api.get(`/api/admin/users/${clerkUserId}`);
      setSelectedUser(res.data);
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          {['overview', 'users', 'violations', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon="👥"
                subtitle={`+${stats.recentActivity.users} this week`}
              />
              <StatCard
                title="Total Interviews"
                value={stats.totalInterviews}
                icon="🎙️"
                subtitle={`${stats.completedInterviews} completed`}
              />
              <StatCard
                title="In Progress"
                value={stats.inProgressInterviews}
                icon="⏳"
                subtitle="Active interviews"
              />
              <StatCard
                title="Total Violations"
                value={stats.totalViolations}
                icon="🚨"
                subtitle="Proctoring alerts"
              />
            </div>

            {/* Violation Types Breakdown */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Violation Types</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(stats.violationTypes).map(([type, count]) => (
                  <div key={type} className="bg-gray-700 p-4 rounded">
                    <div className="text-2xl font-bold text-red-400">{count}</div>
                    <div className="text-sm text-gray-400 capitalize">
                      {type.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Recent Activity (Last 7 Days)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-bold text-blue-400">
                    {stats.recentActivity.interviews}
                  </div>
                  <div className="text-gray-400">New Interviews</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400">
                    {stats.recentActivity.users}
                  </div>
                  <div className="text-gray-400">New Users</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">All Users</h2>
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Refresh
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-center">Interviews</th>
                    <th className="px-6 py-3 text-center">Avg Score</th>
                    <th className="px-6 py-3 text-center">Violations</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' ? 'bg-purple-600' :
                          user.role === 'moderator' ? 'bg-blue-600' :
                          'bg-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.stats.totalInterviews}
                        <span className="text-gray-400 text-sm ml-1">
                          ({user.stats.completedInterviews} done)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.stats.avgScore !== null ? (
                          <span className={`font-semibold ${
                            user.stats.avgScore >= 80 ? 'text-green-400' :
                            user.stats.avgScore >= 60 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {user.stats.avgScore}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={user.stats.totalViolations > 0 ? 'text-red-400 font-semibold' : 'text-gray-500'}>
                          {user.stats.totalViolations}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => fetchUserDetails(user.clerkUserId)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Violations Tab */}
        {activeTab === 'violations' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Proctoring Violations</h2>
            <div className="space-y-4">
              {violations.map((interview) => (
                <div key={interview._id} className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{interview.role} - {interview.level}</h3>
                      <p className="text-gray-400 text-sm">
                        User: {interview.userEmail} | 
                        Date: {new Date(interview.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${
                      interview.status === 'completed' ? 'bg-green-600' :
                      interview.status === 'in-progress' ? 'bg-yellow-600' :
                      'bg-gray-600'
                    }`}>
                      {interview.status}
                    </span>
                  </div>

                  <div className="bg-gray-700 p-4 rounded">
                    <h4 className="font-semibold mb-3 text-red-400">
                      Violations ({interview.proctoringViolations.length})
                    </h4>
                    <div className="space-y-2">
                      {interview.proctoringViolations.map((violation, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {violation.type === 'no_face' ? '👤' :
                               violation.type === 'multiple_faces' ? '👥' :
                               violation.type === 'object_detected' ? '📱' :
                               violation.type === 'tab_switch' ? '🔄' :
                               '⚠️'}
                            </span>
                            <div>
                              <div className="font-medium capitalize">
                                {violation.type.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-gray-400">
                                Question #{violation.questionNumber}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(violation.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {violations.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No violations recorded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Performance Analytics</h2>

            {/* Score Distribution */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Score Distribution</h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(analytics.scoreDistribution).map(([range, count]) => (
                  <div key={range} className="bg-gray-700 p-4 rounded text-center">
                    <div className="text-3xl font-bold text-blue-400">{count}</div>
                    <div className="text-sm text-gray-400 mt-2">{range}</div>
                    <div className="mt-2 bg-gray-600 h-2 rounded overflow-hidden">
                      <div
                        className="bg-blue-500 h-full"
                        style={{
                          width: `${(count / analytics.totalCompleted) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Average Scores by Level */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Average Scores by Experience Level</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(analytics.avgScoresByLevel).map(([level, score]) => (
                  <div key={level} className="bg-gray-700 p-4 rounded text-center">
                    <div className={`text-3xl font-bold ${
                      score >= 80 ? 'text-green-400' :
                      score >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {score}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">{level}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interviews Over Time */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Interviews Over Time (Last 30 Days)</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {Object.entries(analytics.interviewsByDate)
                  .sort(([a], [b]) => new Date(a) - new Date(b))
                  .map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition-colors"
                        style={{
                          height: `${(count / Math.max(...Object.values(analytics.interviewsByDate))) * 100}%`,
                          minHeight: '4px'
                        }}
                        title={`${date}: ${count} interviews`}
                      />
                      <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-top-left">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedUser.user.email}</h2>
                  <p className="text-gray-400">User Details & Interview History</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* User Info */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Role:</span>
                    <span className="ml-2 font-medium">{selectedUser.user.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Joined:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedUser.user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interview History */}
              <div>
                <h3 className="font-semibold mb-4">Interview History ({selectedUser.interviews.length})</h3>
                <div className="space-y-4">
                  {selectedUser.interviews.map((interview) => (
                    <div key={interview._id} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{interview.role} - {interview.level}</h4>
                          <p className="text-sm text-gray-400">
                            {new Date(interview.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${
                          interview.status === 'completed' ? 'bg-green-600' :
                          interview.status === 'in-progress' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`}>
                          {interview.status}
                        </span>
                      </div>

                      {interview.finalReport && (
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="bg-gray-800 p-3 rounded text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {interview.finalReport.overallScore}
                            </div>
                            <div className="text-xs text-gray-400">Overall Score</div>
                          </div>
                          <div className="bg-gray-800 p-3 rounded text-center">
                            <div className="text-lg font-semibold text-green-400">
                              {interview.finalReport.recommendation}
                            </div>
                            <div className="text-xs text-gray-400">Recommendation</div>
                          </div>
                          <div className="bg-gray-800 p-3 rounded text-center">
                            <div className="text-2xl font-bold text-red-400">
                              {interview.proctoringViolations?.length || 0}
                            </div>
                            <div className="text-xs text-gray-400">Violations</div>
                          </div>
                        </div>
                      )}

                      {interview.proctoringViolations && interview.proctoringViolations.length > 0 && (
                        <div className="bg-gray-800 p-3 rounded">
                          <div className="text-sm font-semibold text-red-400 mb-2">
                            Violations:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {interview.proctoringViolations.map((v, idx) => (
                              <span key={idx} className="text-xs bg-red-900 px-2 py-1 rounded">
                                {v.type.replace(/_/g, ' ')} (Q{v.questionNumber})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// StatCard Component
const StatCard = ({ title, value, icon, subtitle }) => (
  <div className="bg-gray-800 p-6 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <p className="text-gray-500 text-sm">{subtitle}</p>
  </div>
);

export default AdminDashboard;
