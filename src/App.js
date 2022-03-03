import axios from 'axios';
import { useState } from 'react';
import './App.css';

const channelId = 'UC7NlmHpWY14Ox13JELdTgsQ';
const googleKey = 'AIzaSyBSWrQHMQ1eQ6EPKE4-F1Xnt0dQovkmzTc';

function App() {
  const [formData, setFormData] = useState({
    googleKey,
    channelId,
  });
  const [jsonData, setJsonData] = useState({
    playlists: [],
    videos: [],
  });
  const [step, setStep] = useState(1);

  const getVideos = async (pageToken = '') => {
    try {
      let rawVideos = (
        await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            pageToken,
            channelId: formData.channelId,
            key: formData.googleKey,
            order: 'date',
            part: 'id,snippet',
            maxResults: 1000,
          },
        })
      ).data;

      const videos = rawVideos.items
        .map((item) => {
          return (
            item.id.videoId && {
              id: item.id.videoId,
              channelId: item.snippet.channelId,
              type: 'video',
              name: item.snippet.title,
              image_url: item.snippet.thumbnails.medium
                ? item.snippet.thumbnails.medium.url
                : '',
              video_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            }
          );
        })
        .filter(Boolean);

      setJsonData((prev) => ({
        ...prev,
        videos: [...prev.videos, ...videos],
      }));

      if (rawVideos.nextPageToken) {
        getVideos(rawVideos.nextPageToken);
      }
    } catch (error) {
      console.log('Get videos fail: ', error);
    }
  };

  const getPlaylists = async () => {
    try {
      const rawPlaylists = (
        await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
          params: {
            channelId: formData.channelId,
            key: formData.googleKey,
            order: 'date',
            part: 'id,snippet,contentDetails',
            maxResults: 1000,
          },
        })
      ).data;

      let playlists = rawPlaylists.items.map(async (item) => {
        const rawVideos = (
          await axios.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            {
              params: {
                playlistId: item.id,
                key: formData.googleKey,
                order: 'date',
                part: 'id,snippet,contentDetails',
                maxResults: 1000,
              },
            }
          )
        ).data;

        const videos = rawVideos.items.map((item) => ({
          id: item.snippet.resourceId.videoId,
          type: 'video',
          name: item.snippet.title,
          image_url: item.snippet.thumbnails.medium
            ? item.snippet.thumbnails.medium.url
            : '',
          video_url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        }));

        return {
          id: item.id,
          name:
            item.snippet.title.charAt(0).toUpperCase() +
            item.snippet.title.slice(1),
          image_url: item.snippet.thumbnails.medium.url,
          itemCount: item.contentDetails.itemCount,
          items: videos,
        };
      });

      playlists = await Promise.all(playlists);

      setJsonData({
        // Cách chỉ lấy videos trong playlists:
        // B1. Lấy all videos
        // B2. Map lại vào các playlists
        // B3. Lấy ngược videos từ playlists ra
        videos: playlists.map((playlist) => playlist.items).flat(),
        playlists,
      });
    } catch (error) {
      console.log('Get playlists fail: ', error);
    }
  };

  const onChangeInput = (event, key) => {
    setFormData((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await Promise.all([getPlaylists(), getVideos()]);
    setStep(2);
  };

  const saveToJSON = (jsonData, filename) => {
    const fileData = JSON.stringify(jsonData);
    const blob = new Blob([fileData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    link.click();
  };

  return (
    <div className="container">
      <div className="mb-32px">
        <h1>Step 1: Fetch Data</h1>
        <form onSubmit={onSubmit}>
          <div className="mb-16px">
            <label htmlFor="googleKey">Google Key: </label>
            <input
              id="googleKey"
              type="text"
              value={formData.googleKey}
              onChange={(event) => onChangeInput(event, 'googleKey')}
            />
          </div>
          <div className="mb-16px">
            <label htmlFor="channelId">Channel ID: </label>
            <input
              id="channelId"
              type="text"
              value={formData.channelId}
              onChange={(event) => onChangeInput(event, 'channelId')}
            />
          </div>
          <input type="submit" value="Fetch Data" />
        </form>
      </div>

      {step === 2 && (
        <div>
          <h1>Step 2: Download Data</h1>
          <button
            className="mr-8px"
            onClick={() => saveToJSON(jsonData.playlists, 'playlists')}
          >
            Playlists
          </button>
          <button
            className="mr-8px"
            onClick={() => saveToJSON(jsonData.videos, 'videos')}
          >
            Videos
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
