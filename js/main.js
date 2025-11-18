// =======================================================================
// js/main.js (枠またぎ対応・最終版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    // ... (前略：カレンダー初期化設定まで) ...
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        
        // ... (中略：headerToolbar, buttonText, dayMaxEventsは変更なし) ...

        // イベント表示内容のカスタマイズ
        eventContent: function(arg) {
            let timeText = '';
            
            // 現在描画しているセグメントの情報
            const isStartDay = arg.isStart;
            const isEndDay = arg.isEnd;

            // --- 1. 位置と幅の計算ロジック (セグメント基準) ---
            let leftPercent = 0;
            let widthPercent = 100;
            let style = '';

            // 終日イベントでない場合のみ計算
            if (!arg.event.allDay && arg.event.start) {
                const start = arg.event.start;
                const end = arg.event.end || new Date(start.getTime() + (2 * 60 * 60 * 1000)); // 終了未設定時は仮に2時間

                // 1日の総分数 (1440分) を基準 (100%) とする
                const TOTAL_DAILY_MINUTES = 1440;
                
                let segmentStartMinutes = 0;
                let segmentEndMinutes = TOTAL_DAILY_MINUTES;

                // ----------------------------------------------------
                // ★修正ロジック: isStart/isEnd フラグを使って、このセグメントの開始・終了時刻を決定
                // ----------------------------------------------------

                // [1] 開始位置 (margin-left) の決定
                if (isStartDay) {
                    // イベントの開始時刻をセグメントの開始点とする
                    segmentStartMinutes = start.getHours() * 60 + start.getMinutes();
                } else {
                    // 中間日または最終日は 0:00 (0分) スタート
                    segmentStartMinutes = 0;
                }

                // [2] 終了位置 (width) の決定
                if (isEndDay) {
                    // イベントの終了時刻をセグメントの終了点とする
                    segmentEndMinutes = end.getHours() * 60 + end.getMinutes();
                    // 終了が0:00の場合は24:00 (1440分) 終了とみなす
                    if (segmentEndMinutes === 0) segmentEndMinutes = TOTAL_DAILY_MINUTES; 
                } else {
                    // 開始日または中間日は 24:00 (1440分) エンド
                    segmentEndMinutes = TOTAL_DAILY_MINUTES;
                }

                // [3] パーセンテージ計算
                leftPercent = (segmentStartMinutes / TOTAL_DAILY_MINUTES) * 100;
                let durationMinutes = segmentEndMinutes - segmentStartMinutes;
                
                // 期間の分数がマイナスになった場合 (ロジック上発生しにくいが安全策) は残りの幅を使用
                if (durationMinutes < 0) durationMinutes = TOTAL_DAILY_MINUTES - segmentStartMinutes; 

                widthPercent = (durationMinutes / TOTAL_DAILY_MINUTES) * 100;
                
                // --- ガード処理 --- (単日イベントの体裁維持用)
                if (isStartDay && leftPercent > 85) leftPercent = 85; 
                if (isEndDay && widthPercent < 15) widthPercent = 15; 
                
                // 期間がマイナスになる特殊なケースで0%以下になるのを防ぐ
                if (widthPercent < 0) widthPercent = 100;

                style = `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;

            } else {
                // 終日イベントはフル幅
                style = 'width: 100%;';
            }

            // --- 2. 時間テキスト生成 (変更なし) ---
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

        // ... (後略：events, eventClick, 共通関数は変更なし) ...
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