import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../auth/auth";
import "./Navbar.css";

import rcLogo from "../assets/rc-logo.png";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleLogoClick = () => {
    navigate("/question-hub");
  };

  return (
    <nav className="main-navbar">

      {/* =================================================
          RC LOGO
      ================================================= */}

      <div
        className="navbar-logo"
        onClick={handleLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            handleLogoClick();
          }
        }}
        aria-label="Go to Question Hub"
      >
        <img
          src={rcLogo}
          alt="RC Logo"
        />
      </div>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div className="navbar-links">

        <NavLink
          to="/instructions"
          className={({ isActive }) =>
            `navbar-link ${
              isActive ? "active" : ""
            }`
          }
        >
          INSTRUCTIONS
        </NavLink>


        <NavLink
          to="/question-hub"
          className={({ isActive }) =>
            `navbar-link ${
              isActive ? "active" : ""
            }`
          }
        >
          QUESTION HUB
        </NavLink>


        <NavLink
          to="/leaderboard"
          className={({ isActive }) =>
            `navbar-link ${
              isActive ? "active" : ""
            }`
          }
        >
          LEADERBOARD
        </NavLink>

      </div>


      {/* =================================================
          LOGOUT
      ================================================= */}

      <button
        type="button"
        className="navbar-logout"
        onClick={handleLogout}
      >
        LOGOUT
      </button>

    </nav>
  );
}

export default Navbar;