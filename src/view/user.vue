<template>
    <div class="user-selection-container">
      <div 
        v-for="user in users" 
        :key="user.id" 
        class="user-item" 
        @click="selectUser(user)"
      >
        <img :src="user.avatar" alt="User Avatar" class="user-avatar" />
        <p class="user-name">{{ user.name }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const users = ref([
    { id: 1, name: 'Tracy', avatar: 'https://via.placeholder.com/80' },
    { id: 2, name: 'Isten', avatar: 'https://via.placeholder.com/80' },
    { id: 3, name: 'Jarvis', avatar: 'https://via.placeholder.com/80' },
  ]);
  
  const selectUser = (user) => {
    console.log('Selected User:', user);
    // Handle the user selection logic here
  };
  </script>
  
  <style>
  .user-selection-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 320px;
    margin: 0 auto;
    background-color: #f5f5f5;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .user-item {
    display: flex;
    align-items: center;
    margin-bottom: 25px;
    padding: 10px;
    cursor: pointer;
    border-radius: 10px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    background-color: white;
    width: 100%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  }
  
  .user-item:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .user-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-right: 15px;
    border: 3px solid #007bff;
    transition: border-color 0.3s ease;
  }
  
  .user-item:hover .user-avatar {
    border-color: #0056b3;
  }
  
  .user-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    transition: color 0.3s ease;
  }
  
  .user-item:hover .user-name {
    color: #0056b3;
  }
  </style>
  