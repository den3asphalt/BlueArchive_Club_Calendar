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

    // DatoCMSのデータをFullCalendarが期待する形式に変換
    const formattedEventsForFullCalendar = datoEvents.map(item => {
        const id = item.id; 

        return {
            id: id,
            // ★★★ ここも最終修正点！item.の後ろのプロパティ名を「キャメルケース」に修正します ★★★
            title: item.clubName || "サークル名不明", // キャメルケース
            start: item.startDateTime, // キャメルケース
            end: item.endDateTime,     // キャメルケース
            extendedProps: { // 詳細情報はextendedPropsに格納
                circleName: item.clubName, // キャメルケース
                category: item.category,
                tweetUrl: item.tweetUrl,
                relatedInfo: item.relatedInfo,
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
