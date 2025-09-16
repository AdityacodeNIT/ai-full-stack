import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api.js';

// Async thunk to call the backend API
export const generateInterview = createAsyncThunk(
  'interview/generateInterview',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post('/interview', formData);
      console.log(res.data)
      return res.data.interview; // contains _id and questions
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to generate interview');
    }
  }
);

export const getAllInterviews = createAsyncThunk(
    'interview/getAllInterviews',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/interview');
            return res.data.interviews;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch interviews');
        }
    }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState: {
    loading: false,
    interview: null,        // holds single interview object for session
    interviews: [],         // holds list of all interviews
    interviewId: null,      // for quick access
    error: null,
  },
  reducers: {
    clearInterview(state) {
      state.interview = null;
      state.interviewId = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateInterview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateInterview.fulfilled, (state, action) => {
        state.loading = false;
        state.interview = action.payload;
        state.interviewId = action.payload._id;
      })
      .addCase(generateInterview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAllInterviews.pending, (state) => {
          state.loading = true;
          state.error = null;
      })
      .addCase(getAllInterviews.fulfilled, (state, action) => {
          state.loading = false;
          state.interviews = action.payload;
      })
      .addCase(getAllInterviews.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
      });
  },
});

export const { clearInterview } = interviewSlice.actions;
export default interviewSlice.reducer;
