import React from 'react';
import { useSelector } from 'react-redux';
import InterviewForm from './interviewIntials';
import InterviewSession from './interview';

const InterviewPage = () => {

  const interviewState = useSelector((state) => state.interview)
   const {interviewId} = useSelector((state) => state.interview)
  console.log(interviewState)
  
  return (
    <>
      {!interviewId ? <InterviewForm /> : <InterviewSession interviewId={interviewId} />}
    </>
  );
};

export default InterviewPage;
