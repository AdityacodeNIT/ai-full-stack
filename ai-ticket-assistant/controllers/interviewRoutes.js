import Interview from "../models/interview.js";

/* ─────────────────────────────
   Create Interview (Context Only)
───────────────────────────── */
export const createInterview = async (req, res) => {
  const { type, role, level, techstack, amount } = req.body;

  console.log("📝 Creating interview for user:", req.clerkUserId);

  if (!role || !level || !amount) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters",
    });
  }

  if (!req.clerkUserId) {
    console.error("❌ No clerkUserId in request!");
    return res.status(401).json({
      success: false,
      message: "Unauthorized - no user ID",
    });
  }

  try {
    const interview = await Interview.create({
      role,
      type: type || "balanced",
      level,
      techstack: techstack
        ? techstack.split(",").map(s => s.trim())
        : [],
      numberOfQuestions: amount,

      // 🔑 Clerk user ID instead of JWT user
      userId: req.clerkUserId,

      status: "created",
    });

    console.log("✅ Interview created:", {
      id: interview._id,
      userId: interview.userId,
      role: interview.role,
      level: interview.level
    });

    return res.status(200).json({
      success: true,
      interviewId: interview._id,
      interview,
    });
  } catch (error) {
    console.error("❌ Create interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create interview",
      error: error.message,
    });
  }
};

/* ─────────────────────────────
   Get all interviews
───────────────────────────── */
export const getAllInterviews = async (req, res) => {
  console.log(`📋 Fetching interviews for user ${req.clerkUserId}...`);
  try {
    const interviews = await Interview.find({
      userId: req.clerkUserId,
    }).sort({ createdAt: -1 });
    console.log(`📋 Fetched ${interviews.length} interviews for user ${req.clerkUserId}`);

    res.status(200).json({
      success: true,
      interviews,
    });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviews",
    });
  }
};

/* ─────────────────────────────
   Get interview by ID
───────────────────────────── */
export const getInterviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findOne({
      _id: id,
      userId: req.clerkUserId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      interview,
    });
  } catch (error) {
    console.error("Error fetching interview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interview",
    });
  }
};
