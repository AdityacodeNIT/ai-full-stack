import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api.js";

export default function Tickets() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTickets, setFetchingTickets] = useState(true);
  const [filterStatus, setFilterStatus] = useState("current"); // 'current' or 'succeeded'

  const fetchTickets = async (statusFilter) => {
    setFetchingTickets(true);
    try {
      const url = statusFilter === "succeeded"
        ? `/ticket?status=succeeded`
        : `/ticket`; // Default to all or 'in progress'
      
      const res = await api.get(url);
      const data = res.data;
      console.log(data);
      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      alert("Failed to fetch tickets.");
    } finally {
      setFetchingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets(filterStatus);
  }, [filterStatus]); // Refetch when filterStatus changes

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/ticket', form);

      if (res.status === 200 || res.status === 201) {
        setForm({ title: "", description: "" });
        fetchTickets(filterStatus); // Refresh list with current filter
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Ticket creation failed";
      alert(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto md:p-8">
      <h2 className="text-3xl font-extrabold mb-6 text-center md:text-left text-base-content">
        Create New Ticket
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-10 p-6 bg-base-200 shadow-xl rounded-lg fade-in">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content">Ticket Title</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g., Database connection issue"
            className="input input-bordered w-full bg-base-100 text-base-content"
            required
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content">Ticket Description</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the issue in detail..."
            className="textarea textarea-bordered w-full bg-base-100 text-base-content h-32"
            required
          ></textarea>
        </div>
        <button
          className="btn btn-primary w-full md:w-auto"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            "Submit Ticket"
          )}
        </button>
      </form>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-base-content">
          {filterStatus === "current" ? "Current Tickets" : "Past Tickets"}
        </h2>
        <div role="tablist" className="tabs tabs-boxed">
          <a
            role="tab"
            className={`tab ${filterStatus === "current" ? "tab-active" : ""}`}
            onClick={() => setFilterStatus("current")}
          >
            Current
          </a>
          <a
            role="tab"
            className={`tab ${filterStatus === "succeeded" ? "tab-active" : ""}`}
            onClick={() => setFilterStatus("succeeded")}
          >
            Past
          </a>
        </div>
      </div>

      {fetchingTickets ? (
        <div className="flex justify-center items-center h-48">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-4 text-lg text-base-content">Loading tickets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <Link
                key={ticket._id}
                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-lg p-6 text-base-content transform hover:-translate-y-1 transition-transform duration-300"
                to={`/ticket/${ticket._id}`}
              >
                <h3 className="font-bold text-xl text-primary mb-2">
                  {ticket.title}
                </h3>
                <p className="text-sm text-base-content mb-4 line-clamp-3">
                  {ticket.description}
                </p>
                <div className="card-actions justify-end">
                  <div className="badge badge-outline">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                  {ticket.status && (
                    <div className={`badge ${ticket.status === 'succeeded' ? 'badge-success' : 'badge-info'}`}>
                      {ticket.status}
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-lg text-base-content col-span-full">
              No {filterStatus === "current" ? "current" : "past"} tickets found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
