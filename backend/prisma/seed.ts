import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // 建立測試用戶
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: hashedPassword,
      nickname: 'Demo User',
      emailVerified: true,
      preferences: {
        theme: 'dark',
        autoplay: true,
        volume: 0.8
      }
    }
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      nickname: 'Test User',
      emailVerified: true,
      preferences: {
        theme: 'light',
        autoplay: false,
        volume: 0.6
      }
    }
  })

  console.log(`✅ Created users: ${user.nickname}, ${user2.nickname}`)

  // 建立測試歌曲
  const songs = await Promise.all([
    prisma.song.upsert({
      where: { youtubeId: 'dQw4w9WgXcQ' },
      update: {},
      create: {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        duration: 213,
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
        channelName: 'RickAstleyVEVO',
        viewCount: BigInt('1200000000'),
        publishedAt: new Date('1987-07-27'),
        metadata: {
          genre: 'Pop',
          language: 'en'
        }
      }
    }),
    prisma.song.upsert({
      where: { youtubeId: 'kJQP7kiw5Fk' },
      update: {},
      create: {
        youtubeId: 'kJQP7kiw5Fk',
        title: 'Despacito',
        artist: 'Luis Fonsi ft. Daddy Yankee',
        duration: 282,
        thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg',
        channelName: 'LuisFonsiVEVO',
        viewCount: BigInt('8000000000'),
        publishedAt: new Date('2017-01-13'),
        metadata: {
          genre: 'Latin Pop',
          language: 'es'
        }
      }
    }),
    prisma.song.upsert({
      where: { youtubeId: 'fJ9rUzIMcZQ' },
      update: {},
      create: {
        youtubeId: 'fJ9rUzIMcZQ',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        duration: 355,
        thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/default.jpg',
        channelName: 'QueenOfficial',
        viewCount: BigInt('1800000000'),
        publishedAt: new Date('1975-10-31'),
        metadata: {
          genre: 'Rock',
          language: 'en'
        }
      }
    }),
    prisma.song.upsert({
      where: { youtubeId: 'JGwWNGJdvx8' },
      update: {},
      create: {
        youtubeId: 'JGwWNGJdvx8',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        duration: 233,
        thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/default.jpg',
        channelName: 'EdSheeranVEVO',
        viewCount: BigInt('5600000000'),
        publishedAt: new Date('2017-01-06'),
        metadata: {
          genre: 'Pop',
          language: 'en'
        }
      }
    }),
    prisma.song.upsert({
      where: { youtubeId: 'hLQl3WQQoQ0' },
      update: {},
      create: {
        youtubeId: 'hLQl3WQQoQ0',
        title: 'Someone Like You',
        artist: 'Adele',
        duration: 285,
        thumbnailUrl: 'https://i.ytimg.com/vi/hLQl3WQQoQ0/default.jpg',
        channelName: 'AdeleVEVO',
        viewCount: BigInt('2800000000'),
        publishedAt: new Date('2011-01-24'),
        metadata: {
          genre: 'Soul',
          language: 'en'
        }
      }
    })
  ])

  console.log(`✅ Created ${songs.length} songs`)

  // 建立測試播放清單
  const playlist1 = await prisma.playlist.create({
    data: {
      userId: user.id,
      name: 'My Favorites',
      description: 'A collection of my favorite songs',
      isPublic: true,
      metadata: {
        tags: ['favorites', 'mixed'],
        mood: 'happy'
      }
    }
  })

  const playlist2 = await prisma.playlist.create({
    data: {
      userId: user.id,
      name: 'Chill Vibes',
      description: 'Relaxing music for peaceful moments',
      isPublic: false,
      metadata: {
        tags: ['chill', 'relax'],
        mood: 'calm'
      }
    }
  })

  const playlist3 = await prisma.playlist.create({
    data: {
      userId: user2.id,
      name: 'Party Mix',
      description: 'High energy songs for parties',
      isPublic: true,
      isCollaborative: true,
      metadata: {
        tags: ['party', 'energy'],
        mood: 'excited'
      }
    }
  })

  console.log(`✅ Created playlists: ${playlist1.name}, ${playlist2.name}, ${playlist3.name}`)

  // 將歌曲加入播放清單
  await Promise.all([
    // My Favorites playlist
    prisma.playlistSong.create({
      data: {
        playlistId: playlist1.id,
        songId: songs[0].id, // Never Gonna Give You Up
        position: 1,
        addedBy: user.id
      }
    }),
    prisma.playlistSong.create({
      data: {
        playlistId: playlist1.id,
        songId: songs[2].id, // Bohemian Rhapsody
        position: 2,
        addedBy: user.id
      }
    }),
    prisma.playlistSong.create({
      data: {
        playlistId: playlist1.id,
        songId: songs[4].id, // Someone Like You
        position: 3,
        addedBy: user.id
      }
    }),

    // Chill Vibes playlist
    prisma.playlistSong.create({
      data: {
        playlistId: playlist2.id,
        songId: songs[4].id, // Someone Like You
        position: 1,
        addedBy: user.id
      }
    }),
    prisma.playlistSong.create({
      data: {
        playlistId: playlist2.id,
        songId: songs[3].id, // Shape of You
        position: 2,
        addedBy: user.id
      }
    }),

    // Party Mix playlist
    prisma.playlistSong.create({
      data: {
        playlistId: playlist3.id,
        songId: songs[1].id, // Despacito
        position: 1,
        addedBy: user2.id
      }
    }),
    prisma.playlistSong.create({
      data: {
        playlistId: playlist3.id,
        songId: songs[3].id, // Shape of You
        position: 2,
        addedBy: user2.id
      }
    })
  ])

  console.log('✅ Added songs to playlists')

  // 建立播放記錄
  const playHistoryData = [
    {
      userId: user.id,
      songId: songs[0].id,
      playlistId: playlist1.id,
      playDuration: 213,
      completed: true,
      playedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      userId: user.id,
      songId: songs[2].id,
      playlistId: playlist1.id,
      playDuration: 355,
      completed: true,
      playedAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    {
      userId: user.id,
      songId: songs[4].id,
      playlistId: playlist2.id,
      playDuration: 200,
      completed: false,
      playedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      userId: user2.id,
      songId: songs[1].id,
      playlistId: playlist3.id,
      playDuration: 282,
      completed: true,
      playedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    },
    {
      userId: user2.id,
      songId: songs[3].id,
      playDuration: 150,
      completed: false,
      playedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    }
  ]

  await Promise.all(
    playHistoryData.map(data => prisma.playHistory.create({ data }))
  )

  console.log(`✅ Created ${playHistoryData.length} play history records`)

  // 更新播放清單統計（雖然觸發器應該會自動處理，但為了確保數據正確）
  await prisma.$executeRaw`
    UPDATE playlists 
    SET song_count = (
      SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = playlists.id
    ),
    total_duration = (
      SELECT COALESCE(SUM(s.duration), 0) 
      FROM playlist_songs ps 
      JOIN songs s ON ps.song_id = s.id 
      WHERE ps.playlist_id = playlists.id
    )
  `

  console.log('✅ Updated playlist statistics')

  console.log('🎉 Database seed completed successfully!')
  
  // 顯示創建的數據統計
  const userCount = await prisma.user.count()
  const songCount = await prisma.song.count()
  const playlistCount = await prisma.playlist.count()
  const playHistoryCount = await prisma.playHistory.count()

  console.log('\n📊 Seed Statistics:')
  console.log(`   Users: ${userCount}`)
  console.log(`   Songs: ${songCount}`)
  console.log(`   Playlists: ${playlistCount}`)
  console.log(`   Play History Records: ${playHistoryCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })