import { useEffect, useContext } from 'react';
import { useLocation, UNSAFE_NavigationContext } from 'react-router-dom';
import { useInterviewLock } from '../context/InterviewLockContext';

const InterviewNavigationBlocker = () => {
  const { isInterviewActive } = useInterviewLock();
  const location = useLocation();
  const navigationContext = useContext(UNSAFE_NavigationContext);

 
  useEffect(() => {
    if (!isInterviewActive || !navigationContext) return;

    const { navigator } = navigationContext;
    
    // Store original methods
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    // Override push method
    navigator.push = function(to, state) {
      const targetPath = typeof to === 'string' ? to : to.pathname;
      
      // Allow navigation within interview routes
      if (targetPath && targetPath.startsWith('/interview')) {
        return originalPush.call(this, to, state);
      }

      // Block and show warning
      const shouldLeave = window.confirm(
        ' Interview in Progress!\n\n' +
        'You cannot leave during an active interview.\n' +
        'Please complete or stop the interview first.\n\n' +
        'Leaving now will be recorded as a violation.'
      );

      if (shouldLeave) {
        console.warn(' User forced navigation during interview');
        return originalPush.call(this, to, state);
      }
    };

    // Override replace method
    navigator.replace = function(to, state) {
      const targetPath = typeof to === 'string' ? to : to.pathname;
      
      if (targetPath && targetPath.startsWith('/interview')) {
        return originalReplace.call(this, to, state);
      }

      const shouldLeave = window.confirm(
        ' Interview in Progress!\n\n' +
        'You cannot leave during an active interview.\n' +
        'Please complete or stop the interview first.\n\n' +
        'Leaving now will be recorded as a violation.'
      );

      if (shouldLeave) {
        console.warn(' User forced navigation during interview');
        return originalReplace.call(this, to, state);
      }
    };

    // Cleanup: restore original methods
    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [isInterviewActive, navigationContext]);

  // Prevent browser back/forward buttons
  useEffect(() => {
    if (!isInterviewActive) return;

    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', location.pathname);
      alert(
        ' Navigation Blocked\n\n' +
        'You cannot use browser navigation during an interview.\n' +
        'Please complete or stop the interview first.'
      );
    };

    // Push current state to prevent back navigation
    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isInterviewActive, location.pathname]);

  // Prevent page refresh/close
  useEffect(() => {
    if (!isInterviewActive) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Interview in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInterviewActive]);

  // Prevent right-click context menu during interview
  useEffect(() => {
    if (!isInterviewActive) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isInterviewActive]);

  return null;
};

export default InterviewNavigationBlocker;
