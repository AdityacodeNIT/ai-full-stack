import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.model.js";
import { onTicketCreated } from "../inngest/function/on-ticket-create.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }
    const newTicket =await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });
    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query; // Get status from query parameters
    console.log(user);
    let tickets = [];
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (user.role !== "user") {
      tickets = await Ticket.find(filter)
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      filter.createdBy = user._id;
      tickets = await Ticket.find(filter)
        .select("title description status createdAt")
        .sort({ createdAt: -1 });
    }
    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(req.params.id).populate("assignedTo", [
        "email",
        "_id",
      ]);
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      }).select("title description status createdAt");
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Only allow specific status updates, e.g., to 'succeeded'
    if (status === "succeeded") {
      ticket.status = status;
      await ticket.save();
      return res.status(200).json({ message: "Ticket status updated successfully", ticket });
    } else {
      return res.status(400).json({ message: "Invalid status update" });
    }
  } catch (error) {
    console.error("Error updating ticket status", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
