
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AiAssistant } from './components/AiAssistant';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      {/* 
          In a standalone embed, we might want to notify the parent 
          page when the chatbot is opened/closed to adjust iframe sizing.
      */}
      <div className="w-full h-full flex items-end justify-end">
        <AiAssistant />
      </div>
    </React.StrictMode>
  );
}
