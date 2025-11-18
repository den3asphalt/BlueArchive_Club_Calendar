// =======================================================================
// js/main.js (時間表示デザイン強化版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: '' 
        },
        
        buttonText: {
            today: '今日',
            month: '月',
        },
        
        // イベントの重なり許容数（スマホで見やすいように調整）
        dayMaxEvents: true, 
        contentHeight: 'auto',

        // ■ 1. クラス名の動的付与
        // これにより、CSSで「左端を空ける」「右端を空ける」を制御します
        eventClassNames: function(arg) {
            const classes = [];
            const start = arg.event.start;
            const end = arg.event.end;

            // 開始が00:00でない場合 -> 左に隙間を作るクラス
            if (start && (start.getHours() !== 0 || start.getMinutes() !== 0)) {
                classes.push('is-delayed-start');
            }

            // 終了が存在し、かつ23:59(または翌00:00)でない場合 -> 右に隙間を作るクラス
            // ※FullCalendarのendは排他的（翌00:00）の場合があるので判定に注意
            if (end) {
                const isMidnight = end.getHours() === 0 && end.getMinutes() === 0;
                if (!isMidnight) {
                    classes.push('is-early-end');
                }
            }
            
            return classes;
        },

        // ■ 2. イベント表示内容のカスタマイズ
        // 時間とタイトルを綺麗に配置します
        eventContent: function(arg) {
            let timeText = '';
            
            // 時間テキストの生成 (例: 19:00 - 21:00)
            if (!arg.event.allDay && arg.event.start) {
                const start = arg.event.start;
                const end = arg.event.end;
                
                const formatTime = (date) => {
                    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                };

                timeText = formatTime(start);
                if (end && start.getDate() === end.getDate()) {
                    // 同日の場合のみ終了時刻を表示（すっきりさせるため）
                    timeText += ` - ${formatTime(end)}`;
                }
            }

            // HTMLの組み立て
            // 時間がある場合: 上段に時間、下段にタイトル
            // 終日の場合: タイトルのみ
            let htmlContent;
            if (timeText) {
                htmlContent = `
                    <div class="fc-event-inner">
                        <div class="fc-event-time-row">${timeText}</div>
                        <div class="fc-event-title-row">${arg.event.title}</div>
                    </div>
                `;
            } else {
                htmlContent = `
                    <div class="fc-event-inner fc-event-allday">
                        <div class="fc-event-title-row">${arg.event.title}</div>
                    </div>
                `;
            }

            return { html: htmlContent };
        },

        // イベント取得 (変更なし)
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

        eventClick: function(info) {
            info.jsEvent.preventDefault();
            displayEventModal(info.event);
        }
    });

    calendar.render();

    // --- 以下、モーダル等の共通処理 (変更なし) ---
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
        
        if (props.clubId) {
            modalCircleName.innerHTML = `<a href="/circle.html?id=${props.clubId}" class="modal-circle-link" target="_blank">${circleNameText} <span style="font-size:0.8em">🔗</span></a>`;
        } else {
            modalCircleName.textContent = circleNameText;
        }
        
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
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

        modalTweetEmbed.innerHTML = ''; 
        modalTweetLink.innerHTML = ''; 
        
        if (props.tweetUrl) {
            modalTweetLink.innerHTML = `<p><a href="${props.tweetUrl}" target="_blank" class="twitter-link-btn">Twitterで元のツイートを見る</a></p>`;
            const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
            if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                modalTweetEmbed.innerHTML = '<div class="loader">Twitter読み込み中...</div>';
                window.twttr.widgets.createTweet(
                    tweetIdMatch[1], 
                    modalTweetEmbed, 
                    { theme: 'light', conversation: 'none', dnt: true }
                ).then(el => {
                    const loader = modalTweetEmbed.querySelector('.loader');
                    if(loader) loader.remove();
                    if (!el) modalTweetEmbed.innerHTML = '<p class="error-msg">埋め込み表示できませんでした。</p>';
                });
            }
        } else {
            modalTweetEmbed.innerHTML = '<p class="no-tweet">ツイートURLなし</p>';
        }

        modal.style.display = 'block';
    }

    function renderAlwaysOpenRecruitment(items) {
        if (!alwaysOpenSection || !alwaysOpenList) return;
        alwaysOpenList.innerHTML = ''; 

        if (items.length === 0) {
            alwaysOpenList.innerHTML = '<p style="text-align: center; color: #6c757d;">現在、常時公募枠はありません。</p>';
            alwaysOpenSection.style.display = 'block'; 
            return;
        }

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('always-open-item'); 
            itemDiv.innerHTML = `
                <div class="always-open-content">
                    <h3>${item.title}</h3>
                    <span class="arrow-icon">›</span>
                </div>
            `; 
            itemDiv.addEventListener('click', () => {
                const eventData = { ...item, start: new Date(), end: null };
                displayEventModal(eventData); 
            });
            alwaysOpenList.appendChild(itemDiv);
        });
        alwaysOpenSection.style.display = 'block'; 
    }

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
