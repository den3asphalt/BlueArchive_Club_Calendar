// =======================================================================
// js/main.js (24:00表記・今日へ自動ジャンプ・UI視認性向上版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    
    // 常時公募関連の要素
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');
    const alwaysOpenToggleBtn = document.getElementById('alwaysOpenToggleBtn');
    const alwaysOpenCount = document.getElementById('alwaysOpenCount');
    const alwaysOpenIcon = document.querySelector('.toggle-icon');

    // 画面幅が768px未満ならリスト表示
    const isMobile = window.innerWidth < 768;
    const initialViewType = isMobile ? 'listMonth' : 'dayGridMonth';

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: initialViewType,
        locale: 'ja',
        eventDisplay: 'auto', 
        
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? '' : 'dayGridMonth,listMonth' 
        },
        buttonText: { 
            today: '今日', 
            month: 'カレンダー', 
            list: 'リスト' 
        },
        
        views: {
            listMonth: {
                listDayFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }, 
                listDaySideFormat: false 
            }
        },
        
        dayMaxEvents: true, 
        contentHeight: 'auto',
        
        windowResize: function(view) {
            if (window.innerWidth < 768) {
                calendar.changeView('listMonth');
            } else {
                calendar.changeView('dayGridMonth');
            }
        },

        // ★【修正】カレンダー描画完了後のスクロール処理を強化
        datesSet: function(info) {
            if (info.view.type === 'listMonth') {
                // 描画のタイムラグを考慮して少し待つ
                setTimeout(() => {
                    // 今日の日付ヘッダーを探す
                    // FullCalendarは今日の日付枠に 'fc-list-day-now' クラスを付与します
                    let targetEl = document.querySelector('.fc-list-day-now');
                    
                    // 見つからない場合（今日イベントがない場合など）は、今日以降の最初のイベントを探す
                    if (!targetEl) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const allDays = document.querySelectorAll('.fc-list-day');
                        for (let day of allDays) {
                            if (day.getAttribute('data-date') >= todayStr) {
                                targetEl = day;
                                break;
                            }
                        }
                    }

                    // 要素が見つかったらスクロール
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300); // 確実に描画されるよう300ms待機
            }
        },

        // ★イベント表示のカスタマイズ
        eventContent: function(arg) {
            const event = arg.event;
            const isStart = arg.isStart;
            const isEnd = arg.isEnd;

            // =========================================================
            // 1. スマホ(リスト表示)の描画ロジック
            // =========================================================
            if (arg.view.type === 'listMonth') {
                let timeHtml = '';
                let labelHtml = '';
                
                // 時間フォーマット関数 (00:00を24:00に変換するオプション付き)
                const formatTime = (d, force24 = false) => {
                    const hours = d.getHours();
                    const minutes = d.getMinutes();
                    // 終了時間かつ00:00の場合は「24:00」と表記
                    if (force24 && hours === 0 && minutes === 0) {
                        return '24:00';
                    }
                    return d.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
                };

                // A. 単日イベント
                if (isStart && isEnd) {
                    if (!event.allDay) {
                        const startStr = formatTime(event.start);
                        // 終了時間が00:00なら24:00と表示
                        const endStr = event.end ? formatTime(event.end, true) : '';
                        timeHtml = endStr ? `${startStr} - ${endStr}` : startStr;
                    } else {
                        timeHtml = '終日';
                    }
                }
                // B. 複数日イベントの「開始日」
                else if (isStart) {
                    if (!event.allDay) {
                        timeHtml = formatTime(event.start);
                        labelHtml = `<span style="color: #007bff; font-weight: bold; font-size: 0.85em; margin-left: 6px; background: rgba(0,123,255,0.1); padding: 1px 4px; border-radius: 3px;">開始</span>`;
                    } else {
                        labelHtml = `<span style="color: #007bff; font-weight: bold; font-size: 0.85em;">開始日</span>`;
                    }
                }
                // C. 複数日イベントの「終了日」
                else if (isEnd) {
                    if (!event.allDay && event.end) {
                        // ★ここを修正: 終了時間は force24=true で「24:00」表記に対応
                        timeHtml = formatTime(event.end, true);
                        labelHtml = `<span style="color: #dc3545; font-weight: bold; font-size: 0.85em; margin-left: 6px; background: rgba(220,53,69,0.1); padding: 1px 4px; border-radius: 3px;">終了</span>`;
                    } else {
                        labelHtml = `<span style="color: #dc3545; font-weight: bold; font-size: 0.85em;">終了日</span>`;
                    }
                }
                // D. 複数日イベントの「中日 (期間中)」
                else {
                    timeHtml = ''; 
                    labelHtml = `<span style="color: #6c757d; font-size: 0.85em; background: #f8f9fa; padding: 1px 6px; border-radius: 10px; border: 1px solid #dee2e6;">期間中</span>`;
                }

                // HTML生成
                return { 
                    html: `
                        <div class="fc-list-custom-content" style="display: flex; align-items: center; width: 100%; color: #333; padding: 4px 0;">
                            <div style="min-width: 70px; display: flex; align-items: center; justify-content: flex-start;">
                                <span style="font-weight: bold; margin-right: 4px; font-family: monospace; font-size: 1.1em;">${timeHtml}</span>
                            </div>
                            ${labelHtml}
                            <span style="margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${event.title}</span>
                        </div>
                    ` 
                };
            }

            // =========================================================
            // 2. PC(月カレンダー)のバー表示ロジック (変更なし)
            // =========================================================
            let widthStyle = 'width: 100%;'; 

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
                        const sDate = new Date(startDate);
                        const eDate = new Date(calcEndDate);
                        sDate.setHours(0,0,0,0);
                        eDate.setHours(0,0,0,0);
                        const diffDays = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24));
                        segmentDays = diffDays + 1;
                    } else {
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

            const formatTimePC = (d) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            let startHtml = '';
            let endHtml = '';
            
            if (!event.allDay && event.start && isStart) {
                startHtml = `<span style="flex-shrink: 0; font-weight: bold; margin-right: 4px;">${formatTimePC(event.start)}</span>`;
            }
            if (!event.allDay && isEnd) {
                const endDate = event.end || event.start;
                endHtml = `<span style="flex-shrink: 0; font-weight: bold; margin-left: 4px;">${formatTimePC(endDate)}</span>`;
            }
            const titleHtml = `<span style="flex-grow: 1; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${event.title}</span>`;

            const containerStyle = `
                ${widthStyle} 
                display: flex; 
                align-items: center;
                justify-content: space-between; 
                padding: 1px 4px;
                font-size: 0.85em;
                height: 20px;
                overflow: hidden;
            `;

            return { 
                html: `
                    <div class="fc-event-inner-custom" style="${containerStyle}" title="${event.title}">
                        ${startHtml}
                        ${titleHtml}
                        ${endHtml}
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

    // --- 常時公募の開閉ロジック ---
    if (alwaysOpenToggleBtn) {
        alwaysOpenToggleBtn.addEventListener('click', function() {
            const isHidden = alwaysOpenList.style.display === 'none';
            if (isHidden) {
                alwaysOpenList.style.display = 'flex';
                if(alwaysOpenIcon) alwaysOpenIcon.style.transform = 'rotate(180deg)'; 
            } else {
                alwaysOpenList.style.display = 'none';
                if(alwaysOpenIcon) alwaysOpenIcon.style.transform = 'rotate(0deg)';
            }
        });
    }

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
                });
            }
        } else {
            modalTweetEmbed.innerHTML = '<p class="no-tweet">ツイートURLなし</p>';
        }

        modal.style.display = 'block';
    }

    function renderAlwaysOpenRecruitment(items) {
        if (!alwaysOpenSection || !alwaysOpenList) return;
        
        if(alwaysOpenCount) alwaysOpenCount.textContent = items.length;

        alwaysOpenList.innerHTML = ''; 

        if (items.length === 0) {
            alwaysOpenSection.style.display = 'none'; 
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
        alwaysOpenList.style.display = 'none';
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