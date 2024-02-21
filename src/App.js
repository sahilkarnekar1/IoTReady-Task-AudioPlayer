import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentAudioSrc, setCurrentAudioSrc] = useState(null);

  const retrieveAudioFiles = () => {
    if (db) {
      const transaction = db.transaction(['audios'], 'readonly');
      const objectStore = transaction.objectStore('audios');
      const request = objectStore.getAll();

      request.onerror = event => {
        setError('Error retrieving audio files from database');
      };

      request.onsuccess = event => {
        setAudioFiles(request.result);
      };
    }
  };

  useEffect(() => {
    const request = indexedDB.open('audioDB', 1);

    request.onerror = event => {
      setError('Error opening database');
    };

    request.onsuccess = event => {
      setDb(event.target.result);
    };

    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore('audios', { keyPath: 'id', autoIncrement: true });
    };
  }, []);

  useEffect(() => {
    if (db) {
      retrieveAudioFiles();
    }
  }, [db]);

  useEffect(() => {
    const storedAudioSrc = localStorage.getItem('currentAudioSrc');
    if (storedAudioSrc) {
      setCurrentAudioSrc(storedAudioSrc);
    }
  }, []);

  const handleFileInputChange = async event => {
    const file = event.target.files[0];

    try {
      const binaryData = await readFileAsBinary(file);
      const transaction = db.transaction(['audios'], 'readwrite');
      const objectStore = transaction.objectStore('audios');
      const request = objectStore.add(binaryData);

      request.onerror = event => {
        console.error('Error adding audio file to database');
      };

      request.onsuccess = event => {
        console.log('Audio file added to database');
        retrieveAudioFiles(); 
      };
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const readFileAsBinary = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        resolve(event.target.result);
      };
      reader.onerror = error => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const playAudio = (audioUrl, index) => {
    setCurrentAudioSrc(audioUrl);
    setCurrentAudioIndex(index);
    localStorage.setItem('currentAudioSrc', audioUrl);
  };

  const playNextAudio = () => {
    const nextIndex = (currentAudioIndex + 1) % audioFiles.length;
    const nextAudioUrl = URL.createObjectURL(new Blob([audioFiles[nextIndex]]));
    playAudio(nextAudioUrl, nextIndex);
  };

  return (
    <div>
      <div className="input-group mb-3">
        <input type="file" accept="audio/*" onChange={handleFileInputChange} className="form-control" />
      </div>
      {error && <div>{error}</div>}
      <ul className="list-group">
        {audioFiles.map((audio, index) => (
          <li key={index} className="list-group-item" onClick={() => playAudio(URL.createObjectURL(new Blob([audio])), index)}>
            {`Audio ${index + 1}`}
          </li>
        ))}
      </ul>
      {currentAudioSrc && (
        <div>
          <audio
            controls
            src={currentAudioSrc}
            autoPlay
            onTimeUpdate={(e) => localStorage.setItem('playbackPosition', e.target.currentTime)}
            onLoadedMetadata={(e) => {
              const storedPlaybackPosition = parseFloat(localStorage.getItem('playbackPosition'));
              if (storedPlaybackPosition) {
                e.target.currentTime = storedPlaybackPosition;
              }
            }}
            onEnded={playNextAudio} // Trigger playNextAudio function when current audio ends
          />
        </div>
      )}
    </div>
  );
};

export default App;
