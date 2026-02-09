// persistConfig.js
import storage from 'redux-persist/lib/storage';
import { createTransform } from 'redux-persist';

// Transform to exclude loading and error states from persistence
const interviewTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState) => {
    return {
      ...inboundState,
      loading: false, // Never persist loading state
      error: null,    // Never persist error state
    };
  },
  // Transform state being rehydrated
  (outboundState) => {
    return {
      ...outboundState,
      loading: false, // Always start with loading false
      error: null,    // Always start with no error
    };
  },
  // Define which reducers this transform applies to
  { whitelist: ['interview'] }
);

export const rootPersistConfig = {
  key: 'root',
  version: 1, // Increment this to force a state reset
  storage,
  whitelist: ['interview'], // slices to persist
  transforms: [interviewTransform], // Apply transform to clean loading/error states
  migrate: (state) => {
    // Force reset if old state structure
    if (state && state.interview && state.interview.loading === true) {
      return Promise.resolve({
        ...state,
        interview: {
          ...state.interview,
          loading: false,
          error: null
        }
      });
    }
    return Promise.resolve(state);
  }
};
