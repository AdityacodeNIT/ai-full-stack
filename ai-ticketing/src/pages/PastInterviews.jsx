import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getAllInterviews } from '../features/interview/interview';

const PastInterviews = () => {
    const dispatch = useDispatch();
    const { interviews, loading, error } = useSelector((state) => state.interview);

    useEffect(() => {
        dispatch(getAllInterviews());
    }, [dispatch]);

    if (loading) {
        return <p>Loading interviews...</p>;
    }

    if (error) {
        return <p>Error loading interviews: {error}</p>;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 p-6">
            <h2 className="text-3xl font-bold mb-6 text-center">Your Past Interviews</h2>
            {interviews.length === 0 ? (
                <p className="text-center text-gray-500">You haven't completed any interviews yet.</p>
            ) : (
                <div className="space-y-4">
                    {interviews.map((interview) => (
                        <div key={interview._id} className="bg-white shadow rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-semibold">{interview.role}</h3>
                                <p className="text-gray-600">{interview.level} Level</p>
                                <p className="text-sm text-gray-400">
                                    Conducted on: {new Date(interview.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <Link
                                to={`/interviews/${interview._id}`}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                View Details
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PastInterviews;
