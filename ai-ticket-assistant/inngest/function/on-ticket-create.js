import { inngest } from "../client.js";
import Ticket from "../../models/ticket.model.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import User from "../../models/user.model.js";
import analyzeTicket from "../../utils/aiAgent.js";


export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      
      // 1. Fetch the ticket from DB
      const ticketobj = await step.run("fetch-ticket", async () => {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          throw new NonRetriableError("ticket does not exist");
        }
        return ticket;
      });

      console.log("obj",ticketobj)

      // 2. Update ticket status to "TODO"
      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticketobj._id, {
          status: "TODO",
        });
      });

      // 3. Use AI to analyze ticket
    console.log(ticketobj);
    console.log("🚀 analyzeTicket() was called");

      const aiResponse = await analyzeTicket(ticketobj);
   

      // 4. Save AI results to ticket
      const SkillsRelated = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          const priority = ["low", "medium", "high"].includes(aiResponse.priority)
            ? aiResponse.priority
            : "medium";

          await Ticket.findByIdAndUpdate(ticketobj._id, {
            priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills,
          });

          skills = aiResponse.relatedSkills || [];
        }
        return skills;
      });

      // 5. Assign a moderator
      const moderator = await step.run("assign-moderator", async () => {
        let user = await User.findOne({
          role: "moderator",
          skills: {
            $elemMatch: {
              $regex: SkillsRelated.join("|"),
              $options: "i",
            },
          },
        });

        if (!user) {
          user = await User.findOne({ role: "admin" }); // ❌ Fix: "admin" must be in quotes
        }

        await Ticket.findByIdAndUpdate(ticketobj._id, {
          assignedTo: user?._id || null,
        });

        return user;
      });
      console.log(moderator);

      // 6. Email notification
      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalticket = await Ticket.findById(ticketobj._id);
          await sendMail(
            moderator.email,
            "TICKET-ASSIGNED",
            `A new ticket has been assigned to you: ${finalticket.title}`
          );
        }
      });

      return { success: true };

    } catch (e) {
      console.error("❌ error running step:", e.message);
      return { success: false };
    }
  }
);
