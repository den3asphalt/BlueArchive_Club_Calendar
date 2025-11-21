// =======================================================================
// js/main.js (常時公募の期間非表示対応版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');

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
            
            // デフォルトの幅
            let widthStyle = 'width: 100%;'; 

            // --- 1. バーの長さ（幅・位置）の計算 ---
            // ※計算ロジックは前回の修正（正しく動くもの）を維持しています
            if (!event.allDay && event.start) {
                const MINUTES_IN_DAY = 1440;
                const startDate = event.start;
                let rawEndDate = event.end || event.start;
                
                let calcEndDate = new Date(rawEndDate);
                let calcEndMinutes = calcEndDate.getHours() * 60 + calcEndDate.getMinutes();

                if (calcEndMinutes === 0 && calcEndDate > startDate) {
                    calcEndDate.setDate(calcEndDate.getDate() - 1);
                    calcEndMinutes = 1440; 
                }

                if (isStart) {
                    let segmentDays = 1;
                    if (isEnd) {
                        // 単一行完結
                        const sDate = new Date(startDate);
                        const eDate = new Date(calcEndDate);
                        sDate.setHours(0,0,0,0);
                        eDate.setHours(0,0,0,0);
                        const diffDays = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24));
                        segmentDays = diffDays + 1;
                    } else {
                        // 週またぎ開始行
                        const startDay = startDate.getDay(); 
                        const daysUntilSat = 6 - startDay;
                        segmentDays = daysUntilSat + 1;
                    }

                    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                    const leftPercent = (startMinutes / (MINUTES_IN_DAY * segmentDays)) * 100;
                    
                    let widthPercent;
                    if (isEnd) {
                        const durationMinutes = (calcEndDate.getTime() - startDate.getTime()) / (1000 * 60);
                        widthPercent = (durationMinutes / (MINUTES_IN_DAY * segmentDays)) * 100;
                    } else {
                        widthPercent = 100 - leftPercent;
                    }
                    widthStyle = `margin-left: ${leftPercent}%; width: ${widthPercent}%;`;
                } 
                else if (isEnd) {
                    const endDayIndex = calcEndDate.getDay(); 
                    const segmentDays = endDayIndex + 1;      
                    const totalMinutes = (endDayIndex * MINUTES_IN_DAY) + calcEndMinutes;
                    const totalCapacity = segmentDays * MINUTES_IN_DAY;
                    
                    let widthPercent = (totalMinutes / totalCapacity) * 100;
                    if (widthPercent > 100) widthPercent = 100;
                    
                    widthStyle = `width: ${widthPercent}%;`;
                }
            }

            // --- 2. テキスト表示の生成 (1行・時刻のみ) ---
            const formatTime = (d) => {
                return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            };

            let displayText = '';

            if (!event.allDay && event.start) {
                // 開始時間 (セグメントの始まりのみ表示)
                if (isStart) {
                    displayText += `${formatTime(event.start)} -> `;
                }

                // サークル名
                displayText += event.title;

                // 終了時間 (セグメントの終わり＝イベント全体の終わりのみ表示)
                if (isEnd) {
                    const endDate = event.end || event.start;
                    displayText += ` -> ${formatTime(endDate)}`;
                }
            } else {
                // 時間がない場合など
                displayText = event.title;
            }

            // 1行表示用のスタイル (flex-direction: column を削除し、nowrapに)
            const containerStyle = `
                ${widthStyle} 
                display: flex; 
                align-items: center;
                white-space: nowrap; 
                overflow: hidden; 
                text-overflow: ellipsis;
                padding: 1px 4px;
                font-size: 0.85em;
                height: 20px; /* 高さ固定で揃える */
            `;

            return { 
                html: `
                    <div class="fc-event-inner-custom" style="${containerStyle}" title="${event.title}">
                        <span class="fc-event-title-label">${displayText}</span>
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
        
        const props = eventData.extendedProps || {};
        const circleNameText = props.circleName || '不明';

        modalTitle.textContent = eventData.title;
        
        if (props.clubId) {
            modalCircleName.innerHTML = `<a href="/circle.html?id=${props.clubId}" class="modal-circle-link" target="_blank">${circleNameText} <span style="font-size:0.8em">🔗</span></a>`;
        } else {
            modalCircleName.textContent = circleNameText;
        }
        
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
        // === 【修正】常時公募の場合は期間を非表示にする ===
        const durationContainer = modalDuration.closest('p') || modalDuration.parentElement;
        
        if (props.recruitmentType === '常時公募') {
            durationContainer.style.display = 'none';
        } else {
            durationContainer.style.display = 'block';
            
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
        }
        // ===================================================

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
                // extendedPropsが含まれているitemをそのまま渡す
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