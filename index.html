// =======================================================================
// js/main.js (改善版)
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const alwaysOpenSection = document.getElementById('alwaysOpenRecruitmentSection');
    const alwaysOpenList = document.getElementById('alwaysOpenRecruitmentList');

    // 画面幅判定
    const isMobile = window.innerWidth <= 768;

    // 【改善1】スマホの初期ビューを 'listMonth' に変更
    // これにより、タップなしでその月の予定を縦スクロールで一気に確認できます。
    // ※ FullCalendarのStandard Bundleにはlist viewが含まれています
    const initialView = isMobile ? 'listMonth' : 'dayGridMonth';

    // 【改善2】ヘッダーツールバーの最適化
    // スマホではタイトルを中央、切り替えを右に配置し、ボタンを厳選
    const headerToolbar = isMobile ? {
        left: 'prev,next',
        center: 'title',
        right: 'listMonth,dayGridMonth' // 週表示(listWeek)は情報量が中途半端なので削除、カレンダーかリストかの二択にする
    } : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth'
    };

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: initialView,
        locale: 'ja',
        headerToolbar: headerToolbar,
        buttonText: {
            today: '今日',
            month: '月',
            week: '週',
            day: '日',
            list: 'リスト' // 「週」から汎用的な「リスト」に変更
        },
        // スマホのリスト表示で日付が目立つようにカスタマイズ
        listDayFormat: { month: 'long', day: 'numeric', weekday: 'short' },
        listDaySideFormat: false, // 左側の日付表示を消してスッキリさせる（好みによる）
        
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        allDayText: '終日',
        
        // 高さの自動調整（スマホで縦に伸びすぎるのを防ぐ場合は固定値を検討、今回は自動）
        contentHeight: 'auto',
        
        // イベント取得ロジック（変更なし）
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

        // イベント表示のカスタマイズ
        eventContent: function(arg) {
            // listビュー（スマホメイン）での表示情報量を増やす
            if (arg.view.type.startsWith('list')) {
                // サークル名があれば表示したいが、event.titleに既に含まれている想定
                // 色分けなどが設定されていればここでクラス付与可能
                return { html: `<div class="fc-list-event-content-custom">${arg.event.title}</div>` };
            }
            return { html: `<div>${arg.event.title}</div>` };
        },

        eventClick: function(info) {
            info.jsEvent.preventDefault();
            displayEventModal(info.event);
        }
    });

    calendar.render();

    // --- 以下、モーダルと常時公募のロジック（変更なし、または微調整） ---

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
            // 【改善3】リンクのタップ領域を明確にするためのクラス付与（CSSで装飾推奨）
            modalCircleName.innerHTML = `<a href="/circle.html?id=${props.clubId}" class="modal-circle-link" target="_blank">${circleNameText} <span style="font-size:0.8em">🔗</span></a>`;
        } else {
            modalCircleName.textContent = circleNameText;
        }
        
        modalRelatedInfo.innerHTML = props.relatedInfo ? marked.parse(props.relatedInfo) : 'なし';
        
        // 日付フォーマット処理（変更なし）
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

        // Twitter埋め込み
        modalTweetEmbed.innerHTML = ''; 
        modalTweetLink.innerHTML = ''; 
        
        if (props.tweetUrl) {
            // 常にテキストリンクは表示しておく（埋め込み失敗時の保険 兼 UX向上）
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
                    
                    if (!el) {
                        modalTweetEmbed.innerHTML = '<p class="error-msg">埋め込み表示できませんでした。</p>';
                    }
                });
            }
        } else {
            modalTweetEmbed.innerHTML = '<p class="no-tweet">ツイートURLなし</p>';
        }

        modal.style.display = 'block';
    }

    // 常時公募枠（変更なし、ただしCSSでクリック可能感を出すこと推奨）
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
            // タップ誘導のためのアイコン追加
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

    // モーダル閉じる処理（変更なし）
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('.close-button');
    
    // 閉じるボタンのタップ判定を広げるためのラッパー関数推奨だが今回はそのまま
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
