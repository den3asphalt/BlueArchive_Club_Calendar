// =======================================================================
// js/main.js (トップページ用)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');

    // モーダル表示関数
    function displayEventModal(eventData) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalCircleName = document.getElementById('modalCircleName');
        const modalDuration = document.getElementById('modalDuration');
        const modalRelatedInfo = document.getElementById('modalRelatedInfo');
        const modalTweetEmbed = document.getElementById('modalTweetEmbed');
        const modalTweetLink = document.getElementById('modalTweetLink');
        
        const props = eventData.extendedProps;
        const circleNameText = props.circleName || '不明';

        modalTitle.textContent = eventData.title;
        
        // サークルIDがあれば詳細ページへのリンクを生成
        if (props.clubId) {
            modalCircleName.innerHTML = `<a href="/circle.html?id=${props.clubId}" target="_blank">${circleNameText}</a>`;
        } else {
            modalCircleName.textContent = circleNameText;
        }
        
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
        // 期間のフォーマット
        let durationText = '';
        if (eventData.start) {
            const start = new Date(eventData.start);
            const end = eventData.end ? new Date(eventData.end) : null;
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
            
            if (end && start.toDateString() !== end.toDateString()) {
                durationText = `${start.toLocaleString('ja-JP', options)} - ${end.toLocaleString('ja-JP', options)}`;
            } else if (end) {
                 durationText = `${start.toLocaleDateString('ja-JP')} ${start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                durationText = start.toLocaleString('ja-JP', options);
            }
        }
        modalDuration.textContent = durationText || '未設定';

        // Twitter埋め込み
        modalTweetEmbed.innerHTML = ''; 
        modalTweetLink.innerHTML = ''; 
        if (props.tweetUrl) {
            const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
            if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                modalTweetEmbed.innerHTML = '<p>Twitterコンテンツを読み込み中...</p>';
                window.twttr.widgets.createTweet(
                    tweetIdMatch[1], 
                    modalTweetEmbed, 
                    { theme: 'light', conversation: 'none', dnt: true }
                ).then(el => {
                    if (!el) {
                        modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">ツイートの読み込みに失敗しました。削除されたか、非公開の可能性があります。</p>';
                    } else {
                        // 成功したらローディングメッセージを消す
                        const loadingMsg = modalTweetEmbed.querySelector('p');
                        if(loadingMsg) loadingMsg.remove();
                    }
                });
            } else {
                modalTweetLink.innerHTML = `<p>ツイートURL: <a href="${props.tweetUrl}" target="_blank">${props.tweetUrl}</a></p>`;
            }
        } else {
            modalTweetEmbed.innerHTML = '<p style="text-align: center; color: #666;">公募ツイートのURLが提供されていません。</p>';
        }

        modal.style.display = 'block';
    }

    // 画面幅に応じてカレンダーの初期ビューを決定
    const isMobile = window.innerWidth <= 768;
    const initialView = isMobile ? 'listWeek' : 'dayGridMonth';

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: initialView,
        locale: 'ja',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'listWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek'
        },
        buttonText: {
            today: '今日',
            month: '月',
            week: '週',
            day: '日',
            list: 'リスト'
        },
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        allDayText: '終日',

        // Netlify Functionからイベントを取得
        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const response = await fetch('/.netlify/functions/get-calendar-events');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                successCallback(data.calendarEvents); 
                renderAlwaysOpenRecruitment(data.alwaysOpenRecruitment);

            } catch (error) {
                console.error("Error fetching events:", error);
                failureCallback(error);
            }
        },

        eventContent: function(arg) {
            // listWeekビューの表示をカスタマイズ
            if (arg.view.type === 'listWeek') {
                return { html: `<b>${arg.timeText}</b> - ${arg.event.title}` };
            }
            // 月表示ではタイトルのみ
            return { html: `<div>${arg.event.title}</div>` };
        },

        eventClick: function(info) {
            info.jsEvent.preventDefault();
            displayEventModal(info.event);
        }
    });

    calendar.render();

    // 常時公募枠をカード形式で表示する関数
    function renderAlwaysOpenRecruitment(items) {
        if (!alwaysOpenSection || !alwaysOpenList) return;

        alwaysOpenList.innerHTML = ''; 

        if (items.length === 0) {
            alwaysOpenList.innerHTML = '<p style="text-align: center; color: #6c757d; width: 100%;">現在、常時公募枠はありません。</p>';
            alwaysOpenSection.style.display = 'block'; 
            return;
        }

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('always-open-item'); 
            
            const category = item.extendedProps.category || 'カテゴリなし';
            
            itemDiv.innerHTML = `
                <span class="category-tag">${category}</span>
                <h3>${item.title}</h3>
            `; 

            itemDiv.addEventListener('click', () => {
                // 常時公募アイテムには開始/終了時刻がないため、ダミーのDateオブジェクトを渡す
                const eventData = { ...item, start: new Date(), end: null };
                displayEventModal(eventData); 
            });
            alwaysOpenList.appendChild(itemDiv);
        });
        alwaysOpenSection.style.display = 'block'; 
    }

    // モーダルを閉じるロジック
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('.close-button');
    closeButton.onclick = function() {
        modal.style.display = 'none';
        document.getElementById('modalTweetEmbed').innerHTML = ''; 
    };
    window.onclick = function(event) {
        if (event.target === modal) { 
            modal.style.display = 'none';
            document.getElementById('modalTweetEmbed').innerHTML = '';
        }
    };
});

// =======================================================================
// js/circle-page.js (サークル詳細ページ用)
// =======================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('circle-detail-container');
    const params = new URLSearchParams(window.location.search);
    const circleId = params.get('id');

    if (!circleId) {
        container.innerHTML = '<h1>エラー</h1><p>サークルIDが指定されていません。</p>';
        return;
    }

    try {
        // 新しいNetlify Functionを呼び出す
        const response = await fetch(`/.netlify/functions/get-circle-detail?id=${circleId}`);
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status}`);
        }
        const data = await response.json();

        if (data.error || !data.club) {
            throw new Error(data.error || '指定されたサークルは見つかりませんでした。');
        }
        
        const circle = data.club;

        // ページタイトルをサークル名に設定
        document.title = `${circle.clubName} - サークル詳細`;

        // HTMLを生成して表示
        container.innerHTML = `
            <h1>${circle.clubName}</h1>
            <div class="circle-info">
                ${circle.category ? `<span class="category-tag">${circle.category}</span>` : ''}
                <p><strong>リーダーTwitter:</strong> 
                    ${circle.leaderTwitter ? `<a href="${circle.leaderTwitter}" target="_blank" rel="noopener noreferrer">${circle.leaderTwitter}</a>` : '未設定'}
                </p>
                <div class="memo-section">
                    <h2>メモ</h2>
                    <div class="memo-content">
                        ${circle.memo ? marked.parse(circle.memo) : '<p>メモはありません。</p>'}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Failed to load circle details:', error);
        container.innerHTML = `<h1>エラー</h1><p>情報の読み込みに失敗しました。<br>${error.message}</p>`;
    }
});
