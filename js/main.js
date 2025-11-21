// =======================================================================
// js/main.js (UI/UX改善: シンプル表示・バグ修正完了版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection'); // 追加
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');       // 追加

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        eventDisplay: 'block', 
        
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: '' 
        },
        buttonText: { today: '今日', month: '月' },
        dayMaxEvents: true, 
        contentHeight: 'auto',

        // ★イベント表示のカスタマイズ
        eventContent: function(arg) {
            const event = arg.event;
            const isStart = arg.isStart;
            const isEnd = arg.isEnd;
            
            let innerContent = `<span class="fc-event-title-label">${event.title}</span>`;
            let style = 'width: 100%;'; // デフォルトは全幅

            // 時間指定があるイベントのみ計算する
            if (!event.allDay && event.start) {
                const MINUTES_IN_DAY = 1440;
                const startDate = event.start;
                const endDate = event.end || event.start; 

                // --- A. 開始セグメント (左側にマージンが必要) ---
                if (isStart) {
                    // 1. 分母(segmentDays)の計算
                    let segmentDays = 1;
                    let segmentStart = new Date(startDate);
                    
                    if (isEnd) {
                        // 単一行完結: (終了 - 開始) の日数
                        const diffTime = Math.abs(endDate - startDate); // ここは実時間で計算
                        segmentDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (segmentDays < 1) segmentDays = 1;
                        
                        // ただし、日を跨がない(同日)場合は1日
                         if (startDate.getDate() === endDate.getDate() && startDate.getMonth() === endDate.getMonth()) {
                            segmentDays = 1;
                        }
                    } else {
                        // 週またぎの開始行: 土曜日までの日数
                        const startDay = segmentStart.getDay(); 
                        const daysUntilSat = 6 - startDay;
                        segmentDays = daysUntilSat + 1;
                    }

                    // 2. スタイルの計算
                    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                    const leftPercent = (startMinutes / (MINUTES_IN_DAY * segmentDays)) * 100;
                    
                    let widthPercent;
                    if (isEnd) {
                        // 単一行完結の場合
                        let endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                        // 00:00終了かつ日付が違う場合は24:00扱い
                        if (endMinutes === 0 && endDate > startDate) endMinutes = MINUTES_IN_DAY;
                        
                        const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
                        widthPercent = (durationMinutes / (MINUTES_IN_DAY * segmentDays)) * 100;
                    } else {
                        // 翌週へ続く場合
                        widthPercent = 100 - leftPercent;
                    }

                    style = `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;
                    
                    const timeStr = startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                    innerContent = `<span class="fc-event-time-label">${timeStr} -></span> ` + innerContent;
                } 
                // --- B. 終了セグメント (右側で切れる・00:00またぎ対策あり) ---
                else if (isEnd) {
                    // 1. 00:00終了またぎ対策 (前日の24:00として計算)
                    let calcEndDate = new Date(endDate);
                    let calcEndMinutes = calcEndDate.getHours() * 60 + calcEndDate.getMinutes();

                    if (calcEndMinutes === 0) {
                        calcEndDate.setDate(calcEndDate.getDate() - 1);
                        calcEndMinutes = 1440; // 24:00
                    }

                    // 2. 分母と分子の計算
                    const endDayIndex = calcEndDate.getDay(); // 0(Sun) - 6(Sat)
                    const segmentDays = endDayIndex + 1;      // 日曜開始からの日数
                    
                    const totalMinutes = (endDayIndex * MINUTES_IN_DAY) + calcEndMinutes;
                    const totalCapacity = segmentDays * MINUTES_IN_DAY;
                    
                    let widthPercent = (totalMinutes / totalCapacity) * 100;
                    if (widthPercent > 100) widthPercent = 100;
                    
                    style = `width: ${widthPercent}%;`;
                    
                    const timeStr = endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                    innerContent = innerContent + ` <span class="fc-event-time-label">-> ${timeStr}</span>`;
                }
                // --- C. 中間の週 (isStartでもisEndでもない) ---
                else {
                    // デフォルトの style='width: 100%;' が適用されるので何もしない
                }
            }

            return { 
                html: `
                    <div class="fc-event-inner-custom" style="${style}" title="${event.title}">
                        ${innerContent}
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

    // --- 共通関数 ---
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
        // 上部で定義した alwaysOpenSection / List を使用
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