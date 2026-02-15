import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../utils/api.js";

export default function Home() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalInterviews: 0, recentInterviews: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get('/api/auth/me');
        setUser(userRes.data.user);

        // Fetch recent interviews
        const interviewRes = await api.get('/interview/interviews');
        setStats({
          totalInterviews: interviewRes.data.length,
          recentInterviews: interviewRes.data.slice(0, 3)
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero Section */}
      <div className="hero min-h-[60vh] bg-gradient-to-br from-primary to-secondary">
        <div className="hero-content text-center text-primary-content">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-6">
              Welcome to AI Interview Assistant
            </h1>
            <p className="text-xl mb-8">
              Conduct intelligent interviews powered by AI. Get real-time transcription,
              analysis, and insights to make better hiring decisions.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/interview" className="btn btn-lg btn-accent">
                Start New Interview
              </Link>
              <Link to="/interviews" className="btn btn-lg btn-outline btn-accent">
                View Past Interviews
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="stat bg-base-100 shadow-lg rounded-box">
            <div className="stat-figure text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="stat-title">Total Interviews</div>
            <div className="stat-value text-primary">{stats.totalInterviews}</div>
            <div className="stat-desc">All time</div>
          </div>

          <div className="stat bg-base-100 shadow-lg rounded-box">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
            </div>
            <div className="stat-title">AI Powered</div>
            <div className="stat-value text-secondary">100%</div>
            <div className="stat-desc">Real-time analysis</div>
          </div>

          <div className="stat bg-base-100 shadow-lg rounded-box">
            <div className="stat-figure text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div className="stat-title">User</div>
            <div className="stat-value text-accent text-2xl">{user?.email || 'Guest'}</div>
            <div className="stat-desc">{user?.role || 'user'}</div>
          </div>
        </div>

        {/* Recent Interviews */}
        {stats.recentInterviews.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Recent Interviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.recentInterviews.map((interview) => (
                <div key={interview._id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title">{interview.candidateName || 'Unnamed'}</h3>
                    <p className="text-sm opacity-70">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm">Status: {interview.status}</p>
                    <div className="card-actions justify-end mt-4">
                      <Link to={`/interviews/${interview._id}`} className="btn btn-sm btn-primary">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-4">🎤</div>
                <h3 className="card-title">Real-time Transcription</h3>
                <p>Automatic speech-to-text powered by AssemblyAI</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="card-title">AI Analysis</h3>
                <p>Intelligent question generation and response analysis</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="card-title">Insights</h3>
                <p>Get detailed reports and candidate evaluations</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-4"></div>
                <h3 className="card-title">History</h3>
                <p>Access all past interviews and transcripts</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-base-100 rounded-box shadow-xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
          <p className="text-lg mb-6">
            Begin your first AI-powered interview session today
          </p>
          <Link to="/interview" className="btn btn-lg btn-primary">
            Start Interview Now
          </Link>
        </div>
      </div>
    </div>
  );
}
