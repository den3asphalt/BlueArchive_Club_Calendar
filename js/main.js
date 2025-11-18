// =======================================================================
// js/main.js (タイムライン可視化版)
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
            
            // --- 位置と幅の計算ロジック ---
            let leftPercent = 0;  // 左端からの距離 (%)
            let widthPercent = 100; // バーの長さ (%)

            if (!arg.event.allDay && arg.event.start) {
                const start = arg.event.start;
                const end = arg.event.end || new Date(start.getTime() + (2 * 60 * 60 * 1000)); // 終了がない場合は仮に2時間後とする

                // 1日を1440分として計算
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                
                // 終了時間が翌日にまたぐ場合の考慮（簡易的に24:00=1440とする）
                let endMinutes = end.getHours() * 60 + end.getMinutes();
                if (end.getDate() !== start.getDate()) {
                    endMinutes = 1440; // 日を跨ぐ場合はその日の終わりまでバーを伸ばす
                }
                
                // 終了時間が0:00(24:00)の場合の補正
                if (endMinutes === 0 && end.getDate() !== start.getDate()) {
                    endMinutes = 1440;
                }

                // パーセント計算 (1440分 = 100%)
                leftPercent = (startMinutes / 1440) * 100;
                
                // 幅の計算
                let durationMinutes = endMinutes - startMinutes;
                if (durationMinutes < 0) durationMinutes = 1440 - startMinutes; // 念のため

                widthPercent = (durationMinutes / 1440) * 100;

                // 【視認性調整】
                // あまりに右に寄りすぎると文字が読めないので、最大85%くらいで止める
                // また、幅が狭すぎるとクリックできないので、最低幅を確保する
                if (leftPercent > 85) leftPercent = 85; 
                if (widthPercent < 15) widthPercent = 15; 
                
                // 左位置 + 幅 が 100% を超えないように調整
                if (leftPercent + widthPercent > 100) {
                    widthPercent = 100 - leftPercent;
                }

                // 時間テキスト生成
                const formatTime = (d) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                timeText = formatTime(start);
            }

            // スタイル文字列の生成
            // 終日イベント(allDay)の場合は左端0、幅100%
            const style = arg.event.allDay 
                ? '' 
                : `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;

            // HTMLの組み立て
            return { 
                html: `
                    <div class="fc-event-inner" style="${style}">
                        <div class="fc-event-time-row">${timeText}</div>
                        <div class="fc-event-title-row">${arg.event.title}</div>
                    </div>
                ` 
            };
        },

        // イベントクラスの動的付与ロジックは不要になったので削除（styleで制御するため）

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