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
    const DATOCMS_API_TOKEN = process.env.DATOCMS_READONLY_API_TOKEN;
    const DATOCMS_API_URL = 'https://graphql.datocms.com/';

    // GraphQLクエリに recruitmentType を追加
    const query = `
      query AllRecruitmentInfos {
        allRecruitmentInfos {
          id
          clubName
          startDateTime
          endDateTime
          category
          tweetUrl
          relatedInfo
          recruitmentType
        }
      }
    `;

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

    // ★★★ ここからが重要！データを「カレンダー用」と「常時公募枠用」に分離するロジック ★★★
    const calendarEvents = [];
    const alwaysOpenRecruitment = [];

    datoEvents.forEach(item => {
        // FullCalendar用の基本フォーマット
        const formattedItem = {
            id: item.id,
            title: item.clubName || "サークル名不明",
            start: item.startDateTime, // 日付がnullの場合、FullCalendarは無視するかエラー
            end: item.endDateTime,
            extendedProps: {
                circleName: item.clubName,
                category: item.category,
                tweetUrl: item.tweetUrl,
                relatedInfo: item.relatedInfo,
                recruitmentType: item.recruitmentType, // 新しいタイプもextendedPropsに含める
            }
        };

        if (item.recruitmentType === '常時公募') {
            // 常時公募枠のデータは、カレンダーには渡さず、別の配列に入れる
            alwaysOpenRecruitment.push(formattedItem);
        } else {
            // 期間公募（またはタイプ未設定）かつ、有効な開始日時があるもののみカレンダーに渡す
            if (item.startDateTime) { // startDateTimeがあるものだけをカレンダーイベントとして扱う
                calendarEvents.push(formattedItem);
            } else {
                // startDateTimeがない期間公募のデータはログに出すなどして対処
                console.warn(`Event ${item.id || item.clubName} has '期間公募' type but no startDateTime. It will not be shown on calendar.`);
            }
        }
    });

    // ★★★ ここが最終的なreturnの修正点！2つの配列を含むオブジェクトとしてレスポンスを返す ★★★
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://bluearchive-club-calendar.netlify.app',
      },
      body: JSON.stringify({
          calendarEvents: calendarEvents,
          alwaysOpenRecruitment: alwaysOpenRecruitment
      }),
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

// parseDescription関数は変更なし
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
