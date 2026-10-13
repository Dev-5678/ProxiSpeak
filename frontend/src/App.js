import React from 'react';
import CampusMap from './CampusMap';
import './App.css';

function App() {
  return (
    <div style={{ textAlign: 'center', backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc', padding: '20px' }}>
      <h1>ProxiSpeak: Virtual Campus Workspace</h1>
      <p>Use WASD or Arrow Keys to move your avatar across the grid</p>
      <CampusMap />
    </div>
  );
}

export default App;