document.addEventListener('DOMContentLoaded', () => {
    // === DOM要素の取得 ===
    const apiKeyFormTitle = document.getElementById('api-key-form-title'), apiKeyNameInput = document.getElementById('api-key-name'), apiKeyValueInput = document.getElementById('api-key-value'), addApiKeyBtn = document.getElementById('add-api-key-btn'), editApiKeyIdInput = document.getElementById('edit-api-key-id'), cancelEditApiKeyBtn = document.getElementById('cancel-edit-api-key-btn');
    const channelFormTitle = document.getElementById('channel-form-title'), newChannelNameInput = document.getElementById('new-channel-name'), newChannelIdInput = document.getElementById('new-channel-id'), addChannelBtn = document.getElementById('add-channel-btn'), editChannelIdInput = document.getElementById('edit-channel-id'), cancelEditChannelBtn = document.getElementById('cancel-edit-channel-btn');
    const apiKeyListContainer = document.getElementById('api-key-list-container');
    const channelListContainer = document.getElementById('channel-list-container');
    const addApiKeyGroupBtn = document.getElementById('add-api-key-group-btn');
    const addChannelGroupBtn = document.getElementById('add-channel-group-btn');

    // ★★★ データ移行処理 (旧フラット構造 -> 新グループ構造) ★★★
    function migrateOldData() {
        // --- APIキーの移行 ---
        const oldApiKeys = JSON.parse(localStorage.getItem('apiKeys'));
        const newApiKeysDataExists = localStorage.getItem('apiKeysData');
        
        // 新しいデータ構造がなく、古いデータ構造がある場合のみ移行
        if (!newApiKeysDataExists && Array.isArray(oldApiKeys) && oldApiKeys.length > 0) {
            console.log("Migrating old API key structure...");
            const migratedData = {
                ungrouped: oldApiKeys, // 旧データを「未分類」に
                groups: []
            };
            localStorage.setItem('apiKeysData', JSON.stringify(migratedData));
            localStorage.removeItem('apiKeys'); // 旧データを削除
            console.log("API key migration complete.");
        }

        // --- チャンネルの移行 ---
        const oldChannels = JSON.parse(localStorage.getItem('youtubeChannels'));
        const newChannelsDataExists = localStorage.getItem('youtubeChannelsData');
        
        if (!newChannelsDataExists && Array.isArray(oldChannels) && oldChannels.length > 0) {
            console.log("Migrating old channel structure...");
            const migratedData = {
                ungrouped: oldChannels, // 旧データを「未分類」に
                groups: []
            };
            localStorage.setItem('youtubeChannelsData', JSON.stringify(migratedData));
            localStorage.removeItem('youtubeChannels');
            console.log("Channel migration complete.");
        }
    }
    
    // ★★★ 移行処理を実行 ★★★
    migrateOldData();

    // === ローカルストレージからデータを取得 (グループ構造) ===
    let apiKeysData = JSON.parse(localStorage.getItem('apiKeysData')) || { ungrouped: [], groups: [] };
    let youtubeChannelsData = JSON.parse(localStorage.getItem('youtubeChannelsData')) || { ungrouped: [], groups: [] };
    let activeApiKeyId = localStorage.getItem('activeApiKeyId') || null;

    // Sortable.js のインスタンスを保持
    let groupSortables = [];
    let itemSortables = [];

    // === キャッシュクリア関数 ===
    function clearYouTubeCache() { localStorage.removeItem('youtubeSchedulesCache'); localStorage.removeItem('youtubeCacheTimestamp'); console.log("YouTube cache cleared due to settings change."); }

    // --- APIキー管理 ---
    function saveApiGroups() { localStorage.setItem('apiKeysData', JSON.stringify(apiKeysData)); }
    
    function renderApiKeys() {
        apiKeyListContainer.querySelectorAll('.settings-group:not(.ungrouped)').forEach(el => el.remove());

        const allKeys = apiKeysData.ungrouped.concat(apiKeysData.groups.flatMap(g => g.items));
        const activeKey = allKeys.find(k => k.id == activeApiKeyId);
        
        const activeKeyDisplaySpan = apiKeyListContainer.querySelector('.settings-group.ungrouped .active-key-display span');
        if (activeKeyDisplaySpan) {
            activeKeyDisplaySpan.textContent = activeKey ? activeKey.name : 'なし';
        }

        // 未分類リストの描画
        const ungroupedApiKeyList = apiKeyListContainer.querySelector('.item-list[data-group-id="ungrouped"]');
        ungroupedApiKeyList.innerHTML = '';
        if (apiKeysData.ungrouped.length === 0) {
            ungroupedApiKeyList.innerHTML = '<li class="empty-item">アイテムがありません</li>';
        } else {
            apiKeysData.ungrouped.forEach(key => {
                ungroupedApiKeyList.appendChild(createApiKeyItemElement(key));
            });
        }
        
        // グループリストの描画
        apiKeysData.groups.forEach(group => {
            const groupSection = createGroupElement(group, 'api-key-item-list');
            const itemList = groupSection.querySelector('.item-list');
            if (group.items.length === 0) {
                itemList.innerHTML = '<li class="empty-item">アイテムがありません</li>';
            } else {
                group.items.forEach(key => {
                    itemList.appendChild(createApiKeyItemElement(key));
                });
            }
            apiKeyListContainer.appendChild(groupSection);
        });

        setupDragDrop(); // ドラッグ＆ドロップを再セットアップ
    }

    function createApiKeyItemElement(key) {
        const li = document.createElement('li');
        li.dataset.id = key.id;
        li.className = 'draggable-item';
        li.draggable = true;
        const isActive = key.id == activeApiKeyId;
        li.innerHTML = `
            <span class="key-name">${key.name}</span>
            <div class="list-buttons">
                <button class="edit-item-btn" data-id="${key.id}">編集</button>
                <button class="select-key-btn ${isActive ? 'active' : ''}" data-id="${key.id}">${isActive ? '使用中' : '使用する'}</button>
                <button class="delete-key-btn" data-id="${key.id}">削除</button>
            </div>`;
        return li;
    }

    function addOrUpdateApiKey() {
        const id = editApiKeyIdInput.value;
        const name = apiKeyNameInput.value.trim();
        const value = apiKeyValueInput.value.trim();
        if (!name || !value) { alert('キーの名前と値の両方を入力してください。'); return; }

        if (id) { // 更新モード
            let found = false;
            [apiKeysData.ungrouped, ...apiKeysData.groups.map(g => g.items)].forEach(list => {
                const index = list.findIndex(k => k.id == id);
                if (index > -1) { list[index] = { ...list[index], name, value }; found = true; }
            });
            if (found) { saveApiGroups(); renderApiKeys(); resetApiKeyForm(); clearYouTubeCache(); alert('APIキーを更新しました。'); }
            else { alert('更新対象のAPIキーが見つかりません。'); resetApiKeyForm(); }
        } else { // 追加モード
            const newKey = { id: Date.now(), name, value };
            apiKeysData.ungrouped.push(newKey); // 未分類リストに追加
            saveApiGroups(); renderApiKeys();
            apiKeyNameInput.value = ''; apiKeyValueInput.value = '';
            if (!activeApiKeyId) { setActiveApiKey(newKey.id); }
            else { clearYouTubeCache(); alert('APIキーを追加しました。'); }
        }
    }

    function resetApiKeyForm() { editApiKeyIdInput.value = ''; apiKeyNameInput.value = ''; apiKeyValueInput.value = ''; apiKeyFormTitle.textContent = 'APIキーの管理'; addApiKeyBtn.textContent = '追加'; cancelEditApiKeyBtn.classList.add('hidden'); }
    function setActiveApiKey(id) { if (activeApiKeyId != id) { activeApiKeyId = id; localStorage.setItem('activeApiKeyId', String(id)); renderApiKeys(); clearYouTubeCache(); alert('使用するAPIキーを変更しました。'); } }
    
    function deleteApiKey(id) {
        if (confirm('このAPIキーを削除してもよろしいですか？')) {
            let foundAndRemoved = false;
            let initialLength = apiKeysData.ungrouped.length;
            apiKeysData.ungrouped = apiKeysData.ungrouped.filter(k => k.id != id);
            if (apiKeysData.ungrouped.length < initialLength) foundAndRemoved = true;
            
            apiKeysData.groups.forEach(group => {
                initialLength = group.items.length;
                group.items = group.items.filter(k => k.id != id);
                if (group.items.length < initialLength) foundAndRemoved = true;
            });

            if (foundAndRemoved) {
                saveApiGroups();
                if (activeApiKeyId == id) {
                    activeApiKeyId = null; localStorage.removeItem('activeApiKeyId'); clearYouTubeCache();
                    const allKeys = apiKeysData.ungrouped.concat(apiKeysData.groups.flatMap(g => g.items));
                    if (allKeys.length > 0) { setActiveApiKey(allKeys[0].id); }
                    else { renderApiKeys(); alert('APIキーを削除しました。');}
                } else { clearYouTubeCache(); renderApiKeys(); alert('APIキーを削除しました。'); }
            }
        }
    }
    
    function addApiKeyGroup() {
        const groupName = prompt("新しいグループ名を入力してください:", "新規グループ");
        if (groupName) {
            apiKeysData.groups.push({ groupId: `group-${Date.now()}`, groupName: groupName, items: [] });
            saveApiGroups();
            renderApiKeys();
        }
    }
    
    function deleteApiKeyGroup(groupId) {
        if (groupId === 'ungrouped') { alert('未分類グループは削除できません。'); return; }
        if (!confirm("グループを削除しますか？\n(中のアイテムは「未分類」に移動します)")) return;
        
        const groupIndex = apiKeysData.groups.findIndex(g => g.groupId === groupId);
        if (groupIndex === -1) return;

        const itemsToMove = apiKeysData.groups[groupIndex].items;
        apiKeysData.ungrouped.push(...itemsToMove); // 未分類に移動
        apiKeysData.groups.splice(groupIndex, 1); // グループを削除

        saveApiGroups();
        renderApiKeys();
    }
    
    function updateApiKeyGroupName(groupId, newName) {
        if (groupId === 'ungrouped') return;
        const group = apiKeysData.groups.find(g => g.groupId === groupId);
        if (group && group.groupName !== newName) { group.groupName = newName; saveApiGroups(); console.log("API Group name updated:", newName); }
    }

    // --- チャンネル管理 ---
    function saveChannelGroups() { localStorage.setItem('youtubeChannelsData', JSON.stringify(youtubeChannelsData)); }
    
    function renderChannelList() {
        channelListContainer.querySelectorAll('.settings-group:not(.ungrouped)').forEach(el => el.remove());
        
        // 未分類リストの描画
        const ungroupedChannelList = channelListContainer.querySelector('.item-list[data-group-id="ungrouped"]');
        ungroupedChannelList.innerHTML = '';
        if (youtubeChannelsData.ungrouped.length === 0) {
            ungroupedChannelList.innerHTML = '<li class="empty-item">アイテムがありません</li>';
        } else {
            youtubeChannelsData.ungrouped.forEach(channel => {
                ungroupedChannelList.appendChild(createChannelItemElement(channel));
            });
        }
        
        // グループリストの描画
        youtubeChannelsData.groups.forEach(group => {
            const groupSection = createGroupElement(group, 'channel-item-list');
            const itemList = groupSection.querySelector('.item-list');
            if (group.items.length === 0) {
                itemList.innerHTML = '<li class="empty-item">アイテムがありません</li>';
            } else {
                group.items.forEach(channel => {
                    itemList.appendChild(createChannelItemElement(channel));
                });
            }
            channelListContainer.appendChild(groupSection);
        });

        setupDragDrop();
    }
    
    function createChannelItemElement(channel) {
         const li = document.createElement('li');
         li.dataset.id = channel.id;
         li.className = 'draggable-item';
         li.draggable = true;
         li.innerHTML = `
             <span class="channel-name">${channel.name}</span>
             <div class="list-buttons">
                 <button class="edit-item-btn" data-id="${channel.id}">編集</button>
                 <button class="delete-channel-btn" data-id="${channel.id}">削除</button>
             </div>`;
         return li;
    }
    
    function createGroupElement(group, listClass) {
        const groupSection = document.createElement('section');
        groupSection.className = 'settings-group draggable-group';
        groupSection.dataset.groupId = group.groupId;
        groupSection.draggable = true;
        groupSection.innerHTML = `
            <div class="group-header">
                <h3 class="group-name" contenteditable="true">${group.groupName}</h3>
                <button class="delete-group-btn" title="グループ削除">×</button>
            </div>
            <ul class="item-list ${listClass}" data-group-id="${group.groupId}"></ul>
        `;
        return groupSection;
    }

    function addOrUpdateChannel() {
        const id = editChannelIdInput.value;
        const name = newChannelNameInput.value.trim();
        const channelId = newChannelIdInput.value.trim();
        if (!name || !channelId) { alert('チャンネル名とIDの両方を入力してください。'); return; }

        if (id) { // 更新モード
            let found = false;
             [youtubeChannelsData.ungrouped, ...youtubeChannelsData.groups.map(g => g.items)].forEach(list => {
                const index = list.findIndex(c => c.id == id);
                if (index > -1) { list[index] = { ...list[index], name, channelId }; found = true; }
            });
            if (found) { saveChannelGroups(); renderChannelList(); resetChannelForm(); clearYouTubeCache(); alert('チャンネル情報を更新しました。'); }
            else { alert('更新対象のチャンネルが見つかりません。'); resetChannelForm(); }
        } else { // 追加モード
            const newChannel = { id: Date.now(), name, channelId };
            youtubeChannelsData.ungrouped.push(newChannel); // 未分類リストに追加
            saveChannelGroups(); renderChannelList();
            newChannelNameInput.value = ''; newChannelIdInput.value = '';
            clearYouTubeCache(); alert('チャンネルを追加しました。');
        }
    }
    function resetChannelForm() { editChannelIdInput.value = ''; newChannelNameInput.value = ''; newChannelIdInput.value = ''; channelFormTitle.textContent = 'チャンネルの管理'; addChannelBtn.textContent = '追加'; cancelEditChannelBtn.classList.add('hidden'); }
    
    function deleteChannel(id) {
        if (confirm('このチャンネルを削除しますか？')) {
             let foundAndRemoved = false;
             let initialLength = youtubeChannelsData.ungrouped.length;
             youtubeChannelsData.ungrouped = youtubeChannelsData.ungrouped.filter(c => c.id != id);
             if (youtubeChannelsData.ungrouped.length < initialLength) foundAndRemoved = true;
             
             youtubeChannelsData.groups.forEach(group => {
                initialLength = group.items.length;
                group.items = group.items.filter(c => c.id != id);
                 if (group.items.length < initialLength) foundAndRemoved = true;
            });
            
            if(foundAndRemoved) {
                saveChannelGroups(); renderChannelList(); clearYouTubeCache(); alert('チャンネルを削除しました。');
            }
        }
    }

    function addChannelGroup() { const groupName = prompt("新しいグループ名を入力してください:", "新規グループ"); if (groupName) { youtubeChannelsData.groups.push({ groupId: `group-${Date.now()}`, groupName: groupName, items: [] }); saveChannelGroups(); renderChannelList(); } }
    
    function deleteChannelGroup(groupId) {
        if (groupId === 'ungrouped') { alert('未分類グループは削除できません。'); return; }
        if (!confirm("グループを削除しますか？\n(中のアイテムは「未分類」に移動します)")) return;
        const groupIndex = youtubeChannelsData.groups.findIndex(g => g.groupId === groupId);
        if (groupIndex === -1) return;
        const itemsToMove = youtubeChannelsData.groups[groupIndex].items;
        youtubeChannelsData.ungrouped.push(...itemsToMove); // 未分類に移動
        youtubeChannelsData.groups.splice(groupIndex, 1); // 削除
        saveChannelGroups();
        renderChannelList();
    }
    
    function updateChannelGroupName(groupId, newName) {
        if (groupId === 'ungrouped') return;
        const group = youtubeChannelsData.groups.find(g => g.groupId === groupId);
        if (group && group.groupName !== newName) { group.groupName = newName; saveChannelGroups(); console.log("Channel Group name updated:", newName); }
    }

    // --- イベントリスナーの設定 ---
    addApiKeyBtn.addEventListener('click', addOrUpdateApiKey);
    addChannelBtn.addEventListener('click', addOrUpdateChannel);
    cancelEditApiKeyBtn.addEventListener('click', resetApiKeyForm);
    cancelEditChannelBtn.addEventListener('click', resetChannelForm);
    addApiKeyGroupBtn.addEventListener('click', addApiKeyGroup);
    addChannelGroupBtn.addEventListener('click', addChannelGroup);

    apiKeyListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const groupEl = target.closest('.settings-group');
        const itemEl = target.closest('.draggable-item');
        const id = target.dataset.id || itemEl?.dataset.id;
        
        if (target.classList.contains('group-name') && groupEl.dataset.groupId !== 'ungrouped') {
            target.addEventListener('blur', () => { updateApiKeyGroupName(groupEl.dataset.groupId, target.textContent); }, { once: true });
        }
        else if (target.classList.contains('delete-group-btn')) {
            deleteApiKeyGroup(groupEl.dataset.groupId);
        }
        else if (id) {
             if (target.classList.contains('select-key-btn') && !target.classList.contains('active')) { setActiveApiKey(id); }
             else if (target.classList.contains('delete-key-btn')) { deleteApiKey(id); }
             else if (target.classList.contains('edit-item-btn')) {
                 const keyToEdit = apiKeysData.ungrouped.find(k => k.id == id) || apiKeysData.groups.flatMap(g => g.items).find(k => k.id == id);
                 if (keyToEdit) { editApiKeyIdInput.value = keyToEdit.id; apiKeyNameInput.value = keyToEdit.name; apiKeyValueInput.value = keyToEdit.value; apiKeyFormTitle.textContent = 'APIキーの編集'; addApiKeyBtn.textContent = '更新'; cancelEditApiKeyBtn.classList.remove('hidden'); }
             }
        }
    });

    channelListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const groupEl = target.closest('.settings-group');
        const itemEl = target.closest('.draggable-item');
        const id = target.dataset.id || itemEl?.dataset.id;

        if (target.classList.contains('group-name') && groupEl.dataset.groupId !== 'ungrouped') {
            target.addEventListener('blur', () => { updateChannelGroupName(groupEl.dataset.groupId, target.textContent); }, { once: true });
        }
        else if (target.classList.contains('delete-group-btn')) { deleteChannelGroup(groupEl.dataset.groupId); }
        else if (id) {
            if (target.classList.contains('delete-channel-btn')) { deleteChannel(id); }
            else if (target.classList.contains('edit-item-btn')) { const channelToEdit = youtubeChannelsData.ungrouped.find(c => c.id == id) || youtubeChannelsData.groups.flatMap(g => g.items).find(c => c.id == id); if (channelToEdit) { editChannelIdInput.value = channelToEdit.id; newChannelNameInput.value = channelToEdit.name; newChannelIdInput.value = channelToEdit.channelId; channelFormTitle.textContent = 'チャンネルの編集'; addChannelBtn.textContent = '更新'; cancelEditChannelBtn.classList.remove('hidden'); } }
        }
    });
    
    // ソートラジオボタンを削除
    document.querySelectorAll('.sort-options').forEach(el => el.remove());

    // ★★★ ドラッグアンドドロップ処理 (Sortable.js) ★★★
    function setupDragDrop() {
        if (typeof Sortable === 'undefined') { console.warn("Sortable.js is not loaded."); return; }

        // 既存のインスタンスを破棄
        groupSortables.forEach(s => s.destroy());
        itemSortables.forEach(s => s.destroy());
        groupSortables = [];
        itemSortables = [];

        // グループ自体の並び替え (apiKeys)
        groupSortables.push(new Sortable(apiKeyListContainer, {
            animation: 150,
            ghostClass: 'dragging-group',
            handle: '.group-header',
            draggable: '.draggable-group:not(.ungrouped)', // 未分類グループは移動不可
            onEnd: (evt) => updateDataFromDOM('apiKeys')
        }));
        // グループ自体の並び替え (channels)
        groupSortables.push(new Sortable(channelListContainer, {
            animation: 150,
            ghostClass: 'dragging-group',
            handle: '.group-header',
            draggable: '.draggable-group:not(.ungrouped)',
            onEnd: (evt) => updateDataFromDOM('channels')
        }));

        // グループ内のアイテム、およびグループ間のアイテム移動
        apiKeyListContainer.querySelectorAll('.api-key-item-list').forEach(list => {
            itemSortables.push(new Sortable(list, {
                group: 'apiKeys', // グループ名を共有
                animation: 150,
                ghostClass: 'dragging',
                draggable: '.draggable-item',
                onEnd: () => updateDataFromDOM('apiKeys')
            }));
        });
        channelListContainer.querySelectorAll('.channel-item-list').forEach(list => {
            itemSortables.push(new Sortable(list, {
                group: 'channels',
                animation: 150,
                ghostClass: 'dragging',
                draggable: '.draggable-item',
                onEnd: () => updateDataFromDOM('channels')
            }));
        });
    }

    // ★★★ DOMの見た目からデータ配列を更新する関数 ★★★
    function updateDataFromDOM(dataType) {
        try {
            if (dataType === 'apiKeys') {
                const newApiKeysData = { ungrouped: [], groups: [] };
                // 全アイテムを一度フラットに取得（並び替え前の参照用）
                const allItems = [].concat(...(apiKeysData.ungrouped || []), ...apiKeysData.groups.flatMap(g => g.items));

                apiKeyListContainer.querySelectorAll('.settings-group').forEach(groupEl => {
                    const groupId = groupEl.dataset.groupId;
                    const itemIds = [...groupEl.querySelectorAll('.item-list li.draggable-item')].map(li => li.dataset.id);
                    const newItems = itemIds.map(id => allItems.find(item => item.id == id)).filter(Boolean);

                    if (groupId === 'ungrouped') {
                        newApiKeysData.ungrouped = newItems;
                    } else {
                        const groupName = groupEl.querySelector('.group-name').textContent;
                        // グループIDが見つからない(DOMから消えた?)場合は念のためスキップ
                        if(apiKeysData.groups.find(g => g.groupId === groupId) || apiKeysData.ungrouped.length > 0) {
                             newApiKeysData.groups.push({ groupId, groupName, items: newItems });
                        }
                    }
                });
                apiKeysData = newApiKeysData;
                saveApiGroups();
                renderApiKeys(); // 順序を確定し、activeボタンを正しく表示するために再描画

            } else if (dataType === 'channels') {
                const newChannelGroups = { ungrouped: [], groups: [] };
                const allItems = [].concat(...(youtubeChannelsData.ungrouped || []), ...youtubeChannelsData.groups.flatMap(g => g.items));
                
                channelListContainer.querySelectorAll('.settings-group').forEach(groupEl => {
                    const groupId = groupEl.dataset.groupId;
                    const itemIds = [...groupEl.querySelectorAll('.item-list li.draggable-item')].map(li => li.dataset.id);
                    const newItems = itemIds.map(id => allItems.find(item => item.id == id)).filter(Boolean);

                    if (groupId === 'ungrouped') {
                        newChannelGroups.ungrouped = newItems;
                    } else {
                        const groupName = groupEl.querySelector('.group-name').textContent;
                         if(youtubeChannelsData.groups.find(g => g.groupId === groupId) || youtubeChannelsData.ungrouped.length > 0) {
                            newChannelGroups.groups.push({ groupId, groupName, items: newItems });
                         }
                    }
                });
                youtubeChannelsData = newChannelGroups;
                saveChannelGroups();
                renderChannelList(); // 再描画
            }
            
            clearYouTubeCache(); // 順番やグループが変わったのでキャッシュをクリア
            console.log("Data updated from DOM.");
        } catch (error) {
            console.error("Error updating data from DOM:", error);
            // エラーが発生した場合、ローカルストレージから読み込み直す
            apiKeysData = JSON.parse(localStorage.getItem('apiKeysData')) || { ungrouped: [], groups: [] };
            youtubeChannelsData = JSON.parse(localStorage.getItem('youtubeChannelsData')) || { ungrouped: [], groups: [] };
            renderApiKeys();
            renderChannelList();
        }
    }

    // --- 初期化処理 ---
    function init() {
        // migrateOldData(); // ★★★ 起動時にデータ移行チェック ★★★ (前回実行されたはずなのでコメントアウトしてもOK)
        renderApiKeys();
        renderChannelList();
    }
    init();
});
