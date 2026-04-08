import { Link, useLocation } from "react-router-dom";
import React from "react";

export function Navbar() {
  const location = useLocation();

  if (location.pathname === "/") {
    return null;
  }

  return (
    <nav className="absolute top-0 left-0 z-10 w-full border-b border-[#30363D] bg-[#0D1117]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-4">
        <Link to="/">
          <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#8B949E] transition-colors hover:bg-[#00C896]/8 hover:text-[#00FF9C]">
            <span aria-hidden="true">&larr;</span>
            <span>Home</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
