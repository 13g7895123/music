<template>
    <div>
      <h3>Vue YouTube Player</h3>
      <h4>videoID: {{ videoID  }} ---- {{ vt_title  }}</h4>
      Input Youtube Album: <input class="w3-input w3-border w3-round" type="text" v-model="vt_album" @click="vt_album=''">
      Input Youtube Title: <input class="w3-input w3-border w3-round" type="text" v-model="vt_title" @click="vt_title=''">
      Input Youtube URL: <input class="w3-input w3-border w3-round" type="text" v-model="vt_url" @click="vt_url=''">
      <button class="w3-btn w3-border w3-round-large" @click="add_yt">新增</button>
      <button class="w3-btn w3-border w3-round-large" @click="record_yt">修改</button>
      <button class="w3-btn w3-border w3-round-large" @click="delete_yt">刪除</button>
      <button class="w3-btn w3-border w3-round-large" @click="change_yt">下一首</button>
      <button class="w3-btn w3-border w3-round-large" @click="save_yt">下載清單</button>
      上傳清單: <input type="file" class="w3-btn w3-border w3-round-large" id="jsnfile" name="jsnfile" @change="upload_yt" accept="*.json">
  
    </div>
    <!-- <div>
     <iframe width="640" height="360" :src="ytlink" title="" frameborder="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div> -->
    <div>
      <div id="ytplayer"></div>
    </div>
    <table class="w3-table-all">
      <tr>
        <th>videoID</th>
        <th>Video_Title</th>
        <th>Album_Title</th>
      </tr>
      <tr v-for="x in ytlist">
        <td @click="edit_yt(x)" style="cursor:pointer">{{ x.videoID }}</td><td>{{ x.videoTitle }}</td><td>{{ x.albumName }}</td>
      </tr>
    </table>
  </template>
  
  <script setup>
    import { ref } from 'vue'
  
    let vt_url = "https://www.youtube.com/watch?v=FqCw7gCTZQs&pp=ygUP5LmZ5aWz44Gp44KC44KI";
    let vt_album = "Vue YouTube Player"
    let vt_title = ""
    let videoID = ""
    let ytlink = ""
    let vid = 0
    let jsn_data = ""
    let ytlist = ref([
      { videoID: "Ptk_1Dc2iPY", videoTitle: "Canon in D - Cello & Piano", albumName: "Canon"},
      { videoID: "7051Y4WVFJA", videoTitle: "2 Hours Of Canon in D by Pachelbel", albumName: "Canon"}
    ])
  
    const add_yt = () =>{
      let str = vt_url;
      let urlParams = new URLSearchParams(str.split("?")[1])
      let vid = urlParams.get("v");
      if(vid!=null){
        videoID = vid;
      } else {
        let f1 = str.indexOf("?"); 
        if(f1!=-1){
          str = str.split("?")[0];
        } 
        let f2 = str.indexOf("youtu.be"); 
        let f3 = str.indexOf("embed"); 
        let f4 = str.indexOf("shorts"); 
        if(f2!=-1){
          videoID = str.split("youtu.be/")[1];
        } else if(f3!=-1){
          videoID = str.split("embed/")[1];
        } else if(f4!=-1){
          videoID = str.split("shorts/")[1];
        } else if(str.length==11){
          videoID = str;
        } else {
          videoID = "";
        }
      }
      ytlink = "https://www.youtube.com/embed/"+videoID+"?autoplay=1"
  
      player.loadVideoById(videoID, 0);
  
      setTimeout(()=>{ 
          vt_title = $("#ytplayer").attr("title"); 
          let yt_index = ytlist.value.findIndex((e) => e.videoID ===  videoID )
          if(yt_index == -1 && videoID.length==11){
            ytlist.value.push({videoID: videoID, videoTitle: vt_title, albumName: vt_album})
            vid = ytlist.value.length-1;
          }
  
          console.log($("#app")[0]._vnode.component.ctx.ytlist.value);
      }, 2000);
    }
    const record_yt = () => {
      let yt1 = ytlist.find((e) => e.videoID ===  videoID )
      yt1.albumName = vt_album;
      yt1.videoTitle = vt_title;
    }
    /**
    * @param {{ videoID: string; videoTitle: string; albumName: string; }} n
    */
    const edit_yt = (n) => {
      console.log(n)
      videoID = n.videoID
      vt_title = n.videoTitle
      vt_album = n.albumName
      ytlink = "https://www.youtube.com/embed/"+videoID+"?autoplay=1"
  
      let yt_index = ytlist.findIndex((e) => e.videoID ===  videoID )
      vid = yt_index;
      player.loadVideoById(videoID, 0);
  
      setTimeout(()=>{ 
          vt_title = $("#ytplayer").attr("title"); 
          n.videoTitle = vt_title
      }, 2000);
    }
    const save_yt = () => {
      console.log(top)
      let timex = (new Date()).toLocaleString( 'zh-TW', { 
        timeZone: 'Asia/Taipei',
        hour12: false 
      })
      timex = timex.replaceAll("/", "").replaceAll(":", "").replaceAll(" ", "_")
      console.log(timex);
  
      top.saveJSON(JSON.parse(JSON.stringify(ytlist)), 'youtube_list_'+timex)
    }
    const delete_yt = () => {
      let yt_index = ytlist.findIndex((e) => e.videoID ===  videoID )
      if(yt_index != -1){
        ytlist.splice(yt_index, 1);
        let v_cnt = ytlist.length;
        vid = (vid)%v_cnt; 
        edit_yt(ytlist[vid])
      }
    }
    const change_yt = () => {
      let v_cnt = ytlist.length;
      // let vid = parseInt(Math.random()*v_cnt+"");
      vid = (vid+1)%v_cnt; 
      edit_yt(ytlist[vid])
    }
  
    const upload_yt = async(e) => {
      const file = e.target.files.item(0)
      jsn_data = await file.text();
      console.log(JSON.parse(jsn_data))
      ytlist = JSON.parse(jsn_data)
      vid = 0
      edit_yt(ytlist[vid]) 
    }
      
    
  </script>
  
  <style>
  div {
    padding:10px
  }
  
  button {
    margin: 5px;
  }
  
  </style>