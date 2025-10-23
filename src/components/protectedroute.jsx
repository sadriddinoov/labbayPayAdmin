import React, { useState, useEffect } from "react";
import { tokenName } from "../config/api";
import LoginModal from "../pages/login-modal.jsx";

export default function ProtectedRoute({ children, onAuthChange }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem(tokenName));
  const [isModalOpen, setIsModalOpen] = useState(!isAuthenticated);

  useEffect(() => {
    const token = localStorage.getItem(tokenName);
    setIsAuthenticated(!!token);
    setIsModalOpen(!token);
    if (onAuthChange) {
      onAuthChange(!!token);
    }
  }, [onAuthChange]);

  const handleModalClose = (open) => {
    setIsModalOpen(open);
    const token = localStorage.getItem(tokenName);
    setIsAuthenticated(!!token);
    if (onAuthChange) {
      onAuthChange(!!token); 
    }
  };

  if (!isAuthenticated) {
    return <LoginModal open={isModalOpen} onOpenChange={handleModalClose} />;
  }

  return children;
}