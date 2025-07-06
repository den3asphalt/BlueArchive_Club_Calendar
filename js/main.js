document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar'); // カレンダーを表示するDOM要素
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // 初期表示は月間表示
        locale: 'ja', // 日本語化
        headerToolbar: { // ヘッダーツールバーの設定
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: { // ボタンのテキストを日本語化
            today: '今日',
            month: '月',
            week: '週',
            day: '日'
        },
        eventTimeFormat: { // イベントの時間表示フォーマット（カレンダーグリッドでは非表示だが、モーダル用）
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // 24時間表示
        },
        slotLabelFormat: { // 週/日表示の時間のラベルフォーマット
            hour: 'numeric',
            minute: '2-digit',
            hour12: false // 24時間表示
        },
        allDayText: '終日', // 終日イベントのテキスト

        // Netlify Functionsからデータを取得
        events: '/.netlify/functions/get-calendar-events', 

        // ★★★ カレンダーグリッド上のイベント表示内容をカスタマイズ ★★★
        // サークル名のみを表示し、時間を表示しないようにする
        eventContent: function(arg) {
            // arg.event.title にはサークル名が入っている想定
            let arrayOfDomNodes = [ document.createElement('div') ];
            arrayOfDomNodes[0].innerHTML = `<strong>${arg.event.title}</strong>`;
            return { domNodes: arrayOfDomNodes };
        },

        // ★★★ イベントにカテゴリに応じたCSSクラスを追加 ★★★
        eventClassNames: function(arg) {
            const category = arg.event.extendedProps.category;
            // カテゴリ名を元にクラス名を生成（例: 'category-交流'）
            if (category) {
                return ['category-' + category.replace(/\s/g, '-')]; // スペースをハイフンに変換
            }
            return ['category-不明']; // カテゴリがない場合のデフォルトクラス
        },

        // ★★★ イベントがクリックされたときの処理（モーダル表示） ★★★
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // デフォルトのリンク遷移を防ぐ

            const event = info.event;
            const props = event.extendedProps;

            // モーダル要素を取得
            const modal = document.getElementById('eventModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalCircleName = document.getElementById('modalCircleName');
            const modalCategory = document.getElementById('modalCategory');
            const modalDuration = document.getElementById('modalDuration');
            const modalLocation = document.getElementById('modalLocation');
            const modalRelatedInfo = document.getElementById('modalRelatedInfo');
            const modalTweetEmbed = document.getElementById('modalTweetEmbed');
            const modalTweetLink = document.getElementById('modalTweetLink');
            
            // モーダルに情報を設定
            modalTitle.textContent = event.title; // サークル名がここに入る
            modalCircleName.textContent = props.circleName || '不明';
            modalCategory.textContent = props.category || '不明';
            modalRelatedInfo.textContent = props.relatedInfo || 'なし';

            // 期間の表示を整形
            let durationText = '';
            if (event.start && event.end && event.start.toDateString() !== event.end.toDateString()) {
                durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
            } else if (event.start) {
                 durationText = event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                 if (event.allDay) { // 終日イベントの場合
                     durationText = event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) + ' (終日)';
                 } else if (event.end) { // 同日内の時間範囲
                     durationText = `${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                     durationText = `${event.start.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} ${durationText}`;
                 }
            }
            modalDuration.textContent = durationText;
            // モーダルを表示
            modal.style.display = 'block';
        }
    });

    calendar.render(); // カレンダーを描画

    // ★★★ モーダルを閉じるロジック ★★★
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('.close-button');

    // 閉じるボタンがクリックされたとき
    closeButton.onclick = function() {
        modal.style.display = 'none';
        // モーダルを閉じる際に埋め込みツイートをクリア (再表示時の問題回避)
        document.getElementById('modalTweetEmbed').innerHTML = ''; 
    }

    // モーダルの背景がクリックされたとき
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            document.getElementById('modalTweetEmbed').innerHTML = '';
        }
    }
});
