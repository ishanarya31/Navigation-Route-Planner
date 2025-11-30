import React, { useState } from 'react';
import './CommandsDisplay.css';

const CommandsDisplay = ({ commands }) => {
  const [copied, setCopied] = useState(false);

  const getCommandIcon = (type) => {
    switch (type) {
      case 'forward':
        return '⬆️';
      case 'backward':
        return '⬇️';
      case 'right_turn':
        return '↪️';
      case 'left_turn':
        return '↩️';
      case 'right_u_turn':
        return '↻';
      case 'left_u_turn':
        return '↺';
      default:
        return '📍';
    }
  };

  const getCommandLabel = (type) => {
    switch (type) {
      case 'forward':
        return 'Forward';
      case 'backward':
        return 'Backward';
      case 'right_turn':
        return 'Right Turn';
      case 'left_turn':
        return 'Left Turn';
      case 'right_u_turn':
        return 'Right U-Turn';
      case 'left_u_turn':
        return 'Left U-Turn';
      default:
        return type;
    }
  };

  const formatDistance = (km) => {
    if (km < 0.1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  const handleCopy = () => {
    const commandsArray = commands.map(cmd => cmd.type);
    const commandsString = JSON.stringify(commandsArray, null, 2);
    
    navigator.clipboard.writeText(commandsString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getCommandsArray = () => {
    return commands.map(cmd => cmd.type);
  };

  return (
    <div className="commands-display">
      <h2>Navigation Commands</h2>
      
      <div className="commands-list">
        {commands.length === 0 ? (
          <p className="no-commands">No commands generated</p>
        ) : (
          commands.map((command, index) => (
            <div key={index} className="command-item">
              <div className="command-icon">{getCommandIcon(command.type)}</div>
              <div className="command-details">
                <div className="command-type">{getCommandLabel(command.type)}</div>
                {command.distance && (
                  <div className="command-distance">
                    {formatDistance(command.distance)}
                  </div>
                )}
                {command.angle !== undefined && command.angle !== 0 && (
                  <div className="command-angle">
                    {Math.abs(command.angle).toFixed(1)}°
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {commands.length > 0 && (
        <>
          <div className="commands-array">
            <h3>Commands Array:</h3>
            <pre>{JSON.stringify(getCommandsArray(), null, 2)}</pre>
          </div>
          
          <button onClick={handleCopy} className="btn-copy">
            {copied ? '✓ Copied!' : '📋 Copy Commands Array'}
          </button>
        </>
      )}
    </div>
  );
};

export default CommandsDisplay;

