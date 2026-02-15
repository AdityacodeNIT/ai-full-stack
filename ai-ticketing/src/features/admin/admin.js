import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";




export const fetchDashboardData = createAsyncThunk(
  "admin/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const [statsRes, usersRes, violationsRes, analyticsRes] =
        await Promise.all([
          api.get("/api/admin/stats"),
          api.get("/api/admin/users"),
          api.get("/api/admin/violations"),
          api.get("/api/admin/analytics"),
        ]);

      return {
        stats: statsRes.data,
        users: usersRes.data,
        violations: violationsRes.data,
        analytics: analyticsRes.data,
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to load dashboard data"
      );
    }
  }
);

// Fetch Single User Details
// 
export const fetchUserDetails = createAsyncThunk(
  "admin/fetchUserDetails",
  async (clerkUserId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/admin/users/${clerkUserId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue("Failed to fetch user details");
    }
  }
);

// Update User Role
export const updateUserRole = createAsyncThunk(
  "admin/updateUserRole",
  async ({ clerkUserId, role }, { dispatch, rejectWithValue }) => {
    try {
      await api.patch(`/api/admin/users/${clerkUserId}/role`, { role });

      // refresh dashboard after role update
      dispatch(fetchDashboardData());

      return { clerkUserId, role };
    } catch (err) {
      return rejectWithValue("Failed to update role");
    }
  }
);

// ==========================
// 🔹 Slice
// ==========================

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    activeTab: "overview",
    stats: null,
    users: [],
    violations: [],
    analytics: null,
    selectedUser: null,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dashboard
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats;
        state.users = action.payload.users;
        state.violations = action.payload.violations;
        state.analytics = action.payload.analytics;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch User Details
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.selectedUser = action.payload;
      })

      // Update Role
      .addCase(updateUserRole.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { setActiveTab, clearSelectedUser } = adminSlice.actions;
export default adminSlice.reducer;
