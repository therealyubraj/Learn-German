import React from "react";
import { QuizView } from "./QuizView";

export function Quiz() {
  const isLoadingData = false;
  const error = null;

  if (isLoadingData) {
    return <div>Loading quiz...</div>;
  }

  if (error) {
    return <div>Error loading quiz.</div>;
  }

  return <QuizView />;
}
