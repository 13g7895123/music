<template>
    <div class="container">
      <div class="header">
        <h3>Vue YouTube Player</h3>
        <h4>Video ID: {{ videoID }} — {{ vt_title }}</h4>
      </div>
  
      <div class="input-group">
        <label for="albumInput">Input YouTube Album:</label>
        <input id="albumInput" type="text" v-model="vt_album" @click="vt_album=''" class="input-field" placeholder="Enter album name">
      </div>
  
      <div class="input-group">
        <label for="titleInput">Input YouTube Title:</label>
        <input id="titleInput" type="text" v-model="vt_title" @click="vt_title=''" class="input-field" placeholder="Enter video title">
      </div>
  
      <div class="input-group">
        <label for="urlInput">Input YouTube URL:</label>
        <input id="urlInput" type="text" v-model="vt_url" @click="vt_url=''" class="input-field" placeholder="Enter YouTube URL">
      </div>
  
      <div class="button-group">
        <button class="btn" @click="add_yt">新增</button>
        <button class="btn" @click="record_yt">修改</button>
        <button class="btn" @click="delete_yt">刪除</button>
        <button class="btn" @click="change_yt">下一首</button>
        <button class="btn" @click="save_yt">下載清單</button>
        <label class="btn upload-btn">
          上傳清單
          <input type="file" id="jsnfile" name="jsnfile" @change="upload_yt" accept="*.json" hidden>
        </label>
      </div>
  
      <div class="video-player">
        <div id="ytplayer" ref="ytplayer"></div>
      </div>
  
      <table class="styled-table">
        <thead>
          <tr>
            <th>Video ID</th>
            <th>Video Title</th>
            <th>Album Title</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="x in ytlist" :key="x.videoID">
            <td @click="edit_yt(x)" class="clickable-cell">{{ x.videoID }}</td>
            <td>{{ x.videoTitle }}</td>
            <td>{{ x.albumName }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script setup>
  import { ref, nextTick } from 'vue';
  
  let vt_url = "https://www.youtube.com/watch?v=FqCw7gCTZQs&pp=ygUP5LmZ5aWz44Gp44KC44KI";
  let vt_album = "Vue YouTube Player";
  let vt_title = "";
  let videoID = "";
  let ytlink = "";
  let vid = 0;
  let jsn_data = "";
  let ytlist = ref([
    { videoID: "Ptk_1Dc2iPY", videoTitle: "Canon in D - Cello & Piano", albumName: "Canon" },
    { videoID: "7051Y4WVFJA", videoTitle: "2 Hours Of Canon in D by Pachelbel", albumName: "Canon" }
  ]);
  const ytplayer = ref(null);
  
  const add_yt = async () => {
    let str = vt_url;
    let urlParams = new URLSearchParams(str.split("?")[1]);
    let vid = urlParams.get("v");
    if (vid) {
      videoID = vid;
    } else {
      let f1 = str.indexOf("?");
      if (f1 !== -1) {
        str = str.split("?")[0];
      }
      let f2 = str.indexOf("youtu.be");
      let f3 = str.indexOf("embed");
      let f4 = str.indexOf("shorts");
      if (f2 !== -1) {
        videoID = str.split("youtu.be/")[1];
      } else if (f3 !== -1) {
        videoID = str.split("embed/")[1];
      } else if (f4 !== -1) {
        videoID = str.split("shorts/")[1];
      } else if (str.length === 11) {
        videoID = str;
      } else {
        videoID = "";
      }
    }
    ytlink = `https://www.youtube.com/embed/${videoID}?autoplay=1`;
  
    await nextTick();
    const player = new YT.Player(ytplayer.value, {
      videoId: videoID,
      events: {
        'onReady': (event) => event.target.playVideo(),
      },
    });
  
    setTimeout(() => {
      vt_title = player.getVideoData().title;
      let yt_index = ytlist.value.findIndex(e => e.videoID === videoID);
      if (yt_index === -1 && videoID.length === 11) {
        ytlist.value.push({ videoID, videoTitle: vt_title, albumName: vt_album });
        vid = ytlist.value.length - 1;
      }
    }, 2000);
  };
  
  const record_yt = () => {
    let yt1 = ytlist.value.find(e => e.videoID === videoID);
    if (yt1) {
      yt1.albumName = vt_album;
      yt1.videoTitle = vt_title;
    }
  };
  
  const edit_yt = async (n) => {
    videoID = n.videoID;
    vt_title = n.videoTitle;
    vt_album = n.albumName;
    ytlink = `https://www.youtube.com/embed/${videoID}?autoplay=1`;
  
    let yt_index = ytlist.value.findIndex(e => e.videoID === videoID);
    vid = yt_index;
  
    await nextTick();
    const player = new YT.Player(ytplayer.value, {
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
  
  const save_yt = () => {
    const timex = (new Date()).toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const filename = `youtube_list_${timex}.json`;
    const fileContent = JSON.stringify(ytlist.value);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };
  
  const delete_yt = () => {
    let yt_index = ytlist.value.findIndex(e => e.videoID === videoID);
    if (yt_index !== -1) {
      ytlist.value.splice(yt_index, 1);
      let v_cnt = ytlist.value.length;
      vid = vid % v_cnt;
      edit_yt(ytlist.value[vid]);
    }
  };
  
  const change_yt = () => {
    let v_cnt = ytlist.value.length;
    vid = (vid + 1) % v_cnt;
    edit_yt(ytlist.value[vid]);
  };
  
  const upload_yt = async (e) => {
    const file = e.target.files[0];
    jsn_data = await file.text();
    ytlist.value = JSON.parse(jsn_data);
    vid = 0;
    edit_yt(ytlist.value[vid]);
  };
  </script>
  
  <style scoped>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
    background-color: #f9f9f9;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .header h3 {
    margin-bottom: 5px;
    color: #333;
  }
  
  .header h4 {
    margin-bottom: 20px;
    color: #555;
  }
  
  .input-group {
    margin-bottom: 15px;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 5px;
    color: #666;
  }
  
  .input-field {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-sizing: border-box;
  }
  
  .button-group {
    margin-bottom: 20px;
  }
  
  .btn {
    padding: 10px 20px;
    margin-right: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .btn:hover {
    background-color: #45a049;
  }
  
  .upload-btn {
    padding: 10px 20px;
    background-color: #2196F3;
    color: white;
    border-radius: 5px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  
  .upload-btn input[type="file"] {
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
  }
  
  .video-player {
    margin-bottom: 20px;
  }
  
  .styled-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  
  .styled-table thead tr {
    background-color: #333;
    color: white;
    text-align: left;
  }
  
  .styled-table th,
  .styled-table td {
    padding: 12px;
  }
  
  .styled-table tbody tr {
    border-bottom: 1px solid #ddd;
  }
  
  .styled-table tbody tr:hover {
    background-color: #f1f1f1;
  }
  
  .clickable-cell {
    cursor: pointer;
    color: #2196F3;
  }
  
  .clickable-cell:hover {
    text-decoration: underline;
  }
  </style>
  