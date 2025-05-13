//hooks/use-vapi.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
 
const publicKey = bb623861-73db-4dba-8ee2-d5dd24098849; // Replace with your actual public key
const assistantId = 877006ae-b97c-43a9-9086-5e95409aefd1; // Replace with your actual assistant ID
 
const useVapi = () => {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [conversation, setConversation] = useState<{ role: string, text: string }[]>([]);
  const vapiRef = useRef<any>(null);
 
  const initializeVapi = useCallback(() => {
    if (!vapiRef.current) {
      const vapiInstance = new Vapi(publicKey);
      vapiRef.current = vapiInstance;
 
      vapiInstance.on('call-start', () => {
        setIsSessionActive(true);
      });
 
      vapiInstance.on('call-end', () => {
        setIsSessionActive(false);
        setConversation([]); // Reset conversation on call end
      });
 
      vapiInstance.on('volume-level', (volume: number) => {
        setVolumeLevel(volume);
      });
 
      vapiInstance.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          setConversation((prev) => [
            ...prev,
            { role: message.role, text: message.transcript },
          ]);
        }
      });
 
      vapiInstance.on('error', (e: Error) => {
        console.error('Vapi error:', e);
      });
    }
  }, []);
 
  useEffect(() => {
    initializeVapi();
 
    // Cleanup function to end call and dispose Vapi instance
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, [initializeVapi]);
 
  const toggleCall = async () => {
    try {
      if (isSessionActive) {
        await vapiRef.current.stop();
      } else {
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      console.error('Error toggling Vapi session:', err);
    }
  };
 
  return { volumeLevel, isSessionActive, conversation, toggleCall };
};
 
export default useVapi;
