import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import InterviewForm from './InterviewForm';
import InterviewSession from './InterviewSession';
import { clearInterview } from '../../features/interview/interview';

const InterviewPage = () => {
  const dispatch = useDispatch();
  const interviewState = useSelector((state) => state.interview)
  const {interviewId} = useSelector((state) => state.interview)
  console.log(interviewState)
  
  const handleNewInterview = () => {
    dispatch(clearInterview());
  };
  
  return (
    <>
      {!interviewId ? (
        <InterviewForm />
      ) : (
        <div>
          <div className="flex justify-between items-center p-4 bg-base-200">
            <h2 className="text-xl font-bold">Interview Session</h2>
            <button 
              onClick={handleNewInterview}
              className="btn btn-sm btn-outline"
            >
              ← New Interview
            </button>
          </div>
          <InterviewSession interviewId={interviewId} />
        </div>
      )}
    </>
  );
};

export default InterviewPage;
