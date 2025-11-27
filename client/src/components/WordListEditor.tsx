import React from 'react';

const WordListEditor: React.FC = () => {
  return (
    <div>
      <h1>Word List Editor</h1>
      <input type="text" placeholder="Word list name" />
      <textarea placeholder="Paste JSON here"></textarea>
      <button>Save</button>
    </div>
  );
};

export default WordListEditor;
