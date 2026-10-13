import React, { useState, useEffect } from 'react';

const CampusMap = () => {
  const [position, setPosition] = useState({ x: 200, y: 200 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const speed = 12;
      
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newY -= speed;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newY += speed;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') newX -= speed;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') newX += speed;

        // Boundaries matching the 800x600 canvas
        newX = Math.max(0, Math.min(newX, 760)); 
        newY = Math.max(0, Math.min(newY, 560));

        return { x: newX, y: newY };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={styles.mapContainer}>
      <div 
        style={{
          ...styles.avatar,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        You
      </div>
    </div>
  );
};

const styles = {
  mapContainer: {
    width: '800px',
    height: '600px',
    backgroundColor: '#0f172a',
    border: '2px solid #334155',
    position: 'relative',
    overflow: 'hidden',
    margin: '30px auto',
    borderRadius: '12px',
    backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  },
  avatar: {
    width: '36px',
    height: '36px',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    borderRadius: '50%',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    transition: 'left 0.08s linear, top 0.08s linear',
    boxShadow: '0 0 12px rgba(2, 132, 199, 0.7)'
  }
};

export default CampusMap;