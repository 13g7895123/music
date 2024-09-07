<template>
    <div class="container">
      <!-- Input and Button Section -->
      <div class="input-section">
        <input v-model="newUrl" type="text" placeholder="請輸入網址" />
        <button @click="addUrl">加入</button>
      </div>
  
      <!-- List Section with Scrollbar -->
      <ul class="url-list">
        <li v-for="(url, index) in urls" :key="index" class="url-item">
          {{ url }}
        </li>
      </ul>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // State to hold the new URL and the list of URLs
  const newUrl = ref('');
  const urls = ref([
    'https://example.com',
    'https://openai.com',
    'https://vuejs.org',
    'https://google.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://linkedin.com',
  ]);
  
  // Function to add the new URL to the list
  const addUrl = () => {
    if (newUrl.value) {
      urls.value.push(newUrl.value);
      newUrl.value = ''; // Clear the input field after adding
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
  }
  
  .url-item:last-child {
    border-bottom: none; /* Remove border from last item */
  }
  </style>
  