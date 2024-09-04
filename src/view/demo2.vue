<template>
    <div class="music-player-container">
      <div class="header">
        <div class="avatar-section">
          <img src="https://via.placeholder.com/40" alt="User Avatar" class="user-avatar">
        </div>
        <h1 class="title">My Music Player</h1>
      </div>
  
      <div class="main-content">
        <div class="now-playing">
          <img :src="currentTrack.cover" alt="Album Cover" class="album-cover">
          <div class="track-info">
            <h2 class="track-title">{{ currentTrack.title }}</h2>
            <p class="track-artist">{{ currentTrack.artist }}</p>
          </div>
        </div>
  
        <div class="controls">
          <button @click="prevTrack">Prev</button>
          <button @click="playPauseTrack">{{ isPlaying ? 'Pause' : 'Play' }}</button>
          <button @click="nextTrack">Next</button>
        </div>
        
        <div class="playlist">
          <ul>
            <li v-for="(track, index) in tracks" :key="track.id" @click="selectTrack(index)" :class="{ active: index === currentTrackIndex }">
              <img :src="track.cover" alt="Album Cover" class="playlist-cover">
              <div class="playlist-info">
                <h3 class="playlist-title">{{ track.title }}</h3>
                <p class="playlist-artist">{{ track.artist }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // Sample data
  const tracks = ref([
    { id: 1, title: 'Song One', artist: 'Artist One', cover: 'https://via.placeholder.com/50' },
    { id: 2, title: 'Song Two', artist: 'Artist Two', cover: 'https://via.placeholder.com/50' },
    { id: 3, title: 'Song Three', artist: 'Artist Three', cover: 'https://via.placeholder.com/50' },
    // Add more tracks as needed
  ]);
  
  const currentTrackIndex = ref(0);
  const currentTrack = ref(tracks.value[currentTrackIndex.value]);
  const isPlaying = ref(false);
  
  const selectTrack = (index) => {
    currentTrackIndex.value = index;
    currentTrack.value = tracks.value[index];
    // Play the selected track
  };
  
  const prevTrack = () => {
    if (currentTrackIndex.value > 0) {
      selectTrack(currentTrackIndex.value - 1);
    }
  };
  
  const nextTrack = () => {
    if (currentTrackIndex.value < tracks.value.length - 1) {
      selectTrack(currentTrackIndex.value + 1);
    }
  };
  
  const playPauseTrack = () => {
    isPlaying.value = !isPlaying.value;
    // Toggle play/pause functionality
  };
  </script>
  
  <style>
  .music-player-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #282c34;
    color: white;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  
  .avatar-section {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  
  .title {
    font-size: 24px;
    margin: 0;
    text-align: center;
    flex-grow: 1;
  }
  
  .main-content {
    display: flex;
    flex-direction: column;
  }
  
  .now-playing {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .album-cover {
    width: 80px;
    height: 80px;
    margin-right: 20px;
    border-radius: 10px;
  }
  
  .track-info {
    display: flex;
    flex-direction: column;
  }
  
  .track-title {
    font-size: 20px;
    margin: 0;
  }
  
  .track-artist {
    font-size: 16px;
    margin: 0;
    color: #bbb;
  }
  
  .controls {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  
  .controls button {
    margin: 0 10px;
    padding: 10px 20px;
    background-color: #61dafb;
    border: none;
    border-radius: 5px;
    color: #282c34;
    cursor: pointer;
  }
  
  .controls button:hover {
    background-color: #21a1f1;
  }
  
  .playlist {
    max-height: 200px;
    overflow-y: auto;
  }
  
  .playlist ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .playlist li {
    display: flex;
    align-items: center;
    padding: 10px;
    margin-bottom: 5px;
    background-color: #333;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .playlist li:hover {
    background-color: #444;
  }
  
  .playlist li.active {
    background-color: #61dafb;
  }
  
  .playlist-cover {
    width: 50px;
    height: 50px;
    margin-right: 15px;
    border-radius: 5px;
  }
  
  .playlist-info {
    display: flex;
    flex-direction: column;
  }
  
  .playlist-title {
    margin: 0;
    font-size: 16px;
  }
  
  .playlist-artist {
    margin: 0;
    font-size: 14px;
    color: #bbb;
  }
  </style>
  