import { useState, useEffect, memo } from 'react';
import useIsMobile from '../hooks/useIsMobile';

const Clock = memo(() => {
  const isMobile = useIsMobile();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      {clock.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        ...(isMobile ? {} : { second: '2-digit' }),
      })}
    </span>
  );
});

Clock.displayName = 'Clock';

export default Clock;
