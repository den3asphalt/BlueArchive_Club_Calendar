// =======================================================================
// js/main.js (複数日ズレ修正・完全版)
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
            
            // 現在描画しているセグメントが、イベント全体の「最初」か「最後」か
            const isStartDay = arg.isStart;
            const isEndDay = arg.isEnd;

            // --- 1. 位置と幅の計算ロジック (修正版) ---
            let leftPercent = 0;
            let widthPercent = 100;

            // 終日イベントでない場合のみ計算
            if (!arg.event.allDay) {
                // デフォルトは「その日の0:00開始、24:00終了」とする
                let segmentStartMinutes = 0;
                let segmentEndMinutes = 1440; // 24 * 60

                // ■開始日の場合のみ、開始時間を適用 (それ以外は0:00スタート)
                if (isStartDay && arg.event.start) {
                    const start = arg.event.start;
                    segmentStartMinutes = start.getHours() * 60 + start.getMinutes();
                }

                // ■終了日の場合のみ、終了時間を適用 (それ以外は24:00エンド)
                if (isEndDay && arg.event.end) {
                    const end = arg.event.end;
                    let endMin = end.getHours() * 60 + end.getMinutes();
                    // 0:00終了ジャストの場合は24:00扱いにする
                    if (endMin === 0) endMin = 1440;
                    segmentEndMinutes = endMin;
                }
                
                // 単発イベントで終了時刻未設定の場合のフォールバック
                if (isStartDay && isEndDay && !arg.event.end && arg.event.start) {
                     segmentEndMinutes = segmentStartMinutes + 120; // 2時間
                }

                // パーセント計算
                leftPercent = (segmentStartMinutes / 1440) * 100;
                let durationMinutes = segmentEndMinutes - segmentStartMinutes;
                widthPercent = (durationMinutes / 1440) * 100;

                // --- ガード処理（視認性確保） ---
                
                // 「開始日」において、あまりに右に寄りすぎると見えないので制限
                if (isStartDay && leftPercent > 85) leftPercent = 85;
                
                // 幅が極端に細くなるのを防ぐ
                if (widthPercent < 15) widthPercent = 15; 
                
                // はみ出し防止 (左位置 + 幅 が 100% を超えないように)
                if (leftPercent + widthPercent > 100) {
                    widthPercent = 100 - leftPercent;
                }
            }

            // --- 2. 時間テキスト生成 (ここは変更なし: 全体の期間を表示) ---
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

            // スタイル生成
            const style = arg.event.allDay 
                ? '' 
                : `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;

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