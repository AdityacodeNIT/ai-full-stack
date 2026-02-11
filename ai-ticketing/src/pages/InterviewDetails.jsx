import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getInterviewById, clearInterview } from "../features/interview/interview";
import { useUser } from "@clerk/clerk-react";




const InterviewDetails = () => {
    const { isLoaded, isSignedIn } = useUser();
  const { id } = useParams();
  const dispatch = useDispatch();

  const { interview, loading, error } = useSelector(
    (state) => state.interview
  );
  console.log("Interview details state:", { interview, loading, error });

useEffect(() => {
  // Clear previous interview data when ID changes
  dispatch(clearInterview());
  
  if (isLoaded && isSignedIn && id) {
    dispatch(getInterviewById(id));
  }

  // Cleanup on unmount
  return () => {
    dispatch(clearInterview());
  };
}, [id, isLoaded, isSignedIn, dispatch]);

  if (loading) {
    return <p className="text-center mt-10">Loading interview...</p>;
  }

  if (error) {
    return (
      <p className="text-center mt-10 text-red-500">
        Error loading interview: {error}
      </p>
    );
  }

  if (!interview) {
    return (
      <p className="text-center mt-10 text-gray-400">
        Interview not found.
      </p>
    );
  }


  const { role, level, status, createdAt, finalReport } = interview;

  return (
    <div className="p-6 bg-gray-900 text-white rounded max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Interview Report
      </h1>

      {/* Basic Info */}
      <div className="bg-gray-800 p-4 rounded mb-6">
        <p><strong>Role:</strong> {role}</p>
        <p><strong>Level:</strong> {level}</p>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Date:</strong> {new Date(createdAt).toLocaleString()}</p>
      </div>

      {finalReport && (
        <div className="space-y-8">

          {/* Overall Score Section */}
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Overall Score</h2>
              <div className="text-4xl font-bold">
                {finalReport.overallScore}/100
              </div>
            </div>
            <p className="mt-4 text-gray-200">
              {finalReport.overallSummary}
            </p>
          </div>

          {/* Performance Breakdown */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">
              Performance Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreCard title="Technical" score={finalReport.technicalScore} />
              <ScoreCard title="Problem Solving" score={finalReport.problemSolvingScore} />
              <ScoreCard title="Communication" score={finalReport.communicationScore} />
            </div>
          </div>

          {/* Strengths */}
          {finalReport.strengths?.length > 0 && (
            <SectionCard
              title="Strengths"
              bg="bg-green-900"
              items={finalReport.strengths}
            />
          )}

          {/* Areas for Improvement */}
          {finalReport.areasForImprovement?.length > 0 && (
            <SectionCard
              title="Areas for Improvement"
              bg="bg-yellow-900"
              items={finalReport.areasForImprovement}
            />
          )}

          {/* Recommendation */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">
              Recommendation: {finalReport.recommendation}
            </h3>
            <p className="text-gray-300">
              {finalReport.recommendationReason}
            </p>
            <p className="mt-4 text-gray-400">
              <strong>Next Steps:</strong> {finalReport.nextSteps}
            </p>
          </div>

          {/* Question-by-Question Breakdown */}
          {finalReport.questionEvaluations?.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">
                Detailed Question Analysis
              </h3>
              <div className="space-y-4">
                {finalReport.questionEvaluations.map((q, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">
                          Question {q.questionNumber}
                        </p>
                        <p className="text-sm text-gray-400">
                          Confidence: {q.confidence} | Clarity: {q.clarity} | Technical: {q.technicalUnderstanding}
                        </p>
                      </div>
                      <div className="text-2xl font-bold">
                        {q.score}/100
                      </div>
                    </div>
                    <p className="mt-2 text-gray-300">{q.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

const ScoreCard = ({ title, score }) => (
  <div className="bg-gray-700 p-4 rounded text-center">
    <div className="text-sm text-gray-400">{title}</div>
    <div className="text-3xl font-bold mt-2">{score}/100</div>
  </div>
);

const SectionCard = ({ title, bg, items }) => (
  <div className={`${bg} p-6 rounded-lg`}>
    <h3 className="text-xl font-semibold mb-4">{title}</h3>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i}>• {item}</li>
      ))}
    </ul>
  </div>
);

export default InterviewDetails;
