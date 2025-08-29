import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const token = localStorage.getItem("token");
  let user = localStorage.getItem("user");
  if (user) {
    user = JSON.parse(user);
  }
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const appName = "IntelliTicket"; // Suggested new name

  return (
    <div className="navbar bg-base-300 text-base-content shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52"
          >
            {!token ? (
              <>
                <li>
                  <Link to="/signup">Signup</Link>
                </li>
                <li>
                  <Link to="/login">Login</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/tickets">Tickets</Link>
                </li>
                <li>
                  <Link to="/interview">New Interview</Link>
                </li>
                <li>
                  <Link to="/interviews">Past Interviews</Link>
                </li>
                {user && user?.role === "admin" && (
                  <li>
                    <Link to="/admin">Admin</Link>
                  </li>
                )}
                <li>
                  <button onClick={logout}>Logout</button>
                </li>
              </>
            )}
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost text-xl font-bold text-primary">
          {appName}
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          {!token ? (
            <>
              <li>
                <Link to="/signup">Signup</Link>
              </li>
              <li>
                <Link to="/login">Login</Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/tickets">Tickets</Link>
              </li>
              <li>
                <Link to="/interview">New Interview</Link>
              </li>
              <li>
                <Link to="/interviews">Past Interviews</Link>
              </li>
              {user && user?.role === "admin" && (
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              )}
            </>
          )}
        </ul>
      </div>
      <div className="navbar-end">
        {token && (
          <div className="flex items-center gap-2">
            <p className="text-sm hidden md:block">Hi, {user?.email}</p>
            <button onClick={logout} className="btn btn-sm btn-outline btn-error hidden lg:flex">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
