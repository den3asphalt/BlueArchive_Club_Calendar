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
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: '今日',
            month: '月',
            week: '週',
            day: '日'
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        slotLabelFormat: {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        },
        allDayText: '終日',

        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const response = await fetch('/.netlify/functions/get-calendar-events');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                successCallback(data.calendarEvents); 
                renderAlwaysOpenRecruitment(data.alwaysOpenRecruitment);

            } catch (error) {
                console.error("Error fetching events:", error);
                failureCallback(error);
            }
        },

        eventContent: function(arg) {
            const div = document.createElement('div');
            div.innerHTML = `<strong>${arg.event.title}</strong>`;
            return { domNodes: [div] };
        },

        eventClassNames: function(arg) {
            const category = arg.event.extendedProps.category;
            return category ? ['category-' + category.replace(/\s/g, '-')] : ['category-不明'];
        },

        eventClick: function(info) {
            info.jsEvent.preventDefault();

            const event = info.event;
            const props = event.extendedProps;

            const modal = document.getElementById('eventModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalCircleName = document.getElementById('modalCircleName');
            const modalCategory = document.getElementById('modalCategory');
            const modalDuration = document.getElementById('modalDuration');
            const modalRelatedInfo = document.getElementById('modalRelatedInfo'); // これが変更対象
            const modalTweetEmbed = document.getElementById('modalTweetEmbed');
            const modalTweetLink = document.getElementById('modalTweetLink');
            
            // モーダル情報を設定
            modalTitle.textContent = event.title;
            modalCircleName.textContent = props.circleName || '不明';
            modalCategory.textContent = props.category || '不明';
            
            // ★★★ 関連情報をMarkdownとしてパースして表示 ★★★
            if (props.relatedInfo) {
                // Marked.jsを使ってMarkdownをHTMLに変換
                modalRelatedInfo.innerHTML = marked.parse(props.relatedInfo);
            } else {
                modalRelatedInfo.innerHTML = 'なし';
            }
            
            // 期間の表示を整形
            let durationText = '未設定';
            if (event.start && event.end) {
                if (event.start.toDateString() !== event.end.toDateString()) {
                    durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} ${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                    if (event.end && event.start.getTime() !== event.end.getTime()) {
                        durationText += ` - ${event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                    }
                }
            } else if (event.start) {
                durationText = event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                if (event.allDay) {
                     durationText += ' (終日)';
                }
            }
            modalDuration.textContent = durationText;

            // 場所の表示 (もしDatoCMSにLocationフィールドを追加していて、かつ表示したい場合)
            const modalLocationElement = document.getElementById('modalLocation'); 
            if (modalLocationElement) { // index.htmlに要素がある前提
                const locationParagraph = modalLocationElement.closest('p'); 
                if (props.location) { // locationデータが存在する場合
                    modalLocationElement.textContent = props.location;
                    locationParagraph.style.display = 'block';
                } else {
                    locationParagraph.style.display = 'none';
                }
            }
            
            // ツイート埋め込みの処理
            modalTweetEmbed.innerHTML = ''; 
            modalTweetLink.innerHTML = '';  

            if (props.tweetUrl) {
                const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
                if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                    const loadingMessageElement = document.createElement('p');
                    loadingMessageElement.style.textAlign = 'center';
                    loadingMessageElement.textContent = 'Twitterコンテンツを読み込み中...';
                    modalTweetEmbed.appendChild(loadingMessageElement); 

                    window.twttr.widgets.createTweet(
                        tweetIdMatch[1], 
                        modalTweetEmbed, 
                        { theme: 'light', conversation: 'none', cards: 'hidden', width: '450' }
                    ).then(function (el) {
                        if (loadingMessageElement && loadingMessageElement.parentNode) {
                            loadingMessageElement.remove(); 
                        }
                        if (!el) { 
                            modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">指定されたツイートは存在しないか、非公開です。<br>または、ブラウザの拡張機能（広告ブロッカー等）によってコンテンツがブロックされている可能性があります。</p>';
                        }
                    }).catch(function (error) {
                        if (loadingMessageElement && loadingMessageElement.parentNode) {
                            loadingMessageElement.remove();
                        }
                        console.error('Twitterコンテンツ埋め込みエラー:', error);
                        modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">Twitterコンテンツの読み込み中にエラーが発生しました。<br>ネットワーク接続やブラウザの拡張機能をご確認ください。</p>';
                    });
                } else {
                    modalTweetLink.innerHTML = `<p>ツイートURL: <a href="${props.tweetUrl}" target="_blank">${props.tweetUrl}</a></p>`;
                }
            } else {
                modalTweetEmbed.innerHTML = '<p style="text-align: center; color: #666;">公募ツイートのURLが提供されていません。</p>';
            }

            modal.style.display = 'block';
        }
    });

    calendar.render();

    // 常時公募枠を表示する関数 (変更なし)
    function renderAlwaysOpenRecruitment(recruitmentItems) {
        if (!alwaysOpenSection || !alwaysOpenList) return; 

        alwaysOpenList.innerHTML = ''; 

        if (recruitmentItems.length === 0) {
            alwaysOpenList.innerHTML = '<p style="text-align: center; color: #6c757d;">現在、常時公募枠はありません。</p>';
            alwaysOpenSection.style.display = 'block'; 
            return;
        }

        recruitmentItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('always-open-item'); 

            const categoryText = item.extendedProps.category ? `<span class="always-open-category category-${item.extendedProps.category.replace(/\s/g, '-')}" style="margin-right: 8px;">${item.extendedProps.category}</span>` : '';
            const circleNameText = item.title || item.extendedProps.circleName || '不明なサークル';
            const relatedInfoText = item.extendedProps.relatedInfo || ''; // そのまま表示

            itemDiv.innerHTML = `
                <h3 class="always-open-title">${categoryText}${circleNameText}</h3>
                <p>${relatedInfoText}</p>
                ${item.extendedProps.tweetUrl ? `<p class="always-open-tweet-link"><a href="${item.extendedProps.tweetUrl}" target="_blank">公募ツイートを見る</a></p>` : ''}
            `;
            alwaysOpenList.appendChild(itemDiv);

            // クリックでモーダル表示 (カレンダーイベントと同じロジックを再利用)
            itemDiv.addEventListener('click', () => {
                calendar.options.eventClick({
                    jsEvent: { preventDefault: () => {} }, 
                    event: {
                        id: item.id,
                        title: item.title,
                        start: item.start ? new Date(item.start) : null, 
                        end: item.end ? new Date(item.end) : null,
                        allDay: item.allDay,
                        extendedProps: item.extendedProps,
                    }
                });
            });
        });
        alwaysOpenSection.style.display = 'block'; 
    }

    // モーダルを閉じるロジック (変更なし)
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
