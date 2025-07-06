// netlify/functions/get-calendar-events.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET' }
    };
  }

  try {
    // DatoCMSのAPIトークンを環境変数から取得
    const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;

    // DatoCMSのGraphQL APIエンドポイント
    const DATOCMS_API_URL = 'https://graphql.datocms.com/';

    // GraphQLクエリを定義
    // ここでDatoCMSから取得したいフィールドを指定します
const query = `
  query AllRecruitmentInfos {
    allRecruitmentInfos {
      id
      club_name
      start_date_time
      end_date_time
      category
      tweet_url
      related_info
    }
  }
`;

    console.log("DEBUG: GraphQL Query being sent:", query);

    // DatoCMS GraphQL APIへのリクエスト
    const response = await fetch(DATOCMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${DATOCMS_API_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`DatoCMS API error: ${response.status} ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(jsonResponse.errors)}`);
    }

    const datoEvents = jsonResponse.data.allRecruitmentInfos;

    // DatoCMSのデータをFullCalendarが期待する形式に変換
    const formattedEventsForFullCalendar = datoEvents.map(item => {
        // DatoCMSはIDを自動で提供するので、それを使用
        const id = item.id; 

        return {
            id: id,
            title: item.club_name || "サークル名不明", // サークル名をカレンダーのタイトルとして使用
            start: item.start_date_time, // DatoCMSからの日付時刻
            end: item.end_date_time,     // DatoCMSからの日付時刻
            extendedProps: { // 詳細情報はextendedPropsに格納
                clubName: item.club_name,
                category: item.category,
                tweetUrl: item.tweet_url,
                relatedInfo: item.related_info,
            }
        };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app', // あなたのサイトのURLに合わせる
      },
      body: JSON.stringify(formattedEventsForFullCalendar),
    };

  } catch (error) {
    console.error("Error fetching data from DatoCMS or processing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to load recruitment info." }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app',
      }
    };
  }
};

// parseDescription関数はもう不要ですが、エラーにならないように残しておきます。
// 記述が邪魔であれば削除しても構いません。
function parseDescription(description) {
    try {
        const jsonPartMatch = description.match(/\{[\s\S]*\}/s); 
        if (jsonPartMatch) {
            return JSON.parse(jsonPartMatch[0]);
        }
    } catch (e) {
        console.warn("Failed to parse description as JSON:", e);
    }
    return {}; 
}
