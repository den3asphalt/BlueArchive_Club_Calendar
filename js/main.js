
// =======================================================================
// Google Analytics (GA4) の動的読み込み
// =======================================================================
(function() {
    // ★ここに取得した測定IDを入れてください
    const GA_ID = 'G-HN3YK955QX'; 

    // 1. 外部スクリプト (gtag.js) を生成してheadに追加
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // 2. dataLayerの初期化と設定
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    
    // JSで読み込むため、少しタイミングを考慮して即時実行
    gtag('js', new Date());
    gtag('config', GA_ID);
})();


// =======================================================================
// js/main.js (直近・カレンダーボタン統一 & UI改善版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    
    // 常時公募関連
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');
    const alwaysOpenToggleBtn = document.getElementById('alwaysOpenToggleBtn');
    const alwaysOpenCount = document.getElementById('alwaysOpenCount');
    const alwaysOpenIcon = document.querySelector('.toggle-icon');

    // 画面幅判定
    const isMobile = window.innerWidth < 768;
    
    // ★初期ビュー: スマホは「直近」、PCは「カレンダー」
    const initialViewType = isMobile ? 'listUpcoming' : 'dayGridMonth';

    const calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: 'Asia/Tokyo', 

        initialView: initialViewType,
        locale: 'ja',
        eventDisplay: 'auto', 
        
        // ★ビュー定義
        views: {
            // 直近ビュー (今後2週間のリスト)
            listUpcoming: {
                type: 'list',
                duration: { days: 14 }, 
                buttonText: '直近', // ボタン名
                listDayFormat: { month: 'numeric', day: 'numeric', weekday: 'short' },
                listDaySideFormat: false
            },
            // カレンダービュー (月グリッド)
            dayGridMonth: {
                buttonText: 'カレンダー' // ボタン名
            }
        },

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            // ★ここを統一: 「直近」と「カレンダー」の2つだけにする
            right: 'listUpcoming,dayGridMonth' 
        },
        buttonText: { 
            today: '今日',
        },
        
        dayMaxEvents: true, 
        contentHeight: 'auto',
        
        // リサイズ時の自動切り替え
        windowResize: function(view) {
            const currentIsMobile = window.innerWidth < 768;
            if (currentIsMobile) {
                // PC -> スマホ: 直近リストへ
                if (view.type === 'dayGridMonth') {
                    calendar.changeView('listUpcoming');
                }
            } else {
                // スマホ -> PC: カレンダーへ
                if (view.type === 'listUpcoming') {
                    calendar.changeView('dayGridMonth');
                }
            }
        },

        // スクロール処理 (直近リスト用)
        datesSet: function(info) {
            if (info.view.type === 'listUpcoming') {
                setTimeout(() => {
                    let targetEl = document.querySelector('.fc-list-day-now');
                    if (!targetEl) {
                        const todayJST = new Date().toLocaleDateString('en-CA', {
                            timeZone: 'Asia/Tokyo',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        const allDays = document.querySelectorAll('.fc-list-day');
                        for (let day of allDays) {
                            if (day.getAttribute('data-date') >= todayJST) {
                                targetEl = day;
                                break;
                            }
                        }
                    }
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);
            }
        },

        // イベント表示ロジック
        eventContent: function(arg) {
            const event = arg.event;
            const isStart = arg.isStart;
            const isEnd = arg.isEnd;

            // 時間フォーマット
            const formatTime = (d, force24 = false) => {
                const jstDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
                const hours = jstDate.getHours();
                const minutes = jstDate.getMinutes();
                if (force24 && hours === 0 && minutes === 0) return '24:00';
                return jstDate.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
            };

            // === A. リスト表示 (直近ビューなど) ===
            if (arg.view.type.includes('list')) {
                let timeHtml = '';
                let labelHtml = '';
                
                if (isStart && isEnd) {
                    if (!event.allDay) {
                        const startStr = formatTime(event.start);
                        const endStr = event.end ? formatTime(event.end, true) : '';
                        timeHtml = endStr ? `${startStr} - ${endStr}` : startStr;
                    } else {
                        timeHtml = '終日';
                    }
                }
                else if (isStart) {
                    if (!event.allDay) {
                        timeHtml = formatTime(event.start);
                        labelHtml = `<span class="list-badge start-badge">開始</span>`;
                    } else {
                        labelHtml = `<span class="list-badge start-badge">開始日</span>`;
                    }
                }
                else if (isEnd) {
                    if (!event.allDay && event.end) {
                        timeHtml = formatTime(event.end, true);
                        labelHtml = `<span class="list-badge end-badge">終了</span>`;
                    } else {
                        labelHtml = `<span class="list-badge end-badge">終了日</span>`;
                    }
                }
                else {
                    labelHtml = `<span class="list-badge during-badge">期間中</span>`;
                }

                return { 
                    html: `
                        <div class="fc-list-custom-content">
                            <div class="list-time-col"><span class="list-time-text">${timeHtml}</span></div>
                            ${labelHtml}
                            <span class="list-title-text">${event.title}</span>
                        </div>
                    ` 
                };
            }

            // === B. グリッド表示 (カレンダービュー) ===
            // PC・スマホ共通のバーデザイン
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
                        segmentDays = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
                    } else {
                        segmentDays = (6 - startDate.getDay()) + 1;
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

            let startBadge = '';
            let endBadge = '';
            const pcTimeFormat = (d) => {
                const jstD = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
                return jstD.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            };

            if (!event.allDay && event.start && isStart) {
                startBadge = `<span class="pc-time-badge pc-start-time">${pcTimeFormat(event.start)}</span>`;
            }

            if (!event.allDay && isEnd) {
                const endDate = event.end || event.start;
                let endText = pcTimeFormat(endDate);
                const jstEnd = new Date(endDate.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
                if (jstEnd.getHours() === 0 && jstEnd.getMinutes() === 0) endText = '24:00';
                endBadge = `<span class="pc-time-badge pc-end-time">${endText}</span>`;
            }

            const containerStyle = `
                ${widthStyle}
                display: flex; 
                align-items: center;
                justify-content: space-between; 
                overflow: hidden;
                height: 22px; 
            `;

            return { 
                html: `
                    <div class="fc-event-inner-custom pc-event-bar" style="${containerStyle}" title="${event.title}">
                        <div class="pc-event-left">${startBadge}</div>
                        <div class="pc-event-center">${event.title}</div>
                        <div class="pc-event-right">${endBadge}</div>
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

    // 常時公募
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

    // Google Analytics (動的注入)
    (function() {
        // ★ここに測定IDを入れてください (例: G-ABC123456)
        const GA_ID = 'G-XXXXXXXXXX'; 
        if (GA_ID === 'G-XXXXXXXXXX') return; // ID未設定時は実行しない

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA_ID);
    })();

    // 共通関数
    function displayEventModal(eventData) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalCircleName = document.getElementById('modalCircleName');
        const modalDuration = document.getElementById('modalDuration');
        const modalRelatedInfo = document.getElementById('modalRelatedInfo');
        const modalTweetEmbed = document.getElementById('modalTweetEmbed');
        const modalTweetLink = document.getElementById('modalTweetLink');
        
        const props = eventData.extendedProps || {};
        modalTitle.textContent = eventData.title;
        
        if (props.clubId) {
            modalCircleName.innerHTML = `<a href="/circle.html?id=${props.clubId}" class="modal-circle-link" target="_blank">${props.circleName || '不明'} <span style="font-size:0.8em">🔗</span></a>`;
        } else {
            modalCircleName.textContent = props.circleName || '不明';
        }
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
        const durationContainer = modalDuration.closest('p') || modalDuration.parentElement;
        if (props.recruitmentType === '常時公募') {
            durationContainer.style.display = 'none';
        } else {
            durationContainer.style.display = 'block';
            let durationText = '';
            const formatJST = (d) => new Date(d.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));

            if (eventData.start) {
                const start = formatJST(new Date(eventData.start));
                const end = eventData.end ? formatJST(new Date(eventData.end)) : null;
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
                window.twttr.widgets.createTweet(tweetIdMatch[1], modalTweetEmbed, { theme: 'light', conversation: 'none', dnt: true }).then(el => {
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
            itemDiv.innerHTML = `<div class="always-open-content"><h3>${item.title}</h3><span class="arrow-icon">›</span></div>`; 
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