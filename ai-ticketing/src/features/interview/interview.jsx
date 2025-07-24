import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';



  const token = localStorage.getItem("token");
// Async thunk to call the backend API
export const generateInterview = createAsyncThunk(
  'interview/generateInterview',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await axios.post('http://localhost:3000/interview', formData, {
         
            headers: {
              Authorization: `Bearer ${token}`,
            },
          
      });
      console.log(res.data)
      return res.data.interview;
       // contains _id and questions
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to generate interview');
    }
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState: {
    loading: false,
    interview: null,        // holds entire interview object
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
      });
  },
});

export const { clearInterview } = interviewSlice.actions;
export default interviewSlice.reducer;
