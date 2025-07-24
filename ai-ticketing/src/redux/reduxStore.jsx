import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { rootPersistConfig } from './presistConfig.jsx';
import interviewReducer from "../features/interview/interview.jsx"


// 1️⃣ Combine reducers here
const rootReducer = combineReducers({
    interview:interviewReducer
 // Assuming you have an address slice
  // add more slices here in future (e.g. user: userReducer)
});

// 2️⃣ Make it persistent
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// 3️⃣ Create the store
export const store = configureStore({
  reducer: persistedReducer,
});

// 4️⃣ Create the persistor
export const persistor = persistStore(store);
