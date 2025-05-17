import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import useVapi from '@/hooks/use-vapi';

const FloatyWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { volumeLevel, isSessionActive, conversation, toggleCall } = useVapi();

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
      }}
    >
      {isOpen && (
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            marginBottom: '10px',
            width: '300px',
          }}
        >
          <h3>Vapi Widget</h3>
          <p>Volume Level: {volumeLevel}</p>
          <p>Session Active: {isSessionActive ? 'Yes' : 'No'}</p>
          <div>
            {conversation.map((message, index) => (
              <div key={index}>
                <strong>{message.role}:</strong> {message.text}
              </div>
            ))}
          </div>
        </div>
      )}
      <Button onClick={toggleCall} disabled={volumeLevel === null}>
        <Phone className="mr-2 h-4 w-4" />
        {isSessionActive ? 'End Call' : 'Start Call'}
      </Button>
    </div>
  );
};

export default FloatyWidget;
