import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { rootPersistConfig } from './presistConfig.jsx';
import interviewReducer from "../features/interview/interview.jsx"
import adminReducer from "../features/admin/admin.js"



const rootReducer = combineReducers({
    interview:interviewReducer,
    admin:adminReducer

});

// Make it persistent
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Create the store

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
      },
    }),
});

// Create the persistor
export const persistor = persistStore(store);
