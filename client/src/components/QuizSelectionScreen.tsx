import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../FS/Storage";
import type { Word, WordList } from "../types";

export function QuizSelectionScreen() {
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWordLists() {
      const lists = await storage.getAllLists();
      setWordLists(lists);
    }
    fetchWordLists();
  }, []);

  const handleCheckboxChange = (id: string) => {
    setSelectedLists((prev) =>
      prev.includes(id) ? prev.filter((listId) => listId !== id) : [...prev, id]
    );
  };

  const handleStartQuiz = () => {
    if (selectedLists.length === 0) {
      // TODO: Show an error message to the user
      return;
    }
    const idParams = selectedLists.join(",");
    navigate(`/quiz?lists=${idParams}`);
  };

  return (
    <div>
      <h1>Select Word Lists</h1>
      {wordLists.map((list) => (
        <div key={list.id}>
          <input
            type="checkbox"
            id={list.id}
            value={list.id}
            checked={selectedLists.includes(list.id)}
            onChange={() => handleCheckboxChange(list.id)}
          />
          <label htmlFor={list.id}>{list.name}</label>
        </div>
      ))}
      <button onClick={handleStartQuiz}>Start Quiz</button>
    </div>
  );
}
