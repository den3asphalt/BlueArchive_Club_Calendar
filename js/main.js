document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
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

        events: '/.netlify/functions/get-calendar-events',

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
            // const modalLocation = document.getElementById('modalLocation'); // ★削除
            const modalRelatedInfo = document.getElementById('modalRelatedInfo');
            const modalTweetEmbed = document.getElementById('modalTweetEmbed');
            const modalTweetLink = document.getElementById('modalTweetLink');
            
            // モーダル情報を設定
            modalTitle.textContent = event.title;
            modalCircleName.textContent = props.circleName || '不明';
            modalCategory.textContent = props.category || '不明';
            modalRelatedInfo.textContent = props.relatedInfo || 'なし';

            // 期間の表示を整形
            let durationText = '';
            if (event.start && event.end && event.start.toDateString() !== event.end.toDateString()) {
                durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
            } else if (event.start) {
                durationText = event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                if (event.allDay) {
                    durationText = event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) + ' (終日)';
                } else if (event.end) {
                    durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} ${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                }
            }
            modalDuration.textContent = durationText;

            // ツイート埋め込みの処理
            modalTweetEmbed.innerHTML = ''; // コンテナを完全にクリア
            modalTweetLink.innerHTML = '';  // リンク表示もクリア

            if (props.tweetUrl) {
                const tweetIdMatch = props.tweetUrl.match(/\/status\/(\d+)/);
                if (tweetIdMatch && window.twttr && window.twttr.widgets) {
                    // 読み込み中メッセージを一時的な子要素として追加
                    const loadingMessageElement = document.createElement('p');
                    loadingMessageElement.style.textAlign = 'center';
                    loadingMessageElement.textContent = 'Twitterコンテンツを読み込み中...';
                    modalTweetEmbed.appendChild(loadingMessageElement); 

                    window.twttr.widgets.createTweet(
                        tweetIdMatch[1], 
                        modalTweetEmbed, 
                        {
                            theme: 'light', 
                            conversation: 'none', 
                            cards: 'hidden', 
                            width: '450' 
                        }
                    ).then(function (el) {
                        // 読み込み中メッセージ要素を削除
                        if (loadingMessageElement && loadingMessageElement.parentNode) {
                            loadingMessageElement.remove(); 
                        }

                        if (!el) { // 埋め込み要素が返ってこなかった場合
                            modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">指定されたツイートは存在しないか、非公開です。<br>または、ブラウザの拡張機能（広告ブロッカー等）によってコンテンツがブロックされている可能性があります。</p>';
                        }
                    }).catch(function (error) {
                        // 埋め込みエラー発生時
                        if (loadingMessageElement && loadingMessageElement.parentNode) {
                            loadingMessageElement.remove();
                        }
                        console.error('Twitterコンテンツ埋め込みエラー:', error);
                        modalTweetEmbed.innerHTML = '<p style="color:red; text-align: center;">Twitterコンテンツの読み込み中にエラーが発生しました。<br>ネットワーク接続やブラウザの拡張機能をご確認ください。</p>';
                    });
                } else {
                    // widgets.jsがまだ読み込まれていないか、IDが抽出できない、またはURL形式が違う場合
                    modalTweetLink.innerHTML = `<p>ツイートURL: <a href="${props.tweetUrl}" target="_blank">${props.tweetUrl}</a></p>`;
                }
            } else {
                // tweetUrl が提供されていない場合
                modalTweetEmbed.innerHTML = '<p style="text-align: center; color: #666;">公募ツイートのURLが提供されていません。</p>';
            }

            // モーダルを表示
            modal.style.display = 'block';
        }
    });

    calendar.render();

    // モーダルを閉じるロジック
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
