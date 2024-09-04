<template>
    <div class="music-player">
      <!-- Header Section -->
      <div class="header">
        <h2>Music Player</h2>
      </div>
  
      <!-- Album Art and Song Info Section -->
        <div class="current-song">
        <!-- <img :src="currentSong.image" alt="Album Art" class="album-art" /> -->
        <div id="ytplayer" ref="ytplayer"></div>
        <div class="song-info">
          <h3 class="song-title">{{ currentSong.title }}</h3>
          <p class="song-artist">{{ currentSong.artist }}</p>
        </div>
      </div>
  
      <!-- Controls Section -->
      <div class="controls">
        <button @click="prevSong" class="control-button">⏮️</button>
        <button @click="togglePlayPause" class="control-button">
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        <button @click="nextSong" class="control-button">⏭️</button>
      </div>
  
      <!-- Progress Bar Section -->
      <div class="progress-bar">
        <input type="range" v-model="currentTime" :max="duration" @input="seek" />
      </div>
  
      <!-- Playlist Section -->
      <div class="playlist">
        <!-- <h4>Playlist</h4> -->
        <ul>
          <li v-for="(song, index) in playlist" :key="index" @click="playSong(index)" :class="{ active: index === currentIndex }">
            <span>{{ song.title }} - {{ song.artist }}</span>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
<script setup>
import { ref } from 'vue';

const ytplayer = ref(null);

const currentSong = ref({
    image: 'https://via.placeholder.com/150',
    title: 'Sample Song',
    artist: 'Sample Artist',
});

const playlist = ref([
    { title: 'Sample Song', artist: 'Sample Artist' },
    { title: 'Another Song', artist: 'Another Artist' },
    { title: 'Third Song', artist: 'Third Artist' },
    { title: 'Sample Song', artist: 'Sample Artist' },
    { title: 'Another Song', artist: 'Another Artist' },
    { title: 'Third Song', artist: 'Third Artist' },
    { title: 'Sample Song', artist: 'Sample Artist' },
    { title: 'Another Song', artist: 'Another Artist' },
    { title: 'Third Song', artist: 'Third Artist' },
]);

const edit_yt = async () => {
    const videoID = 'SrSvd4BFTFI';
    ytlink = `https://www.youtube.com/embed/${videoID}?autoplay=1`;

    let yt_index = ytlist.value.findIndex(e => e.videoID === videoID);
    vid = yt_index;

    await nextTick();
    const player = new YT.Player('ytplayer', {
        height: 390,
        width: 640,
        videoId: videoID,
        events: {
            'onReady': (event) => event.target.playVideo(),
        },
    });

    setTimeout(() => {
        vt_title = player.getVideoData().title;
        n.videoTitle = vt_title;
    }, 2000);
};

const currentIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(180);

const playSong = (index) => {
    currentIndex.value = index;
    currentSong.value = playlist.value[index];
    isPlaying.value = true;
    edit_yt();
};

const togglePlayPause = () => {
isPlaying.value = !isPlaying.value;
};

const prevSong = () => {
    currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length;
    playSong(currentIndex.value);
};

const nextSong = () => {
currentIndex.value = (currentIndex.value + 1) % playlist.value.length;
playSong(currentIndex.value);
};

const seek = (event) => {
currentTime.value = event.target.value;
// Handle seeking logic here
};
</script>
  
  <style scoped>
  .music-player {
    max-width: 400px;
    /* overflow: hidden; */
    margin: 0 auto;
    padding: 20px;
    border-radius: 10px;
    background-color: #f0f0f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .header h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
  }
  
  .current-song {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .album-art {
    width: 100px;
    height: 100px;
    border-radius: 10px;
    margin-right: 15px;
  }
  
  .song-info {
    flex-grow: 1;
  }
  
  .song-title {
    font-size: 18px;
    font-weight: bold;
    color: #444;
    margin: 0;
  }
  
  .song-artist {
    color: #777;
    margin: 5px 0 0 0;
  }
  
  .controls {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
  }
  
  .control-button {
    background-color: #007bff;
    border: none;
    color: white;
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .control-button:hover {
    background-color: #0056b3;
  }
  
  .progress-bar input[type="range"] {
    width: 100%;
    cursor: pointer;
  }
  
  .playlist {
    background-color: #fff;
    border-radius: 10px;
    padding: 15px;
    margin-top: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-height: 180px;
    overflow-y: auto;
  }
  
  .playlist h4 {
    margin: 0 0 15px;
    font-size: 16px;
    color: #333;
  }
  
  .playlist ul {
    list-style: none;
    padding: 0;
    margin: 0;
    color: #555;
  }
  
  .playlist li {
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 10px;
    cursor: pointer;
    background-color: #f9f9f9;
    transition: background-color 0.3s;
  }
  
  .playlist li.active,
  .playlist li:hover {
    background-color: #007bff;
    color: #fff;
  }
  </style>
  