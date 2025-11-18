// =======================================================================
// js/main.js (期間表示対応版)
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
        buttonText: { today: '今日', month: '月' },
        
        dayMaxEvents: true, 
        contentHeight: 'auto',

        // イベント表示内容のカスタマイズ
        eventContent: function(arg) {
            let timeText = '';
            
            // --- 位置と幅の計算ロジック (前回と同じ) ---
            let leftPercent = 0;
            let widthPercent = 100;

            if (!arg.event.allDay && arg.event.start) {
                const start = arg.event.start;
                // 終了未設定時は仮に2時間とする
                const end = arg.event.end || new Date(start.getTime() + (2 * 60 * 60 * 1000)); 

                const startMinutes = start.getHours() * 60 + start.getMinutes();
                let endMinutes = end.getHours() * 60 + end.getMinutes();
                if (end.getDate() !== start.getDate()) {
                    endMinutes = 1440; 
                }
                if (endMinutes === 0 && end.getDate() !== start.getDate()) {
                    endMinutes = 1440;
                }

                leftPercent = (startMinutes / 1440) * 100;
                let durationMinutes = endMinutes - startMinutes;
                if (durationMinutes < 0) durationMinutes = 1440 - startMinutes;

                widthPercent = (durationMinutes / 1440) * 100;

                if (leftPercent > 85) leftPercent = 85; 
                if (widthPercent < 15) widthPercent = 15; 
                if (leftPercent + widthPercent > 100) {
                    widthPercent = 100 - leftPercent;
                }

                // --- 【修正】時間テキスト生成 (XX/XX XX:XX ~ XX/XX XX:XX) ---
                const formatDateTime = (d) => {
                    const m = (d.getMonth() + 1).toString().padStart(2, '0');
                    const day = d.getDate().toString().padStart(2, '0');
                    const h = d.getHours().toString().padStart(2, '0');
                    const min = d.getMinutes().toString().padStart(2, '0');
                    return `${m}/${day} ${h}:${min}`;
                };

                const startStr = formatDateTime(start);
                // 実際のイベントデータにendが無い場合は空文字扱いでstartのみ表示等の処理
                // ※計算用のendではなく arg.event.end を使う
                const originalEnd = arg.event.end;
                
                if (originalEnd) {
                    const endStr = formatDateTime(originalEnd);
                    timeText = `${startStr} ~ ${endStr}`;
                } else {
                    timeText = startStr; // 終了未定の場合
                }
            }

            // スタイル生成
            const style = arg.event.allDay 
                ? '' 
                : `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;

            // ホバー時に全文を表示するための title 属性を追加
            const tooltipText = timeText ? `${timeText}\n${arg.event.title}` : arg.event.title;

            return { 
                html: `
                    <div class="fc-event-inner" style="${style}" title="${tooltipText}">
                        <div class="fc-event-time-row">${timeText}</div>
                        <div class="fc-event-title-row">${arg.event.title}</div>
                    </div>
                ` 
            };
        },

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

    // --- 以下、モーダル・常時公募関数（変更なし） ---
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