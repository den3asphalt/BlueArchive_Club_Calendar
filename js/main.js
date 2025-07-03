document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar'); // カレンダーを表示するDOM要素
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // 初期表示は月間表示
        locale: 'ja', // 日本語化
        headerToolbar: { // ヘッダーツールバーの設定
            left: 'prev,next today', // 前月/次月、今日ボタン
            center: 'title', // カレンダーのタイトル（例：2025年7月）
            right: 'dayGridMonth,timeGridWeek,timeGridDay' // 表示形式切り替えボタン
        },
        buttonText: { // ボタンのテキストを日本語化
            today: '今日',
            month: '月',
            week: '週',
            day: '日'
        },
        eventTimeFormat: { // イベントの時間表示フォーマット
            hour: 'numeric',
            minute: '2-digit',
            meridiem: false // 午前/午後表示なし
        },
        slotLabelFormat: { // 週/日表示の時間のラベルフォーマット
            hour: 'numeric',
            minute: '2-digit',
            hour12: false // 24時間表示
        },
        allDayText: '終日', // 終日イベントのテキスト

        // ★★★ ここにNetlify Functions からイベントデータを取得するロジックを記述 ★★★
        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                // Netlify FunctionのURLは通常 `/.netlify/functions/ファイル名` です
                // 例：get-calendar-events.js というファイル名にした場合
                const response = await fetch('/.netlify/functions/get-calendar-events'); 
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Netlify Functionから返されたデータは、FullCalendarが期待するイベントオブジェクトの配列であることを想定
                // 必要であれば、ここでさらにデータを加工する
                successCallback(data); // 取得したイベントデータをFullCalendarに渡す

            } catch (error) {
                console.error("Error fetching events from Netlify Function:", error);
                failureCallback(error); // エラー発生時にFullCalendarに通知
            }
        },

        // イベントがクリックされたときの処理
        eventClick: function(info) {
            // 例：クリックされたイベントの情報をコンソールに表示
            console.log('イベントがクリックされました:', info.event.title);
            console.log('開始日時:', info.event.start);
            console.log('終了日時:', info.event.end);
            console.log('説明:', info.event.extendedProps.parsedDescription || info.event.description);
            console.log('場所:', info.event.location);
            console.log('リンク:', info.event.url);

            // ここにモーダルウィンドウを表示したり、詳細ページに遷移させたりするロジックを追加します
            // 例えば、alert()で簡単に表示してみる:
            // alert(`イベント: ${info.event.title}\n日時: ${info.event.start.toLocaleString()}\n場所: ${info.event.location || '未定'}`);
        },

        // その他のFullCalendarオプションはここに追加できます
        // eventDidMount: function(info) { ... } // イベントがDOMにマウントされた後の処理（例：ツイート埋め込み）
        // eventContent: function(info) { ... } // イベントの表示コンテンツをカスタマイズ
    });

    calendar.render(); // カレンダーを描画
});