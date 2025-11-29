import { Link, useNavigate } from "react-router-dom";
import { useNavigation } from "../contexts/NavigationContext";
import React from "react";

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (confirmNavigation()) {
      navigate(to);
    }
  };

  return <a href={to} onClick={handleClick}>{children}</a>;
};

export function Navbar() {
  return (
    <nav className="absolute top-0 left-0 w-full bg-gray-800/50 p-4">
      <div className="container mx-auto">
        <NavLink to="/">
          <span className="text-xl text-white hover:text-blue-400 transition-colors">
            &larr; Home
          </span>
        </NavLink>
      </div>
    </nav>
  );
}
