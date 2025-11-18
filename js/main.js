// =======================================================================
// js/main.js (総期間計算適用版)
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
            
            // --- 1. 位置と幅の計算ロジック (総期間基準) ---
            let leftPercent = 0;
            let widthPercent = 100;
            let style = '';

        // js/main.js (最終修正版 - 排他的終了時間対応)
        if (!arg.event.allDay && arg.event.start) {
            const start = arg.event.start;
            const end = arg.event.end || start;

            // ----------------------------------------------------
            // 【総期間 (T) の計算】: イベントの描画要素の全幅（分）
            // ----------------------------------------------------
            const startOfSpan = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            
            // 排他的終了日の計算準備
            let exclusiveEndDate = end; 

            // ★修正ロジック: 終了時間が 00:00 ちょうどの場合、分母の基準日を1日前にする
            if (end.getHours() === 0 && end.getMinutes() === 0 && start.getDate() !== end.getDate()) {
                exclusiveEndDate = new Date(end.getTime() - (24 * 60 * 60 * 1000)); // 1日分戻す
            }

            // 描画終了日の翌日 0:00 を排他的終了点とする
            const endOfSpan = new Date(exclusiveEndDate.getFullYear(), exclusiveEndDate.getMonth(), exclusiveEndDate.getDate() + 1); 
            
            const totalSpanMinutes = (endOfSpan.getTime() - startOfSpan.getTime()) / 60000;
        // ... (後略) ...
                
                // ----------------------------------------------------
                // 【開始位置 (S) の計算】: 描画要素の左端 (0:00) からイベント開始時刻までのずれ
                // ----------------------------------------------------
                const startOffsetMinutes = (start.getTime() - startOfSpan.getTime()) / 60000; 

                // ----------------------------------------------------
                // 【期間 (D) の計算】: イベントの実際の長さ (分)
                // ----------------------------------------------------
                const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                
                // ----------------------------------------------------
                // 【パーセンテージ適用】
                // ----------------------------------------------------
                if (totalSpanMinutes > 0) {
                    leftPercent = (startOffsetMinutes / totalSpanMinutes) * 100;
                    widthPercent = (durationMinutes / totalSpanMinutes) * 100;
                }
                
                // ガード処理（幅が極端に狭い場合）
                if (widthPercent > 0 && widthPercent < 5) widthPercent = 5; // 最小幅5%確保

                // はみ出し防止（計算上は不要だが念のため）
                if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

                // 00:00開始のイベントは左端に寄せ、位置調整を無効化（見栄え重視）
                if (startOffsetMinutes === 0) {
                    leftPercent = 0;
                }

                style = `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;

            } else {
                // 終日イベントの場合はフル幅
                style = 'width: 100%;';
            }

            // --- 2. 時間テキスト生成 ---
            if (!arg.event.allDay && arg.event.start) {
                const formatDateTime = (d) => {
                    const m = (d.getMonth() + 1).toString().padStart(2, '0');
                    const day = d.getDate().toString().padStart(2, '0');
                    const h = d.getHours().toString().padStart(2, '0');
                    const min = d.getMinutes().toString().padStart(2, '0');
                    return `${m}/${day} ${h}:${min}`;
                };

                const startStr = formatDateTime(arg.event.start);
                const originalEnd = arg.event.end;
                
                if (originalEnd) {
                    const endStr = formatDateTime(originalEnd);
                    timeText = `${startStr} ~ ${endStr}`;
                } else {
                    timeText = startStr;
                }
            }

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

    // --- 以下、共通関数（変更なし） ---
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