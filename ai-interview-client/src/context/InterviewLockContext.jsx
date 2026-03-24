import { createContext, useContext, useState, useCallback } from 'react';
import { logger } from '../utils/logger.js';

const InterviewLockContext = createContext();

export const useInterviewLock = () => {
  const context = useContext(InterviewLockContext);
  if (!context) {
    throw new Error('useInterviewLock must be used within InterviewLockProvider');
  }
  return context;
};

export const InterviewLockProvider = ({ children }) => {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [interviewId, setInterviewId] = useState(null);

  const lockInterview = useCallback((id) => {
    setIsInterviewActive(true);
    setInterviewId(id);
    logger.log(' Interview locked:', id);
  }, []);

  const unlockInterview = useCallback(() => {
    setIsInterviewActive(false);
    setInterviewId(null);
    logger.log('🔓 Interview unlocked');
  }, []);

  return (
    <InterviewLockContext.Provider
      value={{
        isInterviewActive,
        interviewId,
        lockInterview,
        unlockInterview,
      }}
    >
      {children}
    </InterviewLockContext.Provider>
  );
};
