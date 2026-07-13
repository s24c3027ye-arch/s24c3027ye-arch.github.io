document.addEventListener('DOMContentLoaded', () => {
    // === DOM要素の取得 ===
    const currentTimeElem = document.getElementById('current-time'), calendarMonthYear = document.getElementById('calendar-month-year'), calendarGrid = document.getElementById('calendar-grid'), prevMonthBtn = document.getElementById('prev-month-btn'), nextMonthBtn = document.getElementById('next-month-btn');
    const formTitle = document.getElementById('form-title'), addBtn = document.getElementById('add-btn'), cancelBtn = document.getElementById('cancel-btn'), scheduleIdInput = document.getElementById('schedule-id'), scheduleDateInput = document.getElementById('schedule-date'), scheduleTimeInput = document.getElementById('schedule-time'), scheduleTextInput = document.getElementById('schedule-text');
    const scheduleEndDateInput = document.getElementById('schedule-endDate'), scheduleEndTimeInput = document.getElementById('schedule-endTime'); 
    const dayTitleElem = document.getElementById('day-title'), youtubeDayTitleElem = document.getElementById('youtube-day-title'), dayMyScheduleList = document.getElementById('day-my-schedule-list'), dayYoutubeList = document.getElementById('day-youtube-list');
    const prevDayBtn = document.getElementById('prev-day-btn'), nextDayBtn = document.getElementById('next-day-btn');
    const toggleCalendarBtn = document.getElementById('toggle-calendar-btn'), calendarWrapper = document.getElementById('calendar-wrapper');
    const refreshYoutubeBtn = document.getElementById('refresh-youtube-btn');
    const descriptionModal = document.getElementById('description-modal'), modalTitle = document.getElementById('modal-title'), modalDescription = document.getElementById('modal-description'), closeModalBtn = descriptionModal.querySelector('.close-btn'), modalYoutubeLink = document.getElementById('modal-youtube-link'), modalThumbnail = document.getElementById('modal-thumbnail');

    // === 状態管理 ===
    const today = new Date();
    let displayYear = today.getFullYear(), displayMonth = today.getMonth();
    let selectedDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    let isFetchingYouTube = false;
    const CACHE_DURATION_MINUTES = 30;
    const PAST_DAYS_TO_SHOW = 3;

    // === ヘルパー関数 ===
    function formatTime(date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
    function updateTime() { const now = new Date(); currentTimeElem.textContent = now.toLocaleString('ja-JP'); }
    setInterval(updateTime, 1000); updateTime();
    function getDateString(date) { if (!date) return null; return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; }

    // === カレンダー描画 ===
    function renderCalendar() {
        calendarGrid.innerHTML = ''; calendarMonthYear.textContent = `${displayYear}年 ${displayMonth + 1}月`; const weekdays = ['日', '月', '火', '水', '木', '金', '土']; weekdays.forEach(day => { const h = document.createElement('div'); h.className = 'weekday-header'; h.textContent = day; calendarGrid.appendChild(h); });
        
        const myScheduleDates = new Set();
        const allSchedules = JSON.parse(localStorage.getItem('schedules')) || [];
        allSchedules.forEach(s => { if (!s.date) return; const startDate = new Date(s.date + 'T00:00:00'); const endDate = s.endDate ? new Date(s.endDate + 'T00:00:00') : new Date(startDate); if (endDate < startDate) return; for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) { myScheduleDates.add(getDateString(new Date(d))); } });

        const youtubeSchedules = JSON.parse(localStorage.getItem('youtubeSchedulesCache')) || [];
        const upcomingOrLiveDates = new Set();
        const pastDates = new Set();
        youtubeSchedules.forEach(item => { if (!item.snippet || !item.effectiveScheduleTime) return; const itemDateStr = getDateString(new Date(item.effectiveScheduleTime)); if (!itemDateStr) return; const isLive = item.snippet.liveBroadcastContent === 'live'; const isUpcoming = item.snippet.liveBroadcastContent === 'upcoming'; if (isLive || isUpcoming) { upcomingOrLiveDates.add(itemDateStr); } else { pastDates.add(itemDateStr); } });
        
        const firstDayOfMonth = new Date(displayYear, displayMonth, 1), lastDateOfMonth = new Date(displayYear, displayMonth + 1, 0), startDayOfWeek = firstDayOfMonth.getDay();
        for (let i = 0; i < startDayOfWeek; i++) { const c = document.createElement('div'); c.className = 'calendar-day other-month'; calendarGrid.appendChild(c); }
        for (let day = 1; day <= lastDateOfMonth.getDate(); day++) {
            const dayCell = document.createElement('div'); dayCell.classList.add('calendar-day'); const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; if (dateStr === selectedDate) dayCell.classList.add('selected'); if (displayYear === today.getFullYear() && displayMonth === today.getMonth() && day === today.getDate()) dayCell.classList.add('today'); dayCell.innerHTML = `<span class="day-number">${day}</span><div class="event-dots"></div>`; const eventDotsContainer = dayCell.querySelector('.event-dots');
            if (myScheduleDates.has(dateStr)) { eventDotsContainer.innerHTML += '<span class="event-dot dot-my-schedule"></span>'; }
            if (upcomingOrLiveDates.has(dateStr)) { eventDotsContainer.innerHTML += '<span class="event-dot dot-youtube"></span>'; } else if (pastDates.has(dateStr)) { eventDotsContainer.innerHTML += '<span class="event-dot dot-youtube-past"></span>'; }
            dayCell.addEventListener('click', () => { selectedDate = dateStr; renderCalendar(); renderDailySchedule(); });
            calendarGrid.appendChild(dayCell);
        }
    }

    // === 日の詳細スケジュール表示 ===
    function renderDailySchedule() {
        const d = new Date(selectedDate + 'T00:00:00'); const dateDisplayStr = `${selectedDate.replace(/-/g, '/')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]})`; dayTitleElem.textContent = dateDisplayStr; youtubeDayTitleElem.textContent = dateDisplayStr;
        const allSchedules = JSON.parse(localStorage.getItem('schedules')) || [];
        const daySchedules = allSchedules.filter(s => { if (!s.date) return false; const startDate = s.date; const endDate = s.endDate || s.date; return selectedDate >= startDate && selectedDate <= endDate; }).sort((a, b) => { const aIsAllDay = (a.date < selectedDate) || (a.endDate && a.endDate > selectedDate); const bIsAllDay = (b.date < selectedDate) || (b.endDate && b.endDate > selectedDate); if (aIsAllDay && !bIsAllDay) return -1; if (!aIsAllDay && bIsAllDay) return 1; return (a.time || '00:00').localeCompare(b.time || '00:00'); });
        
        dayMyScheduleList.innerHTML = daySchedules.length === 0 ? '<li>予定はありません</li>' : daySchedules.map(s => {
            const startDate = s.date; const endDate = s.endDate || s.date; const startTime = s.time; const endTime = s.endTime;
            let timeDisplay = '';
            if (startDate === endDate) { timeDisplay = (endTime) ? `${startTime} - ${endTime}` : startTime; }
            else { if (selectedDate === startDate) { timeDisplay = `${startTime} 〜`; } else if (selectedDate === endDate) { timeDisplay = `〜 ${endTime || '?'}`; } else { timeDisplay = '終日'; } }
            return `<li class="day-schedule-item my-schedule" data-id="${s.id}"><div><span class="schedule-time">${timeDisplay}</span><span>${s.text}</span></div><div class="schedule-actions"><button class="edit-btn">編集</button><button class="delete-btn">削除</button></div></li>`;
        }).join('');
        
        const allYouTube = JSON.parse(localStorage.getItem('youtubeSchedulesCache')) || [];
        const dayYouTube = allYouTube.filter(item => item.snippet && item.effectiveScheduleTime && getDateString(new Date(item.effectiveScheduleTime)) === selectedDate) .sort((a, b) => { const timeA = a.effectiveScheduleTime; const timeB = b.effectiveScheduleTime; if (!timeA && timeB) return 1; if (timeA && !timeB) return -1; if (!timeA && !timeB) return 0; return new Date(timeA) - new Date(timeB); });
        
        if (isFetchingYouTube && dayYoutubeList.innerHTML.includes('🔄')) { /* ローディング */ }
        else if (dayYoutubeList.innerHTML.includes('⚠️')) { /* エラー */ }
         else {
             dayYoutubeList.innerHTML = dayYouTube.length === 0 ? '<li>配信予定はありません</li>' : dayYouTube.map(item => {
                 const scheduledTime = item.effectiveScheduleTime ? new Date(item.effectiveScheduleTime) : null;
                 const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
                 const isLive = item.snippet?.liveBroadcastContent === 'live';
                 const isPast = !isLive && item.snippet?.liveBroadcastContent !== 'upcoming';
                 const description = item.snippet?.description || '概要はありません。'; const title = item.snippet?.title || 'タイトルなし'; const channelName = item.channelName || 'チャンネル名不明'; const videoId = item.id || '';
                 if (!scheduledTime) return '';
                 let badge = '';
                 if (isLive) { badge = '<span class="live-badge">LIVE</span>'; }
                 const pastClass = isPast ? 'past-stream' : '';
                 return `<li class="day-schedule-item youtube-schedule ${pastClass}" data-description="${encodeURIComponent(description)}" data-title="${encodeURIComponent(title)}" data-video-id="${videoId}" data-thumbnail="${thumbnailUrl}"><img src="${thumbnailUrl}" alt="サムネイル" class="yt-thumbnail"><div class="yt-info-wrapper"><div class="yt-info-header">${badge}<strong>${formatTime(scheduledTime)}</strong></div><div class="yt-title">${title}</div><small class="yt-channel">${channelName}</small></div></li>`;
             }).join('');
        }
    }

    // === フォーム関連 ===
    function resetForm() { scheduleIdInput.value = ''; scheduleDateInput.value = ''; scheduleTimeInput.value = ''; scheduleEndDateInput.value = ''; scheduleEndTimeInput.value = ''; scheduleTextInput.value = ''; formTitle.textContent = '予定の登録'; addBtn.textContent = '登録'; cancelBtn.classList.add('hidden'); }

    // === YouTubeデータ取得 ===
    async function fetchYouTubeSchedules(forceRefresh = false, showLoading = true) {
        if (isFetchingYouTube) { console.log("[fetchYouTubeSchedules] Already fetching. Skipped."); return; }
        isFetchingYouTube = true;
        
        const apiKeysData = JSON.parse(localStorage.getItem('apiKeysData')) || { ungrouped: [], groups: [] };
        const youtubeChannelsData = JSON.parse(localStorage.getItem('youtubeChannelsData')) || { ungrouped: [], groups: [] };
        const activeApiKeyId = localStorage.getItem('activeApiKeyId') || null;
        
        const allApiKeys = apiKeysData.ungrouped.concat(apiKeysData.groups.flatMap(g => g.items));
        const allYouTubeChannels = youtubeChannelsData.ungrouped.concat(youtubeChannelsData.groups.flatMap(g => g.items));
        
        const activeKey = allApiKeys.find(k => k.id == activeApiKeyId);

        let errorOccurred = false; let errorMessage = '';
        dayYoutubeList.innerHTML = '';
        
        if (!activeKey || allYouTubeChannels.length === 0) {
             localStorage.removeItem('youtubeSchedulesCache'); localStorage.removeItem('youtubeCacheTimestamp');
             errorMessage = '<li>APIキーまたはチャンネル未設定</li>'; errorOccurred = true;
        }
        if (showLoading && !errorOccurred) { dayYoutubeList.innerHTML = '<li>🔄 配信情報を取得中...</li>'; }
        else if (errorOccurred) { dayYoutubeList.innerHTML = errorMessage; }
        if (errorOccurred) { isFetchingYouTube = false; renderDailySchedule(); return; }

        const apiKey = activeKey.value;
        const now = Date.now();
        const cacheTimestamp = localStorage.getItem('youtubeCacheTimestamp');
        const cacheAge = cacheTimestamp ? (now - parseInt(cacheTimestamp, 10)) / (1000 * 60) : Infinity;
        const cachedData = localStorage.getItem('youtubeSchedulesCache');

        if (!forceRefresh && cachedData && cacheAge < CACHE_DURATION_MINUTES) {
            console.log(`[fetchYouTubeSchedules] Using cache (age: ${Math.round(cacheAge)} minutes).`);
            if (showLoading) { dayYoutubeList.innerHTML = '<li><small>キャッシュから表示中...</small></li>'; setTimeout(() => { renderDailySchedule(); }, 100); }
            else { renderDailySchedule(); }
            isFetchingYouTube = false; return;
        }

        console.log("[fetchYouTubeSchedules] Fetching from API...");
        console.log("Using API Key:", apiKey ? 'Yes' : 'No');
        console.log("Channels to fetch:", allYouTubeChannels.map(ch => ch.name));

        try {
            const channelInfoMap = new Map(); const videoIdMap = new Map();
            const channelIds = allYouTubeChannels.map(ch => ch.channelId);
            console.log("[fetchYouTubeSchedules] Step 1: Fetching channel details for IDs:", channelIds.length);
            const MAX_CHANNELS_PER_REQUEST = 50;
            for (let i = 0; i < channelIds.length; i += MAX_CHANNELS_PER_REQUEST) {
                const chunkIds = channelIds.slice(i, i + MAX_CHANNELS_PER_REQUEST); const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${chunkIds.join(',')}&key=${apiKey}`;
                console.log(`[fetchYouTubeSchedules]   Fetching Channel Details Chunk ${Math.floor(i / MAX_CHANNELS_PER_REQUEST) + 1} (${chunkIds.length} IDs)`);
                const response = await fetch(channelsUrl); const responseBody = await response.text();
                if (!response.ok) { console.error(`[fetchYouTubeSchedules] Failed to fetch channel details: ${response.status} - ${responseBody}`); let parsedError = {}; try { parsedError = JSON.parse(responseBody).error || {}; } catch (e) {} const message = parsedError.message || `Status: ${response.status}`; if (response.status === 403 || response.status === 400) { errorMessage = `<li>⚠️ APIキー/Quotaエラー(Channels)。<a href="settings.html">設定を確認</a>。(E1C:${response.status}) 詳細: ${message}</li>`; errorOccurred = true; throw new Error(errorMessage); } else { errorMessage = `<li>⚠️ チャンネル情報取得エラー(${response.status})。(E6C) 詳細: ${message}</li>`; errorOccurred = true; throw new Error(errorMessage); } }
                const data = JSON.parse(responseBody);
                data.items?.forEach(item => {
                    const uploadsId = item.contentDetails?.relatedPlaylists?.uploads;
                    const originalChannel = allYouTubeChannels.find(ch => ch.channelId === item.id);
                    if (uploadsId && originalChannel) { channelInfoMap.set(item.id, { name: originalChannel.name, uploadsPlaylistId: uploadsId }); } else { console.warn(`[fetchYouTubeSchedules] Could not find uploads playlist ID or original channel info for channel ID: ${item.id}`); }
                });
            }
            if (errorOccurred) { throw new Error(errorMessage); }
            console.log("[fetchYouTubeSchedules] Step 1 Complete. Found info for channels:", channelInfoMap.size);

            console.log("[fetchYouTubeSchedules] Step 2: Fetching playlist items...");
            // ★★★ 取得件数を 50 に変更 ★★★
            const MAX_PLAYLIST_RESULTS = 50;
            const playlistPromises = Array.from(channelInfoMap.entries()).map(async ([channelId, info]) => { const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${info.uploadsPlaylistId}&maxResults=${MAX_PLAYLIST_RESULTS}&key=${apiKey}`; console.log(`[fetchYouTubeSchedules]   Fetching PlaylistItems for: ${info.name} (maxResults=${MAX_PLAYLIST_RESULTS})`); try { const response = await fetch(playlistItemsUrl); const responseBody = await response.text(); if (!response.ok) { console.error(`PlaylistItems fetch failed for ${info.name}: ${response.status} - ${responseBody}`); let parsedError = {}; try { parsedError = JSON.parse(responseBody).error || {}; } catch (e) {} const message = parsedError.message || `Status: ${response.status}`; if (response.status === 403 || response.status === 400) { errorMessage = `<li>⚠️ APIキー/Quotaエラー(PlaylistItems)。<a href="settings.html">設定を確認</a>。(E1P:${response.status}) 詳細: ${message}</li>`; errorOccurred = true; } else if (response.status === 404) { console.warn(`Playlist not found for ${info.name}, skipping.`);} else { errorMessage = `<li>⚠️ ${info.name}の動画リスト取得エラー(${response.status})。(E6P) 詳細: ${message}</li>`; errorOccurred = true;} return; } const data = JSON.parse(responseBody); data.items?.forEach(item => { const videoId = item.snippet?.resourceId?.videoId; if (videoId && !videoIdMap.has(videoId)) { videoIdMap.set(videoId, { channelName: info.name, channelId: channelId }); } }); } catch (networkError) { console.error(`[fetchYouTubeSchedules] Network error fetching playlist items for ${info.name}:`, networkError); errorMessage = `<li>⚠️ ネットワークエラー(PlaylistItems)。(E2P)</li>`; errorOccurred = true; } });
            await Promise.allSettled(playlistPromises);
            if (errorOccurred && (errorMessage.includes('APIキー/Quota') || errorMessage.includes('ネットワークエラー'))) { throw new Error(errorMessage); }
            console.log("[fetchYouTubeSchedules] Step 2 Complete. Total unique video IDs found:", videoIdMap.size);

            const allVideoIds = Array.from(videoIdMap.keys());
            if (allVideoIds.length > 0) {
                console.log("[fetchYouTubeSchedules] Step 3: Fetching video details for IDs:", allVideoIds.length);
                const MAX_IDS_PER_REQUEST = 50; let finalItems = [];
                for (let i = 0; i < allVideoIds.length; i += MAX_IDS_PER_REQUEST) {
                    const chunkIds = allVideoIds.slice(i, i + MAX_IDS_PER_REQUEST); const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${chunkIds.join(',')}&key=${apiKey}`; console.log(`[fetchYouTubeSchedules]   Fetching Video Details Chunk ${Math.floor(i / MAX_IDS_PER_REQUEST) + 1} (${chunkIds.length} IDs)`); try { const videosResponse = await fetch(videosUrl); const videosResponseBody = await videosResponse.text(); if (!videosResponse.ok) { console.error(`[fetchYouTubeSchedules] Failed to fetch video details: ${videosResponse.status} - ${videosResponseBody}`); let parsedError = {}; try { parsedError = JSON.parse(videosResponseBody).error || {}; } catch (e) {} const message = parsedError.message || `Status: ${videosResponse.status}`; if (videosResponse.status === 403 || videosResponse.status === 400) { errorMessage = `<li>⚠️ APIキー/Quotaエラー。(E3:${videosResponse.status}) 詳細: ${message}</li>`; errorOccurred = true; break; } continue; } const videosData = JSON.parse(videosResponseBody); finalItems = finalItems.concat(videosData.items); } catch(videoFetchError){ console.error('[fetchYouTubeSchedules] Network error fetching video details chunk:', videoFetchError); errorMessage = `<li>⚠️ ネットワークエラー。(E4)</li>`; errorOccurred = true; break; }
                }
                if (errorOccurred) { throw new Error(errorMessage); }

                const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - PAST_DAYS_TO_SHOW); threeDaysAgo.setHours(0, 0, 0, 0); const nowForFilter = new Date(); const twentyFourHours = 24 * 60 * 60 * 1000;
                const itemsWithChannel = finalItems .map(item => {
                    let effectiveScheduleTime = null;
                    const isLive = item.snippet?.liveBroadcastContent === 'live';
                    const isUpcoming = item.snippet?.liveBroadcastContent === 'upcoming';
                    const scheduledStartTime = item.liveStreamingDetails?.scheduledStartTime;
                    const actualStartTime = item.liveStreamingDetails?.actualStartTime;
                    const actualEndTime = item.liveStreamingDetails?.actualEndTime;
                    const publishedAt = item.snippet?.publishedAt;
                    if (scheduledStartTime) { effectiveScheduleTime = scheduledStartTime; }
                    else if (isLive && actualStartTime) { effectiveScheduleTime = actualStartTime; }
                    else if (isUpcoming && publishedAt) { effectiveScheduleTime = publishedAt; }
                    else if (actualEndTime) { effectiveScheduleTime = actualEndTime; }
                    else if (actualStartTime) { effectiveScheduleTime = actualStartTime; }
                    else if (publishedAt) { effectiveScheduleTime = publishedAt; }
                    const isPremiere = !scheduledStartTime && isUpcoming;
                    return { ...item, effectiveScheduleTime: effectiveScheduleTime, isPremiere: isPremiere, channelName: videoIdMap.get(item.id)?.channelName || allYouTubeChannels.find(ch => ch.channelId === item.snippet?.channelId)?.name || '不明' };
                })
                .filter(item => {
                    if (!item.snippet || !item.effectiveScheduleTime) return false;
                    const itemTime = new Date(item.effectiveScheduleTime);
                    const isLive = item.snippet.liveBroadcastContent === 'live';
                    const isUpcoming = item.snippet.liveBroadcastContent === 'upcoming';
                    if (isLive) return true;
                    if (isUpcoming) { const expiryTime = new Date(itemTime.getTime() + twentyFourHours); if (nowForFilter > expiryTime) { console.log(`[Filter] Skipped (Stale Upcoming > 24h): ${item.snippet.title}`); return false; } return true; }
                    const relevantTimeForPastCheck = item.liveStreamingDetails?.actualEndTime || item.effectiveScheduleTime;
                    const isRecentPast = new Date(relevantTimeForPastCheck) >= threeDaysAgo;
                    return isRecentPast;
                });
                console.log("[fetchYouTubeSchedules] Saving items to cache (after filtering):", itemsWithChannel.length);
                localStorage.setItem('youtubeSchedulesCache', JSON.stringify(itemsWithChannel));
                localStorage.setItem('youtubeCacheTimestamp', Date.now().toString());
                if(itemsWithChannel.length === 0 && allVideoIds.length > 0 && !errorOccurred){ console.warn("[fetchYouTubeSchedules] Found video IDs but none matched filtering criteria after fetching details."); }
            } else { console.log("[fetchYouTubeSchedules] No valid video IDs found from playlists, clearing cache."); localStorage.setItem('youtubeSchedulesCache', '[]'); localStorage.setItem('youtubeCacheTimestamp', Date.now().toString()); } if (showLoading) { console.log("[fetchYouTubeSchedules] Successfully fetched latest data."); } } catch (error) { console.error('[fetchYouTubeSchedules] Error during fetch process:', error.message || error); errorMessage = errorMessage || '<li>⚠️ 予期せぬエラーが発生しました。(E5)</li>'; dayYoutubeList.innerHTML = errorMessage; errorOccurred = true; } finally { isFetchingYouTube = false; if (!errorOccurred) { renderDailySchedule(); } else { renderDailySchedule(); } }
    }


    // === モーダル関連 ===
    function openModal(title, description, videoId, thumbnailUrl) { modalTitle.textContent = decodeURIComponent(title); modalDescription.textContent = decodeURIComponent(description); if (thumbnailUrl) { modalThumbnail.src = thumbnailUrl; modalThumbnail.classList.remove('hidden'); } else { modalThumbnail.src = ''; modalThumbnail.classList.add('hidden'); } if (videoId) { modalYoutubeLink.href = `https://www.youtube.com/watch?v=${videoId}`; modalYoutubeLink.classList.remove('hidden'); } else { modalYoutubeLink.href = '#'; modalYoutubeLink.classList.add('hidden'); } descriptionModal.classList.remove('hidden'); }
    function closeModal() { descriptionModal.classList.add('hidden'); modalThumbnail.src = ''; }

    // === イベントリスナーと初期化 ===
    toggleCalendarBtn.addEventListener('click', () => { const isHidden = calendarWrapper.classList.toggle('hidden'); toggleCalendarBtn.textContent = isHidden ? 'カレンダーを開く' : 'カレンダーを閉じる'; });
    function changeDay(offset) { let currentDateObj = new Date(selectedDate + 'T00:00:00'); currentDateObj.setDate(currentDateObj.getDate() + offset); selectedDate = getDateString(currentDateObj); const newDate = new Date(selectedDate); if (newDate.getFullYear() !== displayYear || newDate.getMonth() !== displayMonth) { displayYear = newDate.getFullYear(); displayMonth = newDate.getMonth(); } renderCalendar(); renderDailySchedule(); }
    prevDayBtn.addEventListener('click', () => changeDay(-1));
    nextDayBtn.addEventListener('click', () => changeDay(1));
    prevMonthBtn.addEventListener('click', () => { displayMonth--; if (displayMonth < 0) { displayMonth = 11; displayYear--; } renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { displayMonth++; if (displayMonth > 11) { displayMonth = 0; displayYear++; } renderCalendar(); });
    addBtn.addEventListener('click', () => { let schedules = JSON.parse(localStorage.getItem('schedules')) || []; const id = scheduleIdInput.value; const date = scheduleDateInput.value, time = scheduleTimeInput.value, endDate = scheduleEndDateInput.value || null, endTime = scheduleEndTimeInput.value || null, text = scheduleTextInput.value; if (!date || !time || !text) { alert('日付、開始時刻、予定内容は必須です。'); return; } if (endDate && endDate < date) { alert('終了日は開始日より後に設定してください。'); return; } if (endDate === date && endTime && endTime < time) { alert('終了時刻は開始時刻より後に設定してください。'); return; } const scheduleData = { id: id ? Number(id) : Date.now(), date, time, endDate: endDate, endTime: endTime, text }; if (id) { const index = schedules.findIndex(s => s.id == id); if (index > -1) { schedules[index] = scheduleData; } } else { schedules.push(scheduleData); } localStorage.setItem('schedules', JSON.stringify(schedules)); renderCalendar(); renderDailySchedule(); resetForm(); });
    dayMyScheduleList.addEventListener('click', (e) => { const target = e.target; const li = target.closest('.day-schedule-item'); if (!li) return; const id = li.dataset.id; let schedules = JSON.parse(localStorage.getItem('schedules')) || []; if (target.classList.contains('delete-btn')) { if (confirm('この予定を削除してもよろしいですか？')) { schedules = schedules.filter(s => s.id != id); localStorage.setItem('schedules', JSON.stringify(schedules)); renderCalendar(); renderDailySchedule(); resetForm(); } } else if (target.classList.contains('edit-btn')) { const scheduleToEdit = schedules.find(s => s.id == id); if (scheduleToEdit) { formTitle.textContent = '予定の編集'; scheduleIdInput.value = scheduleToEdit.id; scheduleDateInput.value = scheduleToEdit.date; scheduleTimeInput.value = scheduleToEdit.time; scheduleEndDateInput.value = scheduleToEdit.endDate || ''; scheduleEndTimeInput.value = scheduleToEdit.endTime || ''; scheduleTextInput.value = scheduleToEdit.text; addBtn.textContent = '更新'; cancelBtn.classList.remove('hidden'); } } });
    cancelBtn.addEventListener('click', resetForm);
    closeModalBtn.addEventListener('click', closeModal);
    descriptionModal.addEventListener('click', (e) => { if (e.target === descriptionModal) closeModal(); });
    dayYoutubeList.addEventListener('click', (e) => { const targetLi = e.target.closest('.day-schedule-item.youtube-schedule'); if (targetLi) { e.preventDefault(); const description = targetLi.dataset.description; const title = targetLi.dataset.title; const videoId = targetLi.dataset.videoId; const thumbnailUrl = targetLi.dataset.thumbnail; console.log("Opening modal for videoId:", videoId); openModal(title, description, videoId, thumbnailUrl); } });
    refreshYoutubeBtn.addEventListener('click', async () => { console.log("[Refresh Button] Clicked."); await fetchYouTubeSchedules(true, true); renderCalendar(); /* renderDailyScheduleはfinallyで呼ばれる */ });

    async function init() {
        console.log("[Init] Starting initial fetch.");
        await fetchYouTubeSchedules(false, false);
        renderCalendar();
        renderDailySchedule();
        console.log("[Init] Initial fetch complete.");
    }
    init();
});
