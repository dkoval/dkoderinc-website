import { useState, useEffect, memo } from 'react';
import { PAGE_LOAD_TIME, formatUptime } from '../constants';

const Uptime = memo(() => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span style={{ color: 'var(--terminal-primary)' }}>{formatUptime(uptime)}</span>;
});

Uptime.displayName = 'Uptime';

export default Uptime;
