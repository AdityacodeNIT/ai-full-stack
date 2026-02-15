import User from "../../models/user.model.js"
import { logger } from "../../utils/logger.js";


export class UserSkillService{
    async updateSkills(clerkUserId,finalReport){
        if(!finalReport?.overallScore)return;

    const user=await User.findOne({clerkUserId});

      if (!user) {
      logger.warn("User not found for skill update:", clerkUserId);
      return;
    }

    logger.log(
      `Updating user skills (score: ${finalReport.overallScore})`
    );

  const skillsToUpdate = [
      ...(finalReport.strengths || []),
      ...(finalReport.areasForImprovement || []),
    ];

    for (const skill of skillsToUpdate) {
      const existingIndex = user.skills.findIndex(
        s => s.name.toLowerCase() === skill.toLowerCase()
      );

      if (existingIndex > -1) {
        user.skills[existingIndex].proficiency = finalReport.overallScore;
        user.skills[existingIndex].lastAssessed = new Date();
      } else {
        user.skills.push({
          name: skill,
          proficiency: finalReport.overallScore,
          lastAssessed: new Date(),
        });
      }
    }
    await user.save();

    logger.log(`Updated ${skillsToUpdate.length} skills for user`);
  }
}