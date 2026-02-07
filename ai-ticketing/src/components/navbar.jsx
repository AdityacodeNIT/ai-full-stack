import { Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  SignUpButton,
  useUser,
} from "@clerk/clerk-react";

export default function Navbar() {
  const { user } = useUser();
  const appName = "AI Interview Assistant";

  return (
    <div className="navbar bg-base-300 text-base-content shadow-lg">
      {/* LEFT */}
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            ☰
          </div>

          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52"
          >
            <SignedOut>
              <li><SignUpButton mode="modal" /></li>
              <li><SignInButton mode="modal" /></li>
            </SignedOut>

            <SignedIn>
              <li><Link to="/interview">New Interview</Link></li>
              <li><Link to="/interviews">Past Interviews</Link></li>

              {/* Example role check */}
              {user?.publicMetadata?.role === "admin" && (
                <li><Link to="/admin">Admin</Link></li>
              )}
            </SignedIn>
          </ul>
        </div>

        <Link to="/" className="btn btn-ghost text-xl font-bold text-primary">
          {appName}
        </Link>
      </div>

      {/* CENTER */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <SignedOut>
            <li><SignUpButton mode="modal" /></li>
            <li><SignInButton mode="modal" /></li>
          </SignedOut>

          <SignedIn>
            <li><Link to="/interview">New Interview</Link></li>
            <li><Link to="/interviews">Past Interviews</Link></li>

            {user?.publicMetadata?.role === "admin" && (
              <li><Link to="/admin">Admin</Link></li>
            )}
          </SignedIn>
        </ul>
      </div>

      {/* RIGHT */}
      <div className="navbar-end">
        <SignedIn>
          <div className="flex items-center gap-2">
            <p className="text-sm hidden md:block">
              Hi, {user?.primaryEmailAddress?.emailAddress}
            </p>
           <UserButton/>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
