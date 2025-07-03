// netlify/functions/get-calendar-events.js

exports.handler = async function(event, context) {
  // GETリクエスト以外は許可しない
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET' }
    };
  }

  // ★★★ ここでAPIキーとカレンダーIDをNetlifyの環境変数から取得します ★★★
  // これらの変数は、Netlifyダッシュボードの環境設定であなたが設定するものです。
  const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY; 
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;     

  // Google Calendar APIへのリクエストURLを構築
  // 現在から今後1年間のイベントを取得する例を設定しています。
  const now = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(now.getFullYear() + 1); 

  const timeMin = now.toISOString();
  const timeMax = oneYearFromNow.toISOString();

  const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events?key=${GOOGLE_CALENDAR_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;


  try {
    const response = await fetch(apiUrl); // Node.js環境で利用可能なfetch APIを使用
    if (!response.ok) {
      // APIからの応答が正常でない場合、エラーをスロー
      throw new Error(`Google Calendar API error: ${response.statusText} (${response.status})`);
    }
    const data = await response.json(); // 応答をJSONとして解析

    // Google Calendar APIから取得したデータをFullCalendarが期待する形式に変換
    // FullCalendarは通常、'title', 'start', 'end' などのプロパティを持つオブジェクトの配列を期待します。
    const formattedEvents = data.items.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime || event.start.date, // 'dateTime' (特定時刻) か 'date' (終日) かで分岐
      end: event.end.dateTime || event.end.date,       // 同上
      description: event.description || '',             // 説明がなければ空文字列
      location: event.location || '',
      url: event.htmlLink, // Googleカレンダー上のイベントへのリンク（クリック時の遷移に利用可能）
      // 拡張プロパティ：イベントの説明欄からカスタムデータをパースして格納
      extendedProps: {
          parsedDescription: parseDescription(event.description || '') 
      }
    }));

    // 成功時の応答
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // ★重要：CORS設定。あなたのNetlifyサイトのURLに制限することを強く推奨します。
        // 例：'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app'
        // デバッグ中は一時的に '*' を使うこともできますが、本番環境では必ず具体的なURLに制限してください。
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app' // あなたのサイトのURLに合わせる
      },
      body: JSON.stringify(formattedEvents) // 変換したイベントデータをJSON文字列として返す
    };

  } catch (error) {
    // エラー発生時の応答
    console.error("Error fetching events from Google Calendar API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app' 
      }
    };
  }
};

// ヘルパー関数：イベントの説明欄からカスタムデータをパースするための例
// 例えば、Googleカレンダーのイベントの説明に、JSON形式で画像URLやツイートIDなどを埋め込んでいる場合
// 例: { "imageUrl": "https://example.com/image.jpg", "tweetId": "1234567890" }
function parseDescription(description) {
    try {
        // 説明全体からJSON形式の部分（波括弧で始まり波括弧で終わる部分）を正規表現で抽出
        // sフラグは.が改行にもマッチするようにします
        const jsonPartMatch = description.match(/\{[\s\S]*\}/s); 
        if (jsonPartMatch) {
            // 抽出した文字列をJSONとしてパース
            return JSON.parse(jsonPartMatch[0]);
        }
    } catch (e) {
        // JSONのパースに失敗した場合
        console.warn("Failed to parse description as JSON:", e);
    }
    // パースできなかった場合やJSONがない場合は空のオブジェクトを返す
    return {}; 
}
