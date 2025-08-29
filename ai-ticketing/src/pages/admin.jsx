import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) fetchUsers();
    console.log("useEffect running with token:", token);
  }, [token]);

  const fetchUsers = async () => {
    console.log("📡 fetchUsers() called");
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/auth/getusers`,
        {
         
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("🧾 Response received:", res);

      const data = await res.data;
      console.log(data);
      if (res.status === 200) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills.map(s => s.name).join(", "),
    });
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/updateUser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editingUser,
            role: formData.role,
            skills: formData.skills
              .split(",")
              .map(skill => ({
                name: skill.trim(),
                level: "Beginner", // default or choose from UI
                verified: false
              }))
              .filter(s => s.name),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Failed to update user");
        return;
      }

      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredUsers(
      users.filter((user) => user.email.toLowerCase().includes(query))
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Admin Panel - Manage Users</h1>
      <input
        type="text"
        className="input input-bordered w-full mb-6"
        placeholder="Search by email"
        value={searchQuery}
        onChange={handleSearch}
      />
      {filteredUsers.map((user) => (
        <div
          key={user._id}
          className="bg-base-100 shadow rounded p-4 mb-4 border"
        >
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Current Role:</strong> {user.role}</p>
          <p>
            <strong>Skills:</strong>{" "}
            {user.skills && user.skills.length > 0
              ? user.skills.map(s => s.name).join(", ")
              : "N/A"}
          </p>

          {editingUser === user.email ? (
            <div className="mt-4 space-y-2">
              <select
                className="select select-bordered w-full"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>

              <input
                type="text"
                placeholder="Comma-separated skills"
                className="input input-bordered w-full"
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
              />

              <div className="flex gap-2">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleUpdate}
                >
                  Save
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm mt-2"
              onClick={() => handleEditClick(user)}
            >
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
