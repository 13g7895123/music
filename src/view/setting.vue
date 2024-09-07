<template>
    <div class="container">
        <div id="ytplayer" ref="ytplayer""></div>
        <!-- <div id="ytplayer" ref="ytplayer"></div> -->
        <!-- Input and Button Section -->
        <div class="input-section">
            <input v-model="newUrl" type="text" placeholder="請輸入網址" />
            <button @click="addUrl">加入</button>
        </div>
  
        <!-- List Section with Scrollbar -->
        <ul class="url-list">
            <li v-for="(data, index) in musicList" :key="index" :vid="data.vid" class="url-item">
            {{ data.title }}
            </li>
        </ul>
    </div>
  </template>
  
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import axios from 'axios'
  
  const ytplayer = ref(null);
  // State to hold the new URL and the list of URLs
  const newUrl = ref('');
  let musicList = ref([]);

  onMounted(() => {
    getData();
  })

  const getData = async () => {
    let url = `https://capi.mercylife.cc/api/music/1/1`;
    await axios.get(`${url}`);
    const { data: { success, data, msg } } = await axios.get(`${url}`);

    if (data.length > 0){
        musicList.value = [];
        data.forEach(element => {
            let object = {
                title: element.video_name,
                vid: element.youtube_id
            }
            musicList.value.push(object);
            console.log(element.video_name);
        });
    }
    console.log(data);
  }
  
  // Function to add the new URL to the list
  const addUrl = async () => {
    if (newUrl.value) {
        let urlParams = new URLSearchParams(newUrl.value.split("?")[1]);
        let vid = urlParams.get("v");

        const apiKey = 'AIzaSyBXDtbnuCnaDta0OmLFjBc46-5D3dv_b8s';
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}&key=${apiKey}`
        const { data: { items } } = await axios.get(`${url}`);
        const title = items[0].snippet.title;
 
        url = `https://capi.mercylife.cc/api/music/create/1/1`
        const formData = {
            vid: vid,
            title: title
        };
        const { data: { success, msg } } = await axios.post(`${url}`, formData);
        if (success){
            getData();
        }
    }
  };
  </script>
  
  <style scoped>
  .container {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f4f4f4;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .input-section input {
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
    width: 100%;
  }
  
  .input-section button {
    padding: 10px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    background-color: #007bff;
    color: white;
    cursor: pointer;
    width: 100%;
  }
  
  .input-section button:hover {
    background-color: #0056b3;
  }
  
  .url-list {
    margin-top: 20px;
    padding: 0;
    list-style: none;
    max-height: 200px; /* Set a max height */
    overflow-y: auto; /* Enable vertical scrolling */
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: white;
  }
  
  .url-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
    color: #555;
    /* cursor: pointer; */
  }
  
  .url-item:last-child {
    border-bottom: none; /* Remove border from last item */
  }
  </style>
  