import storage from 'redux-persist/lib/storage';
import { createTransform } from 'redux-persist';

// Transform to exclude loading and error states from persistence
const interviewTransform = createTransform(
  (inboundState) => {
    return {
      ...inboundState,
      loading: false,
      error: null,
    };
  },
  (outboundState) => {
    return {
      ...outboundState,
      loading: false,
      error: null,
    };
  },
  { whitelist: ['interview'] }
);

export const rootPersistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['interview'],
  transforms: [interviewTransform],
  timeout: 1000,
};
