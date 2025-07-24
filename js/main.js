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
        // === 修正箇所 ===
        buttonText: {
            today: '今日',
            month: '月',
            week: '週', // "list" を "week" に修正
            day: '日',
            list: 'リスト' // listWeekビュー用のテキストはそのまま
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
            
            // カテゴリ表示のコードを削除
            itemDiv.innerHTML = `
                <h3>${item.title}</h3>
            `; 

            itemDiv.addEventListener('click', () => {
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
