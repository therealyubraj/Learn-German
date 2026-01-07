import { Link } from "react-router-dom";
import React from "react";

export function Navbar() {
  return (
    <nav className="absolute top-0 left-0 w-full bg-gray-800/50 p-4">
      <div className="container mx-auto">
        <Link to="/">
          <span className="text-xl text-white hover:text-blue-400 transition-colors">
            &larr; Home
          </span>
        </Link>
      </div>
    </nav>
  );
}
