import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../utils/api.js";

function Ticket() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/ticket/${id}`);
        console.log(res.data);
        setTicket(res.data.ticket);
      } catch (err) {
        console.error(err);
        const errorMessage = err.response?.data?.message || "Failed to fetch ticket";
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="ml-4 text-lg text-base-content">Loading ticket details...</p>
      </div>
    );
  if (!ticket)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-error">Ticket not found</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h2 className="text-3xl font-extrabold mb-6 text-center md:text-left text-base-content">
        Ticket Details
      </h2>

      <div className="card bg-base-200 shadow-xl rounded-lg p-6 space-y-4 text-base-content fade-in">
        <h3 className="text-2xl font-bold text-primary">{ticket.title}</h3>
        <p className="text-lg">{ticket.description}</p>

        {/* Conditionally render extended details */}
        {ticket.status && (
          <>
            <div className="divider my-4">Metadata</div>
            <div className="flex flex-wrap items-center gap-2">
              <p>
                <strong>Status:</strong>{" "}
                <span className="badge badge-lg badge-info">{ticket.status}</span>
              </p>
              {ticket.priority && (
                <p>
                  <strong>Priority:</strong>{" "}
                  <span className="badge badge-lg badge-warning">{ticket.priority}</span>
                </p>
              )}
            </div>

            {ticket.relatedSkills?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.map((skill, index) => (
                  <span key={index} className="badge badge-outline">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded-md p-4 bg-base-100 mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {ticket.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {ticket.assignedTo?.email}
              </p>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
            {ticket.status !== "succeeded" && (
              <div className="mt-6 text-right">
                <button
                  className="btn btn-success"
                  onClick={handleMarkAsSucceeded}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Mark as Succeeded"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  async function handleMarkAsSucceeded() {
    setLoading(true);
    try {
      const res = await api.put(`/ticket/${id}/status`, { status: "succeeded" });
      setTicket(res.data.ticket);
      alert("Ticket marked as succeeded!");
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Failed to update ticket status";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }
}

export default Ticket
