import User from "../models/user.model.js";
import Interview from "../models/interview.js";
import ApiError from "../utils/apiError.js";

export const DashBoardStatistics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInterviews = await Interview.countDocuments();
    const completedInterviews = await Interview.countDocuments({
      status: "completed",
    });
    const inProgressInterviews = await Interview.countDocuments({
      status: "in-progress",
    });

    const interviewsWithViolations = await Interview.find({
      "proctoringViolations.0": { $exists: true },
    });

    const totalViolations = interviewsWithViolations.reduce(
      (sum, interview) => {
        return sum + (interview.proctoringViolations?.length || 0);
      },
      0,
    );

    // Get violation breakdown
    const violationTypes = {};
    interviewsWithViolations.forEach((interview) => {
      interview.proctoringViolations?.forEach((v) => {
        violationTypes[v.type] = (violationTypes[v.type] || 0) + 1;
      });
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInterviews = await Interview.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      totalUsers,
      totalInterviews,
      completedInterviews,
      inProgressInterviews,
      totalViolations,
      violationTypes,
      recentActivity: {
        interviews: recentInterviews,
        users: recentUsers,
      },
    });
  } catch (error) {
    next(new ApiError(500, "Failed to fetch statistics"));
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-__v").lean();
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const interviews = await Interview.find({ userId: user.clerkUserId });

        const totalInterviews = interviews.length;
        const completedInterviews = interviews.filter(
          (i) => i.status === "completed",
        ).length;

        // Calculate average score
        const completedWithScores = interviews.filter(
          (i) => i.status === "completed" && i.finalReport?.overallScore,
        );
        const avgScore =
          completedWithScores.length > 0
            ? completedWithScores.reduce(
                (sum, i) => sum + i.finalReport.overallScore,
                0,
              ) / completedWithScores.length
            : null;

        // Count violations
        const totalViolations = interviews.reduce((sum, i) => {
          return sum + (i.proctoringViolations?.length || 0);
        }, 0);

        return {
          ...user,
          stats: {
            totalInterviews,
            completedInterviews,
            avgScore: avgScore ? Math.round(avgScore) : null,
            totalViolations,
          },
        };
      }),
    );

    res.json(usersWithStats);
  } catch (err) {
    next(new ApiError(500, "Failed to fetch users with stats"));
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { clerkUserId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["user", "moderator", "admin"];
    if (!validRoles.includes(role)) {
      return res
        .status(400)
        .json({ error: "Invalid role. Must be: user, moderator, or admin" });
    }

    // Update in Clerk (source of truth)
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: { role },
    });

    // Update in MongoDB
    await User.findOneAndUpdate({ clerkUserId }, { role }, { new: true });

    console.log(` Updated role for ${clerkUserId} to ${role}`);
    res.json({ success: true, role });
  } catch (error) {
    next(new ApiError(500, "Failed to update user role"));
  }
};

export const getUserInfo = async (req, res, next) => {
  try {
    const { clerkUserId } = req.params;

    const user = await User.findOne({ clerkUserId }).select("-__v").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const interviews = await Interview.find({ userId: clerkUserId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      user,
      interviews,
    });
  } catch (error) {
    next(new ApiError(500, "Failed to fetch User Details"));
  }
};

export const getViolations = async (req, res, next) => {
  try {
    const interviews = await Interview.find({
      "proctoringViolations.0": { $exists: true },
    })
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .lean();

    // Get user info for each interview
    const interviewsWithUsers = await Promise.all(
      interviews.map(async (interview) => {
        const user = await User.findOne({ clerkUserId: interview.userId });
        return {
          ...interview,
          userEmail: user?.email || "Unknown",
          userName: user?.name || "Unknown",
        };
      }),
    );

    res.json(interviewsWithUsers);
  } catch (error) {
    next(new ApiError(500, "Failed to fetch voilations"));
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const completedInterviews = await Interview.find({
      status: "completed",
      "finalReport.overallScore": { $exists: true },
    }).lean();

    // Score distribution
    const scoreRanges = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    completedInterviews.forEach((interview) => {
      const score = interview.finalReport.overallScore;
      if (score <= 20) scoreRanges["0-20"]++;
      else if (score <= 40) scoreRanges["21-40"]++;
      else if (score <= 60) scoreRanges["41-60"]++;
      else if (score <= 80) scoreRanges["61-80"]++;
      else scoreRanges["81-100"]++;
    });

    // Average scores by level
    const scoresByLevel = {};
    completedInterviews.forEach((interview) => {
      const level = interview.level;
      if (!scoresByLevel[level]) {
        scoresByLevel[level] = { total: 0, count: 0 };
      }
      scoresByLevel[level].total += interview.finalReport.overallScore;
      scoresByLevel[level].count++;
    });

    const avgScoresByLevel = {};
    Object.keys(scoresByLevel).forEach((level) => {
      avgScoresByLevel[level] = Math.round(
        scoresByLevel[level].total / scoresByLevel[level].count,
      );
    });

    // Interviews over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentInterviews = await Interview.find({
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select("createdAt status")
      .lean();

    // Group by date
    const interviewsByDate = {};
    recentInterviews.forEach((interview) => {
      const date = interview.createdAt.toISOString().split("T")[0];
      interviewsByDate[date] = (interviewsByDate[date] || 0) + 1;
    });

    res.json({
      scoreDistribution: scoreRanges,
      avgScoresByLevel,
      interviewsByDate,
      totalCompleted: completedInterviews.length,
    });
  } catch {
    next(new ApiError(500, "Failed to fetch analytics"));
  }
};
